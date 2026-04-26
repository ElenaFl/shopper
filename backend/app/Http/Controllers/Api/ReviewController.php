<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Review;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ReviewResource;

/**
 * Class ReviewController
 *
 * API для отзывов о товарах.
 *
 * Поведение:
 * - index: вернуть список отзывов для товара (с авторами).
 * - store: создать отзыв (требует аутентификации), обновить агрегаты продукта (reviews_count, rating).
 * - destroy: удалить отзыв (требует авторизации: автор или админ), пересчитать агрегаты и popularity.
 *
 * Ответы:
 * - 200 OK, 201 Created, 400/401/403/422/500 при ошибках.
 */

class ReviewController extends Controller
{

    public function index(Product $product)
    {
        // получает отзывы, связанные с пользователем
        $reviews = $product->reviews()->with('user')->orderByDesc('created_at')->get();

        // возвращает формат { data: [...] } — совместим с фронтом, который использует json.data ?? json
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

        // обновляет агрегаты на модели продукта и сохраняем
        // выполняет запрос к БД, который считает количество записей в связанной таблице reviews для данного продукта, и присваивает это значение полю reviews_count модели Product (поле reviews_count  хранит агрегированное количество отзывов для быстрого доступа,избегая выполнения COUNT при каждом отображении)
        $product->reviews_count = $product->reviews()->count();
        // вычисляет среднее значение поля rating по всем отзывам продукта (SQL AVG), округляет результат до 2 знаков и присваивает полю rating модели Product.
        $product->rating = round($product->reviews()->avg('rating'), 2);
        //сохраняет изменения модели $product в БД
        $product->saveQuietly();


        // пересчитать popularity score
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

        // Пересчитать popularity score
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
