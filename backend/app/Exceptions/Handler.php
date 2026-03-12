<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;
use Illuminate\Auth\AuthenticationException;
use Symfony\Component\Routing\Exception\RouteNotFoundException;

/**
* class Handler - расширяет стандартный ExceptionHandler Laravel. Он отвечает за:
* логирование (report) исключений;
* преобразование исключений в HTTP-ответы (render);
* регистрацию кастомных колбэков renderable/reportable.
*/

class Handler extends ExceptionHandler
{
    /**
     * поле содержит список типов исключений, которые не нужно логировать. Сейчас пусто — все исключения будут логироваться стандартным логгеромd.
     *
     * @var array<int, class-string<\Throwable>>
     */

    //
    protected $dontReport = [
        //
    ];

    /**
     * Список полей, которые не будут попадать в «flash» (в сессию) при валидационных исключениях — защищает от утечки паролей в сессии/логах при редиректах после валидации
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
        // Для стандартного AuthenticationException — если запрос ожидает JSON или это API — вернуть 401 JSON
        $this->renderable(function (AuthenticationException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*') || $request->ajax()) {
                return response()->json(['message' => $e->getMessage() ?: 'Unauthenticated.'], 401);
            }

            // Для обычных web-запросов вернём null, чтобы стандартное поведение (редирект) сработало
            return null;
        });

        // На всякий случай перехватываем RouteNotFoundException, чтобы API не получали 500 при попытке редиректа
        $this->renderable(function (RouteNotFoundException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*') || $request->ajax()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            return null;
        });
    }

    public function report(Throwable $exception)
    {
        parent::report($exception);
    }

    public function render($request, Throwable $exception)
    {
        return parent::render($request, $exception);
    }
}
