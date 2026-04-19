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

class OrderController extends Controller
{
    public function store(Request $request)
    {
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
        $number = 'ORD-' . str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // Создадим заказ в транзакции и удалим корзину после успешного создания заказа
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

            // Всё успешно — коммитим
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Order creation failed: ' . $e->getMessage());
            return response()->json(['message' => 'Order creation failed'], 500);
        }

        // После успешного создания заказа — очистим корзину пользователя на сервере.
        try {
            if (Auth::id()) {
                CartItem::where('user_id', Auth::id())->delete();
            }
        } catch (\Throwable $e) {
            // Не критично для успешного оформления заказа — только логируем
            Log::warning('Failed to clear cart after order: ' . $e->getMessage());
        }

        $order->load('items');

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

    // опционально: index для текущего пользователя
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
