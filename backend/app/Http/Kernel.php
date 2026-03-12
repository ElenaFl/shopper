<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Foundation\Http\Middleware\ValidatePostSize;
use Illuminate\Foundation\Http\Middleware\TrimStrings;
use Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Routing\Middleware\ThrottleRequests;

class Kernel extends HttpKernel
{
    /**
    * управляет middleware приложения:
    * protected $middleware — глобальные middleware, выполняемые для каждого HTTP-запроса.
    * protected $middlewareGroups — группы middleware (обычно 'web' и 'api'), которые применяются к маршрутам через группу.
    * protected $routeMiddleware — отдельные middleware, которые можно назначать по имени на маршруты/контроллеры.
    * Т.е. задаёт набор middleware — фильтров, которые выполняются при каждом HTTP‑запросе или для групп маршрутов. Они обеспечивают безопасность и поведение приложения: обработку прокси, сессий и cookie, защиту от CSRF, ограничение частоты запросов (throttle) и поддержку Sanctum для SPA (cookie‑аутентификация).
     */
    protected $middleware = [
        // обрабатывает заголовки прокси (X-Forwarded-For, X-Forwarded-Proto) и позволяет корректно определять IP и scheme, когда приложение за обратным прокси (nginx, load balancer)
        TrustProxies::class,
        // блокирует запросы, когда приложение в режиме обслуживания (php artisan down)
        \Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance::class,
        // проверяет размер тела POST-запроса и возвращает ошибку, если превышен limit
        ValidatePostSize::class,
        // обрезает пробелы у строковых полей входящих данных
        TrimStrings::class,
        // преобразует пустые строки в null —  при сохранении в БД
        ConvertEmptyStringsToNull::class,
    ];

    /**
     * Middleware группы
     *
     * @var array
     */
    protected $middlewareGroups = [
        'web' => [
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            ShareErrorsFromSession::class,
            VerifyCsrfToken::class,
            SubstituteBindings::class,
        ],

        'api' => [
            // Keep EnsureFrontendRequestsAreStateful for Sanctum session authentication
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            'throttle:api',
            SubstituteBindings::class,
        ],
    ];

    /**
     * Route middleware (protected $routeMiddleware)
     *
     * @var array
     */
    protected $routeMiddleware = [
        'auth' => \Illuminate\Auth\Middleware\Authenticate::class,
        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can' => \Illuminate\Auth\Middleware\Authorize::class,
        'guest' => \Illuminate\Auth\Middleware\RedirectIfAuthenticated::class,
        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
        'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle' => ThrottleRequests::class,
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
    ];
}
