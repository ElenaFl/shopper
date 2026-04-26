<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\Review;
use App\Observers\ReviewObserver;

/**
 *
 * Class AppServiceProvider
 *
 * В методе boot регистрирует наблюдатель ReviewObserver для модели Review
 */


class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * регистрация наблюдателя ReviewObserver для модели Review
     */
    public function boot(): void
    {
        Review::observe(ReviewObserver::class);
    }
}
