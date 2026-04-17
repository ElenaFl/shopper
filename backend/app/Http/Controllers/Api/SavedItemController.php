<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavedItem;
use Illuminate\Http\Request;

class SavedItemController extends Controller {
    // GET /api/user/saved-items
    public function index(Request $request) {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }
        // load saved items with product relation if exists
        $items = SavedItem::where('user_id', $user->id)
            ->with('product')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $items]);
    }

    // POST /api/user/saved-items
    public function store(Request $request) {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        $data = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'meta' => 'nullable|array',
        ]);
        // unique per user/product
        $saved = SavedItem::firstOrCreate( [
            'user_id' => $user->id,
            'product_id' => $data['product_id']
            ],
            [
                'meta' => $data['meta'] ?? null
            ]
        );

        $saved->load('product');

        return response()->json($saved, 201);
    }

    // DELETE /api/user/saved-items/{id}
    public function destroy(Request $request, $id) {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        $item = SavedItem::find($id);

        if (! $item) {
            return response()->json([
                'message' => 'Not found'
                ], 404);
        }
        if ($item->user_id !== $user->id) {
            return response()->json([
                'message' => 'Forbidden'
                ], 403);
        }

        $item->delete();

        return response()->json([
            'message' => 'Deleted'
        ]);
    }

    // POST /api/user/saved-items/sync
    // Body: { product_ids: [1,2,3] } - merge guest -> user (idempotent)

    public function sync(Request $request) {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        $data = $request->validate([
            'product_ids' => 'required|array',
            'product_ids.*' => 'integer|exists:products,id',
        ]);

        $created = [];
        foreach (array_unique($data['product_ids']) as $pid) {
            $saved = SavedItem::firstOrCreate( [
                'user_id' => $user->id,
                'product_id' => $pid
                ],
                ['meta' => null
                ]
            );

            $created[] = $saved;
        }

        $items = SavedItem::where('user_id', $user->id)
            ->with('product')
            ->get();

        return response()->json(['data' => $items]);
    }
}
