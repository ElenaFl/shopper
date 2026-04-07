<?php

namespace App\Observers;

use App\Models\Review;
use App\Models\Product;

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
