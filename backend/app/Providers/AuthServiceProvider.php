<?php
namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use App\Models\Order;
use App\Policies\OrderPolicy;
use App\Models\Category;
use App\Policies\CategoryPolicy;

/**
 *  Class AuthServiceProvider
 *
 * Отвечает за регистрацию политик (Policies) и глобальные правила авторизации (Gates)
 */


class AuthServiceProvider extends ServiceProvider {

    // сопоставляются модели с их политиками
    protected $policies = [
        Order::class => OrderPolicy::class,
        Category::class => CategoryPolicy::class,
    ];

    // регистрирует перечисленные политики
    public function boot(): void {

        $this->registerPolicies();
    }
}
