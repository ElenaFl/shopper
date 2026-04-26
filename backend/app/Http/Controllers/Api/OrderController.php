<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\CartItem;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Class OrderController
 *
 * API-контроллер для создания и просмотра заказов.
 *
 * Поведение:
 * - store: создаёт заказ с позициями в транзакции, очищает корзину пользователя после успешного создания.
 * - show: возвращает заказ по id (с items), проверяет право просмотра через policy.
 * - index: возвращает постраничный список заказов текущего пользователя.
 *
 * Ответы:
 * - 201 Created (при создании)
 * - 200 OK (при получении)
 * - 401/403/404/500 при ошибках
 */

class OrderController extends Controller
{
    public function store(Request $request)
    {
        // проверяется структура запроса: обязательно items (непустой массив), для каждого элемента требуются title, price, quantity и т.п.
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable',
            'items.*.title' => 'required|string',
            'items.*.sku' => 'nullable|string',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.quantity' => 'required|integer|min:1',
            'totals' => 'required|array',
            'billing' => 'required|array',
            'billing.email' => 'required|email',
            'payment' => 'nullable|array',
        ]);

        // генерируем id, number
        $id = $request->input('id') ?? 'order-' . now()->timestamp . '-' . Str::random(6);
        //mt_rand(0, 999999) — генерирует случайное целое число от 0 до 999999 (включительно). Используется mt_rand вместо rand потому что он быстрее и имеет лучшее распределение. str_pad(..., 6, '0', STR_PAD_LEFT) — приводит полученное число к длине 6 символов
        $number = 'ORD-' . str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // создадим заказ в транзакции и удалим корзину после успешного создания заказа
        $order = null;

        DB::beginTransaction();
        try {
            $order = Order::create([
                'id' => $id,
                'number' => $number,
                'user_id' => Auth::id(),
                'status' => 'pending',
                'totals' => $data['totals'],
                'billing' => $data['billing'],
                'payment' => $data['payment'] ?? null,
            ]);

            foreach ($data['items'] as $it) {
                $order->items()->create([
                    'product_id' => $it['product_id'] ?? null,
                    'title' => $it['title'],
                    'sku' => $it['sku'] ?? null,
                    'price' => $it['price'],
                    'quantity' => $it['quantity'],
                    'img' => $it['img'] ?? null,
                    'meta' => $it['meta'] ?? null,
                ]);
            }

            // всё успешно — коммитим. Завершается (фикcируется) текущая транзакция базы данных — то есть делаются все выполненные внутри транзакции изменения постоянными и видимыми для других соединений
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Order creation failed: ' . $e->getMessage());
            return response()->json(['message' => 'Order creation failed'], 500);
        }

        // после успешного создания заказа — очистим корзину пользователя на сервере
        try {
            if (Auth::id()) {
                CartItem::where('user_id', Auth::id())->delete();
            }
        } catch (\Throwable $e) {
            // логируем ошибки
            Log::warning('Failed to clear cart after order: ' . $e->getMessage());
        }

        // загрузка отношений
        $order->load('items');

        // возвращает созданный заказ с позициями и HTTP 201 Created
        return response()->json($order, 201);
    }

    public function show(Request $request, $id)
    {
        $order = Order::with('items')->find($id);
        if (! $order) {
            return response()->json(['message' => 'Not found'], 404);
        }

        // авторизация — используем policy
        if ($request->user()) {
            if ($request->user()->can('view', $order)) {
                return response()->json($order);
            }
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    // index для текущего пользователя
    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $orders = Order::where('user_id', $user->id)->with('items')->orderBy('created_at', 'desc')->paginate(20);
        return response()->json($orders);
    }
}
