<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;
use Illuminate\Auth\AuthenticationException;
use Symfony\Component\Routing\Exception\RouteNotFoundException;

class Handler extends ExceptionHandler
{
    /**
     * Types of exceptions that are not reported.
     *
     * @var array<int, class-string<\Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * Inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        // RouteNotFoundException — если попытка редиректа произошла для API-запроса,
        // вернём JSON 401 вместо 500/HTML
        $this->renderable(function (RouteNotFoundException $e, $request) {
            if ($this->isApiRequest($request)) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            return null;
        });

        // Альтернатива: дополнительные renderable для других исключений можно добавить здесь.
    }

    /**
     * Customize reporting (delegates to parent by default).
     */
    public function report(Throwable $exception)
    {
        parent::report($exception);
    }

    /**
     * Render an exception into an HTTP response (delegates to parent).
     */
    public function render($request, Throwable $exception)
    {
        return parent::render($request, $exception);
    }

    /**
     * Override unauthenticated to ensure API requests always receive JSON 401.
     */
    protected function unauthenticated($request, AuthenticationException $exception)
    {
        if ($this->isApiRequest($request)) {
            return response()->json(['message' => $exception->getMessage() ?: 'Unauthenticated.'], 401);
        }

        return redirect()->guest(route('login'));
    }

    /**
     * Helper: определяет, является ли запрос API/AJAX и должен ли возвращаться JSON.
     */
    protected function isApiRequest($request): bool
    {
        // Обычные проверки: expectsJson, wantsJson, Accept header или маршрут api/*
        if ($request->expectsJson() || $request->wantsJson()) {
            return true;
        }

        $accept = (string) $request->header('Accept', '');
        if (str_contains($accept, 'application/json') || str_contains($accept, 'application/vnd.api+json')) {
            return true;
        }

        // Маршруты, начинающиеся с /api
        if ($request->is('api/*')) {
            return true;
        }

        return false;
    }
}
