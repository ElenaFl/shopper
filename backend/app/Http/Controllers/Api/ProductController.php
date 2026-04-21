<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Discount;
use Illuminate\Http\Request;
use App\Http\Resources\ProductResource;
use Illuminate\Support\Facades\DB;


/**
* Список товаров с дополнительными фильтрами, сортировкой и разбивкой по страницам.
* Параметры запроса: per_page (по умолчанию 24), страница, идентификатор категории_id, поиск, сортировка (новые|price_asc|price_desc|популярные)
*/

class ProductController extends Controller
{
    /**
     * Принимает HTTP‑запрос Laravel (автоматически инъецируется - превращается а объект Request $request). Здесь читаются query‑параметры и строится ответ с продуктами.
     */
    public function index(Request $request)
    {
        // чтение параметров запроса
        // сколько элементов возвращать на страницу(по умолчанию 24)
        $perPage = (int) $request->query('per_page');
        // сортировать по умолчанию - до дате - вначале новые
        $sort = $request->query('sort', 'newest');
        $categoryId = $request->query('category_id');
        $search = (string) $request->query('search', '');
        // фиксация текущего времени
        $now = now();

        // создается объект продукта сразу с категорией
        $query = Product::query()->with('category');

        //при создании объекта продукта сразу подгружаются скидки(действующие в настоящее время)
        //$dq — это билдер для relation use ($now) делает доступной переменную $now внутри
        $query->with(['discounts' => function ($dq) use ($now) {
            $dq->where('active', true)
                //условие: подгружать только те скидки, у которых поле active = true (только активные скидки)
                ->where(function ($sq) use ($now) {
                    $sq->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
                })
                //проверяет, что скидка ещё не закончилась
                ->where(function ($sq) use ($now) {
                    $sq->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
                })
                // сортирует подгружаемые скидки по убыванию id (обычно чтобы при наличии нескольких скидок взять самую новую первой)
                ->orderByDesc('id');
        }]);

        // если задан параметр category_id, добавляем в запрос условие WHERE category_id = :categoryId. Фильтрация по категории
        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        //Если параметр search не пустой: ограничиваем длину поисковой строки до 200 символов и убираем пробелы по краям. Добавляем вложенное условие, которое ищет совпадение по title или description через SQL LIKE с шаблоном %s% (подстрока). Вложенный where группирует оба условия вместе
        if ($search !== '') {
            $s = trim(mb_substr($search, 0, 200));
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                    ->orWhere('description', 'like', "%{$s}%");
            });
        }

        // если в запросе передан непустой price_min: приводим его к float и добавляем условие price >= min. Фильтр по минимальной цене
        if ($request->filled('price_min')) {
            $min = (float) $request->query('price_min');
            $query->where('price', '>=', $min);
        }

        if ($request->filled('price_max')) {
            $max = (float) $request->query('price_max');
            $query->where('price', '<=', $max);
        }

        //Если флаг on_sale истинный (приводится к boolean): добавляем условие WHERE EXISTS (подзапрос): ищется хотя бы одна запись в таблице discounts, где: нормализованные sku (LOWER(TRIM(...))) совпадают между discounts и products, скидка помечена active = true, текущая дата $now находится в интервале (starts_at <= now или starts_at IS NULL) и (ends_at >= now или ends_at IS NULL)
        if ($request->boolean('on_sale')) {
            $query->whereExists(function ($q) use ($now) {
                $q->select(DB::raw(1))
                    ->from('discounts')
                    ->whereRaw('LOWER(TRIM(discounts.sku)) = LOWER(TRIM(products.sku))')
                    ->where('discounts.active', true)
                    ->where(function ($sq) use ($now) {
                        $sq->whereNull('discounts.starts_at')
                            ->orWhere('discounts.starts_at', '<=', $now);
                    })->where(function ($sq) use ($now) {
                        $sq->whereNull('discounts.ends_at')
                            ->orWhere('discounts.ends_at', '>=', $now);
                    });
            });
        }

        // Применяем сортировку в зависимости от значения $sort:'popular' — сначала по popularity_score (убывание), затем по sales_count.'price_asc' / 'price_desc' — по цене.'newest' (или любое другое значение по умолчанию) — по created_at, новые сверху.
        switch ($sort) {
            case 'popular':
                $query->orderByDesc('popularity_score')->orderByDesc('sales_count');
                break;
            case 'price_asc':
                $query->orderBy('price', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('price', 'desc');
                break;
            case 'newest':
            default:
                $query->orderByDesc('created_at');
                break;
        }

        // выполняем запрос: если per_page > 0 — используем пагинацию paginate($perPage) (вернёт LengthAwarePaginator с метадатой). Иначе — получаем всю коллекцию результатов через get().
        if ($perPage > 0) {
            $items = $query->paginate($perPage);
        } else {
            $items = $query->get();
        }

        // готовим коллекцию моделей, с которой будем работать далее: если $items — пагинатор, извлекаем модели текущей страницы через $items->items() и оборачиваем их в коллекцию.Иначе (если $items — уже Collection), используем её напрямую.
        $productItems = $items instanceof \Illuminate\Pagination\LengthAwarePaginator ? collect($items->items()) : $items;

        // Собираем массив нормализованных SKU: pluck('sku') — беру поле sku у каждой модели. filter() — убираем пустые/null. map(...) — приводим каждый sku к string, trim и lowercase (нормализация). unique() — оставляем только уникальные значения. values()->all() — переиндексируем и получаем plain array для использования в запросе

        $skus = $productItems
            ->pluck('sku')
            ->filter()
            ->map(function ($s) {
                return mb_strtolower(trim((string) $s));
            })
            ->unique()
            ->values()
            ->all();

        if (!empty($skus)) {
            // загружаем активные скидки, соответствующие нормализованным артикулам SKUs
            $discounts = Discount::query()
                ->where('active', true)
                ->where(function ($q) use ($now) {
                    $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
                })
                ->where(function ($q) use ($now) {
                    $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
                })
                ->whereIn(DB::raw('LOWER(TRIM(sku))'), $skus)
                ->orderByDesc('id')
                ->get()
                ->groupBy(function ($d) {
                    return mb_strtolower(trim((string) $d->sku));
                });

            // привязываем скидки к товарам по нормализованному артикулу, чтобы ProductResource рассматривал их как отношение "скидки"
            foreach ($productItems as $product) {
                $key = mb_strtolower(trim((string) $product->sku));
                $matched = $discounts->get($key) ?? collect();
                if (! $matched instanceof \Illuminate\Support\Collection) {
                    $matched = collect($matched);
                }
                $product->setRelation('discounts', $matched);
            }
        } else {
            foreach ($productItems as $product) {
                $product->setRelation('discounts', collect());
            }
        }

        return ProductResource::collection($items);
    }


   public function show(Product $product)
    {
        // атомарно увеличим поле views
        $product->increment('views');

        // загрузим нужные отношения и вернем ресурс
        $product->load(['reviews.user', 'category', 'activeDiscount']);
        return new ProductResource($product);
    }

}
