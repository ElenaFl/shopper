<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

/**
 * Class CartController
 *
 * API-контроллер для управления корзиной пользователя (CartItem).
 *
 * Поведение:
 * - Работает с корзиной текущего аутентифицированного пользователя (Request->user()).
 * - Поддерживает операции: index, store, update, destroy, sync.
 * - Хранит snapshot (meta) товара на момент добавления для истории/воссоздания состояния.
 *
 * Формат ответов:
 * - Возвращает JSON с полем data для ресурсов.
 * - Статусы: 200 OK, 201 Created, 204 No Content, 422 Validation, 404 Not Found.
 */

class CartController extends Controller
{

    //возвращает все CartItem для текущего пользователя, упорядоченные по created_at.
    public function index(Request $request)
    {
        $user = $request->user();

        $items = CartItem::where('user_id', $user->id)
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'data' => $items
        ]);
    }

    //добавление/обновление записи о товаре(удобно при множественных добавлениях одного товара со страницы товара)
    //валидирует вход, нормализует snapshot, вычисляет unit_price (из payload → snapshot → product), либо обновляет существующую позицию (увеличивает quantity), либо создаёт новую.
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'product_id' => ['required', 'integer'],
            //'sometimes' - правило применяется, если поле есть в запросе
            'quantity' => ['sometimes', 'integer', 'min:1'],
            'unit_price' => ['sometimes', 'numeric'],
            //снимок на момент добпвления товара(чтобы помнить первоначальную цену...)
            'snapshot' => ['sometimes', 'array'],
        ]);

        $productId = (int) $data['product_id'];

        $incomingQty = isset($data['quantity']) ? (int)$data['quantity'] : 1;

        $incomingSnapshot = $data['snapshot'] ?? null;

        $snapshot = $this->normalizeSnapshot($incomingSnapshot);

        // если в запросе явно пришла цена (unit_price), то она берётся первой
        $unitPrice = $data['unit_price']
            //если в snapshot есть поле price_after (например цена со скидкой), используется эта цена
            ?? Arr::get($snapshot, 'price_after')
            ?? Arr::get($snapshot, 'price')
            //если snapshot не содержит цены, пытаются получить текущую цену товара из базы (метод productPrice делает Product::find и возвращает ->price).
            ?? $this->productPrice($productId)
            ?? 0;

        //поиск модели товара по id в базе (Eloquent)
        // попытка получить объект Product, чтобы при наличии товара дополнить snapshot актуальными полями (title, img, sku и т.д.) или для других вычислений
        $product = Product::find($productId);
        if ($product) {
            //дополняет/заполняет поля snapshot значениями из модели Product, если в snapshot эти поля отсутствуют
            $snapshot = $this->enrichSnapshotFromProduct($snapshot, $product, $unitPrice);
        }

        // ищем запись корзины для текущего пользователя и конкретного товара. first() возвращает модель или null
        $item = CartItem::where('user_id', $user->id)
            ->where('product_id', $productId)
            ->first();

        // если запись найдена — обновляем её (merge/увеличение количества)
        if ($item) {
            // складываем старое и новое количество, приводя к int. max(0, ...) гарантирует, что не получим отрицательное значение.
            $newQuantity = max(0, (int)$item->quantity + $incomingQty);
            //устанавливаем новое количество
            $item->quantity = $newQuantity;
            // обновляем цену единицы (если пришла новая или рассчитана по логике)
            $item->unit_price = $unitPrice;
            // обновляем snapshot (снимок товара) — сохраняем актуальную/обновлённую мета‑информацию
            $item->snapshot = $snapshot;
            // если snapshot содержит title — используем его; иначе берем title из Product (если есть); иначе оставляем старое
            $item->title = $snapshot['title'] ?? $product->title ?? $item->title;
            $item->sku = $snapshot['sku'] ?? $product->sku ?? $item->sku;
            // сохраняем изменения в БД
            $item->save();
        } else {
            // если запись не найдена — создаём новую
            $item = CartItem::create([
                'user_id' => $user->id,
                'product_id' => $productId,
                'quantity' => $incomingQty,
                'unit_price' => $unitPrice,
                'snapshot' => $snapshot,
                'title' => $snapshot['title'] ?? ($product->title ?? null),
                'sku' => $snapshot['sku'] ?? ($product->sku ?? null),
            ]);
        }
        // возвращаем созданный или обновлённый объект (после save/create) с кодом 201 Created
        return response()->json([
            'data' => $item
        ], 201);
    }

    //обновляет существующую позицию корзины (по id и user), поддерживает частичное обновление полей (quantity, unit_price, snapshot). Пользователь в корзине изменил поле «количество» для позиции с id=42 на 1 → update установит quantity=1 (и если поставил 0 — удалит)
    public function update(Request $request, $id)
    {
        // берём текущего аутентифицированного пользователя
        $user = $request->user();

        // ищем позицию корзины, принадлежащую этому пользователю, по id
        $item = CartItem::where('user_id', $user->id)
            ->where('id', $id)
            // firstOrFail() бросит 404 если не найдено
            ->firstOrFail();

        // валидация входных данных
        $data = $request->validate([
            'quantity' => ['sometimes', 'integer', 'min:0'],
            'unit_price' => ['sometimes', 'numeric'],
            'snapshot' => ['sometimes', 'array'],
        ]);

        // удаление при нулевом/отрицательном количестве
        if (array_key_exists('quantity', $data) && (int) $data['quantity'] <= 0) {
            $item->delete();
            return response()->json(null, 204);
        }

        // обработка snapshot (если передан)
        if (array_key_exists('snapshot', $data)) {
            // normalizeSnapshot превращает JSON/string/array в array
            $snapshot = $this->normalizeSnapshot($data['snapshot']);
            $product = Product::find($item->product_id);
            $unitPrice = $data['unit_price'] ?? Arr::get($snapshot, 'price') ?? $product->price ?? $item->unit_price;
            if ($product) {
                $snapshot = $this->enrichSnapshotFromProduct($snapshot, $product, $unitPrice);
            }
            $data['snapshot'] = $snapshot;
            if (empty($data['title'])) {
                $data['title'] = $snapshot['title'] ?? $item->title;
            }
            if (empty($data['sku'])) {
                $data['sku'] = $snapshot['sku'] ?? $item->sku;
            }
        }

        // массовое заполнение полями из $data
        $item->fill($data);

        $item->save();

        return response()->json(['data' => $item]);
    }

    // удаление товара из корзины
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        $item = CartItem::where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if ($item) {
            $item->delete();
        }

        // возвращает HTTP 204 No Content (операция успешна, контента нет)
        return response()->json(null, 204);
    }

    // синхронизация корзины (используется при переходе с неавторизованного состояния, когда фронтенд хочет «синхронизировать» локальную корзину с серверной). Метод принимает массив items от клиента, нормализует и группирует их по product_id (чтобы убрать дубликаты), подгружает продукты, затем в транзакции создаёт или обновляет записи корзины (merge — суммирует количество), возвращает актуальную корзину
    public function sync(Request $request)
    {
        $user = $request->user();

        $payload = $request->validate([
            // проверяет, что items — массив
            'items' => ['sometimes', 'array'],
            //и что для каждого items.* задан product_id (integer) при наличии items
            'items.*.product_id' => ['required_with:items', 'integer'],
            'items.*.quantity' => ['sometimes', 'integer', 'min:1'],
            'items.*.unit_price' => ['sometimes', 'numeric'],
            'items.*.snapshot' => ['sometimes', 'array'],
        ]);

        // если пусто, просто возвращается список текущих CartItem пользователя — удобно для запроса состояния
        $incoming = $payload['items'] ?? [];

        if (empty($incoming)) {
            $items = CartItem::where('user_id', $user->id)
                ->orderBy('created_at')
                ->get();

            return response()->json(['data' => $items]);
        }

        //  если клиент прислал несколько позиций с одинаковым product_id (например пользователь добавлял товар несколько раз на устройстве), объединить их до одной записи с суммой quantity

        // инициализируем временный массив для группировки incoming items по product_id
        $grouped = [];
        // перебираем все элементы, пришедшие от клиента
        foreach ($incoming as $it) {
            // берём product_id и приводим к int; если нет — null
            $pid = isset($it['product_id']) ? (int)$it['product_id'] : null;
            // пропускаем элемент без корректного product_id
            if (!$pid) continue;
            // количество: если передано — взять, иначе по умолчанию 1
            $qty = isset($it['quantity']) ? (int)$it['quantity'] : 1;
            // входная цена единицы товара, если указана
            $unit_price = $it['unit_price'] ?? null;
            // входной snapshot (meta) товара, если есть
            $snapshot = $it['snapshot'] ?? null;
            // если для этого product_id ещё нет записи в группировке — создаём новую
            if (!isset($grouped[$pid])) {
                $grouped[$pid] = [
                    'product_id' => $pid,
                    'quantity' => $qty,
                    'unit_price' => $unit_price,
                    'snapshot' => $snapshot,
                ];
            //иначе — уже была запись для этого product_id, объединяем данные
            } else {
                // суммируем количество (merge policy)
                $grouped[$pid]['quantity'] += $qty;
                // если ещё не установлена единичная цена и поступила новая — установить её (первое непустое unit_price сохраняется)
                if ($grouped[$pid]['unit_price'] === null && $unit_price !== null) {
                    $grouped[$pid]['unit_price'] = $unit_price;
                }
                // если ещё нет snapshot и пришёл непустой — сохранить его (первый непустой snapshot берём)
                if (empty($grouped[$pid]['snapshot']) && !empty($snapshot)) {
                    $grouped[$pid]['snapshot'] = $snapshot;
                }
            }
        }
        //получаем сгруппированный список (переиндексация массива)
        $incoming = array_values($grouped);
        // собираем уникальные product_id из сгруппированного списка (массив ids для запроса)
        $productIds = array_values(array_unique(array_filter(array_map(function ($it) {
            return isset($it['product_id']) ? (int)$it['product_id'] : null;
        }, $incoming))));
        // делает один запрос в БД и получает коллекцию Product для всех нужных id; keyBy('id') — превращает коллекцию в ассоциативный набор, где ключ — id товара, а значение — объект Product. То есть $products->get(123) вернёт Product с id 123.
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

        // генерация хеша для входного payload(входные данные) и защита от повторной обработки
        // создаём стабильный хэш SHA-256 для входного массива $incoming
        // формируем ключ кеша по user_id + payloadHash и пытаемся добавить его в кеш на 15 с.
        $payloadHash = hash('sha256', json_encode($incoming, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        //  ключ для предотвращения дублей
        $cacheKey = "cart_sync:{$user->id}:{$payloadHash}";
        // - Cache::add возвращает false, если такой ключ уже существует (т.е. почти идентичный sync уже обрабатывается или был только что обработан). В таком случае возвращаем текущую корзину без повторной обработки, чтобы избежать дублирования quantity и лишней нагрузки на БД. Причины и поведение: простая и эффективная защита от повторных/параллельных одинаковых sync-запросов (например, повторный POST при перезагрузке, retry или параллельные вызовы). TTL 15 с покрывает короткое окно, в котором клиент обычно будет повторять запрос
        if (!Cache::add($cacheKey, true, 15)) {
            $items = CartItem::where('user_id', $user->id)->orderBy('created_at')->get();

            return response()->json(['data' => $items, 'message' => 'Duplicate sync ignored'], 200);
        }
        // транзакция
        DB::transaction(function () use ($incoming, $user, $products) {
            //перебираем сгруппированные элементы внутри транзакции
            foreach ($incoming as $it) {
                //берём productId;
                $productId = isset($it['product_id']) ? (int) $it['product_id'] : null;
                //если нет — пропускаем
                if (!$productId) continue;
                // количество для текущего элемента
                $quantity = $it['quantity'] ?? 1;

                $incomingSnapshot = $it['snapshot'] ?? null;
                // нормализуем snapshot (массив/JSON/string → array)
                $snapshot = $this->normalizeSnapshot($incomingSnapshot);
                //берём предварительно подгруженный Product по id (или null)
                $product = $products->get($productId);
                //вычисляем unitPrice по приоритету: входной → snapshot.price_after → snapshot.price → product.price → 0
                $unitPrice = $it['unit_price']
                    ?? Arr::get($snapshot, 'price_after')
                    ?? Arr::get($snapshot, 'price')
                    ?? ($product->price ?? 0);

                //если продукт найден — дополняем snapshot актуальными полями из продукта
                if ($product) {
                    $snapshot = $this->enrichSnapshotFromProduct($snapshot, $product, $unitPrice);
                }

                // ищем существующую позицию для пользователя + product_id и ставим блокировку (FOR UPDATE) — защищаем от конкурентных записей
                $existing = CartItem::where('user_id', $user->id)
                    ->where('product_id', $productId)
                    ->lockForUpdate()
                    ->first();

                //если позиция уже есть — обновляем
                if ($existing) {
                    // суммируем количество, минимум 0
                    $existing->quantity = max(0, (int)$existing->quantity + (int)$quantity);
                    $existing->unit_price = $unitPrice;
                    $existing->snapshot = $snapshot;
                    $existing->title = $snapshot['title'] ?? $existing->title;
                    $existing->sku = $snapshot['sku'] ?? $existing->sku;
                    $existing->save();
                    // если позиции нет — создаём новую запись корзины
                } else {
                    CartItem::create([
                        'user_id' => $user->id,
                        'product_id' => $productId,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'snapshot' => $snapshot,
                        'title' => $snapshot['title'] ?? ($product->title ?? null),
                        'sku' => $snapshot['sku'] ?? ($product->sku ?? null),
                    ]);
                }
            }
        });

        //после транзакции загружаем актуальную корзину пользователя
        $items = CartItem::where('user_id', $user->id)
            ->orderBy('created_at')
            ->get();


        return response()->json(['data' => $items]);
    }


    // метод принимает входные данные snapshot (возможно null, array, строка JSON или что‑то ещё) и возвращает нормализованный массив
    protected function normalizeSnapshot($incoming)
    {
        // если snapshot не передан (null) — возвращаем пустой массив. Удобно, чтобы дальше не проверять на null
        if ($incoming === null) return [];
        // если уже получили массив — возвращаем как есть (ничего не делаем)
        if (is_array($incoming)) return $incoming;
        // если пришла строка
        if (is_string($incoming)) {
            // пытаемся декодировать JSON (json_decode(..., true) даст массив при корректном JSON)
            $decoded = json_decode($incoming, true);
            // если декодирование вернуло массив — возвращаем этот массив (это обычный случай, когда frontend прислал snapshot как JSON‑строку)
            if (is_array($decoded)) return $decoded;
            // если декодирование не дало массив (строка была не JSON или другое) — возвращаем массив с ключом note, в котором хранится исходная строка. Это позволяет сохранить информацию, даже если формат неожиданный
            return ['note' => $incoming];
        }
        return (array) $incoming;
    }


    // Метод принимает массив snapshot (возможно неполный), объект Product и опциональную цену unitPrice. Возвращает дополненный snapshot
    protected function enrichSnapshotFromProduct(array $snapshot, Product $product, $unitPrice = null)
    {
        $title = $product->title ?? null;
        $img = $product->img ?? null;
        $price = $product->price ?? null;
        $sku = $product->sku ?? null;

        if (empty($snapshot['title'])) $snapshot['title'] = $title;
        if (empty($snapshot['img'])) $snapshot['img'] = $img;
        if (empty($snapshot['price'])) $snapshot['price'] = $price ?? $unitPrice;
        if (empty($snapshot['sku'])) $snapshot['sku'] = $sku;

        return $snapshot;
    }

    //вспомогательный метод для получения текущей цены товара из базы в одном месте. Используется как fallback при вычислении unit_price, если цена не передана в запросе и нет её в snapshot
    protected function productPrice($productId)
    {
        $p = Product::find($productId);
        return $p ? $p->price : null;
    }
}





