<?php namespace App\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Класс RouteServiceProvider настраивает маршрутизацию и лимиты запросов для приложения.
 */

class RouteServiceProvider extends ServiceProvider {

    // HOME = '/home' — константа домашнего пути.
    public const HOME = '/home';

    public function boot(): void
    {
        // настраивает правила ограничения частоты запросов (rate limiting) для приложения (в данном случае правило 'api'). Лимитатор с именем "api" разрешает максимум 60 запросов в минуту для каждого уникального идентификатора клиента.
        $this->configureRateLimiting();


        //это регистрирует маршруты приложения, группируя их и применяя нужные middleware/префиксы:
        $this->routes(function ()
        {
            Route::prefix('api')
                ->middleware('api')
                ->group(base_path('routes/api.php'));
            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    protected function configureRateLimiting(): void
    {
        // RateLimiter::for('api', function (Request $request) { ... }) создаёт правило с ключом "api".
        RateLimiter::for('api', function (Request $request) {
            // Limit::perMinute(60) создает ограничение: 60 запросов за минуту.  Каждый пользователь (по id) или каждый IP получает свою квоту в 60 запросов/мин.
            return Limit::perMinute(60)
            ->by($request->user()?->id ?: $request->ip());
        });
    }
}
