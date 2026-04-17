<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

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
