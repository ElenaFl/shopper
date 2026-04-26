<?php

namespace App\Observers;

use App\Models\Review;
use App\Models\Product;

/**
 *
 * Class ReviewObserver
 *
 * Наблюдатель  поддерживает счётчик отзывов у товаров:
 * - created: при создании отзыва инкрементирует reviews_count у соответствующего Product.
 *  deleted: при удалении отзыва декрементирует reviews_count (только если > 0).
 *  updated: если поменялся product_id, убавляет счётчик у старого товара (если был) и прибавляет у нового.
 * Цель — поддерживать целостный denormalized reviews_count без загрузки моделей.
 */

class ReviewObserver
{
    public function created(Review $review): void
    {
        Product::where('id', $review->product_id)->increment('reviews_count');
    }

    public function deleted(Review $review): void
    {
        Product::where('id', $review->product_id)
            ->where('reviews_count', '>', 0)
            ->decrement('reviews_count');
    }

    public function updated(Review $review): void
    {
        if ($review->wasChanged('product_id')) {
            $original = $review->getOriginal('product_id');
            $new = $review->product_id;

            if ($original) {
                Product::where('id', $original)
                    ->where('reviews_count', '>', 0)
                    ->decrement('reviews_count');
            }

            if ($new) {
                Product::where('id', $new)->increment('reviews_count');
            }
        }
    }
}
