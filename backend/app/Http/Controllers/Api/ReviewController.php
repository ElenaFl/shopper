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

    public function index(Product $product)
    {
        // Получаем отзывы, при необходимости eager-load связанного пользователя
        $reviews = $product->reviews()->with('user')->orderByDesc('created_at')->get();

        // Возвращаем формат { data: [...] } — совместим с фронтом, который использует json.data ?? json
        return response()->json(['data' => $reviews]);
    }

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

    public function destroy(Product $product, Review $review) {

        // Проверка, что review действительно принадлежит продукту
        if ($review->product_id !== $product->id) {
            return response()->json([
                'message' => 'Review does not belong to the given product'
            ], 400);
        }

        // Авторизация: либо админ, либо автор отзыва
        $user = auth()->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Предполагаем, что у пользователя есть флаг is_admin
        if (! ($user->is_admin || $user->id === $review->user_id) ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Удаляем отзыв (будет soft delete при использовании SoftDeletes)
        $review->delete();

        // Пересчитать агрегаты
        $product->reviews_count = $product->reviews()->count();
        $product->rating = round($product->reviews()->avg('rating') ?? 0, 2);
        $product->saveQuietly();

        // Optionally recompute popularity
        if (method_exists($product, 'recomputePopularityScore')) {
            $product->recomputePopularityScore();
            $product->saveQuietly();
        }

        // Возвращаем актуальные данные (опционально)
        return response()->json([
            'message' => 'Deleted',
            'product' => new ProductResource($product->fresh(['reviews.user'])),
        ], 200);

    }
}
