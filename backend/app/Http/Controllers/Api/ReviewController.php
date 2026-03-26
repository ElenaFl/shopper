<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Review;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ReviewResource;

class ReviewController extends Controller
{
    public function store(Request $request, Product $product)
    {
        $data = $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:2000',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $review = Review::create([
            'product_id' => $product->id,
            'user_id'    => $user->id,
            'rating'     => (int) $data['rating'],
            'comment'    => $data['comment'] ?? null,
        ]);

        // Обновляем агрегаты на модели продукта и сохраняем
        $product->reviews_count = $product->reviews()->count();
        $product->rating = round($product->reviews()->avg('rating'), 2);
        $product->saveQuietly();


        // Пересчитать popularity score, если есть
        if (method_exists($product, 'recomputePopularityScore')) {
            $product->recomputePopularityScore();
        }

        // Загружаем свежие данные вместе с отзывами и их авторами
        $product = $product->fresh(['reviews.user']);

        return response()->json([
            'product' => new ProductResource($product),
            'review'  => new ReviewResource($review),
        ], 201);
    }
}
