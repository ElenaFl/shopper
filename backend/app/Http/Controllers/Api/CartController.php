<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $items = CartItem::where('user_id', $user->id)
            ->orderBy('created_at')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'product_id' => ['required', 'integer'],
            'quantity' => ['sometimes', 'integer', 'min:1'],
            'unit_price' => ['sometimes', 'numeric'],
            'snapshot' => ['sometimes', 'array'],
        ]);

        $productId = (int) $data['product_id'];
        $quantity = $data['quantity'] ?? 1;

        $incomingSnapshot = $data['snapshot'] ?? null;
        $snapshot = $this->normalizeSnapshot($incomingSnapshot);

        $unitPrice = $data['unit_price']
            ?? Arr::get($snapshot, 'price_after')
            ?? Arr::get($snapshot, 'price')
            ?? $this->productPrice($productId)
            ?? 0;

        $product = Product::find($productId);
        if ($product) {
            $snapshot = $this->enrichSnapshotFromProduct($snapshot, $product, $unitPrice);
        }

        $item = CartItem::updateOrCreate(
            ['user_id' => $user->id, 'product_id' => $productId],
            [
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'snapshot' => $snapshot,
                'title' => $snapshot['title'] ?? $product->title ?? null,
                'sku' => $snapshot['sku'] ?? $product->sku ?? null,
            ]
        );

        return response()->json(['data' => $item], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();

        $item = CartItem::where('user_id', $user->id)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'quantity' => ['sometimes', 'integer', 'min:0'],
            'unit_price' => ['sometimes', 'numeric'],
            'snapshot' => ['sometimes', 'array'],
        ]);

        if (array_key_exists('quantity', $data) && (int) $data['quantity'] <= 0) {
            $item->delete();
            return response()->json(null, 204);
        }

        if (array_key_exists('snapshot', $data)) {
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

        $item->fill($data);
        $item->save();

        return response()->json(['data' => $item]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $item = CartItem::where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if ($item) {
            $item->delete();
        }

        return response()->json(null, 204);
    }

    public function sync(Request $request)
    {
        $user = $request->user();

        $payload = $request->validate([
            'items' => ['sometimes', 'array'],
            'items.*.product_id' => ['required_with:items', 'integer'],
            'items.*.quantity' => ['sometimes', 'integer', 'min:1'],
            'items.*.unit_price' => ['sometimes', 'numeric'],
            'items.*.snapshot' => ['sometimes', 'array'],
        ]);

        $incoming = $payload['items'] ?? [];

        if (empty($incoming)) {
            $items = CartItem::where('user_id', $user->id)
                ->orderBy('created_at')
                ->get();

            return response()->json(['data' => $items]);
        }

        $productIds = array_values(array_unique(array_filter(array_map(function ($it) {
            return isset($it['product_id']) ? (int) $it['product_id'] : null;
        }, $incoming))));

        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

        DB::transaction(function () use ($incoming, $user, $products) {
            foreach ($incoming as $it) {
                $productId = isset($it['product_id']) ? (int) $it['product_id'] : null;
                if (!$productId) continue;

                $quantity = $it['quantity'] ?? 1;
                $incomingSnapshot = $it['snapshot'] ?? null;
                $snapshot = $this->normalizeSnapshot($incomingSnapshot);

                $product = $products->get($productId);
                $unitPrice = $it['unit_price']
                    ?? Arr::get($snapshot, 'price_after')
                    ?? Arr::get($snapshot, 'price')
                    ?? ($product->price ?? 0);

                if ($product) {
                    $snapshot = $this->enrichSnapshotFromProduct($snapshot, $product, $unitPrice);
                }

                CartItem::updateOrCreate(
                    ['user_id' => $user->id, 'product_id' => $productId],
                    [
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'snapshot' => $snapshot,
                        'title' => $snapshot['title'] ?? ($product->title ?? null),
                        'sku' => $snapshot['sku'] ?? ($product->sku ?? null),
                    ]
                );
            }
        });

        $items = CartItem::where('user_id', $user->id)
            ->orderBy('created_at')
            ->get();

        return response()->json(['data' => $items]);
    }

    protected function normalizeSnapshot($incoming)
    {
        if ($incoming === null) return [];
        if (is_array($incoming)) return $incoming;
        if (is_string($incoming)) {
            $decoded = json_decode($incoming, true);
            if (is_array($decoded)) return $decoded;
            return ['note' => $incoming];
        }
        return (array) $incoming;
    }

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

    protected function productPrice($productId)
    {
        $p = Product::find($productId);
        return $p ? $p->price : null;
    }
}

