<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
        $incomingQty = isset($data['quantity']) ? (int)$data['quantity'] : 1;

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

        // Try to find existing item
        $item = CartItem::where('user_id', $user->id)
            ->where('product_id', $productId)
            ->first();

        if ($item) {
            // Increment quantity (do not overwrite)
            $newQuantity = max(0, (int)$item->quantity + $incomingQty);
            $item->quantity = $newQuantity;
            // Update metadata (unit_price/snapshot/title/sku) if needed
            $item->unit_price = $unitPrice;
            $item->snapshot = $snapshot;
            $item->title = $snapshot['title'] ?? $product->title ?? $item->title;
            $item->sku = $snapshot['sku'] ?? $product->sku ?? $item->sku;
            $item->save();
        } else {
            // create new
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

        // --- normalize/group incoming items by product_id to avoid duplicates ---
        $grouped = [];
        foreach ($incoming as $it) {
            $pid = isset($it['product_id']) ? (int)$it['product_id'] : null;
            if (!$pid) continue;
            $qty = isset($it['quantity']) ? (int)$it['quantity'] : 1;
            $unit_price = $it['unit_price'] ?? null;
            $snapshot = $it['snapshot'] ?? null;

            if (!isset($grouped[$pid])) {
                $grouped[$pid] = [
                    'product_id' => $pid,
                    'quantity' => $qty,
                    'unit_price' => $unit_price,
                    'snapshot' => $snapshot,
                ];
            } else {
                $grouped[$pid]['quantity'] += $qty;
                if ($grouped[$pid]['unit_price'] === null && $unit_price !== null) {
                    $grouped[$pid]['unit_price'] = $unit_price;
                }
                if (empty($grouped[$pid]['snapshot']) && !empty($snapshot)) {
                    $grouped[$pid]['snapshot'] = $snapshot;
                }
            }
        }
        $incoming = array_values($grouped);

        $productIds = array_values(array_unique(array_filter(array_map(function ($it) {
            return isset($it['product_id']) ? (int)$it['product_id'] : null;
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

                // Merge (sum) policy
                $existing = CartItem::where('user_id', $user->id)
                    ->where('product_id', $productId)
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    $existing->quantity = max(0, (int)$existing->quantity + (int)$quantity);
                    $existing->unit_price = $unitPrice;
                    $existing->snapshot = $snapshot;
                    $existing->title = $snapshot['title'] ?? $existing->title;
                    $existing->sku = $snapshot['sku'] ?? $existing->sku;
                    $existing->save();
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

