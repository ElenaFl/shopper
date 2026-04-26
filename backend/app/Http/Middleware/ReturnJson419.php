<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ReturnJson419
{
    public function handle(Request $request, Closure $next)
    {
        // лог для отладки — можно удалить после проверки
        Log::debug('ReturnJson419 invoked', [
            'path' => $request->path(),
            'accept' => $request->header('Accept'),
            'wantsJson' => $request->wantsJson(),
        ]);

        // Условие: если путь корень — вернуть JSON.
        // (убираем проверку заголовка Accept, чтобы всегда вернуть JSON на "/")
        if ($request->getPathInfo() === '/' || $request->path() === '/') {
            return response()->json(['message' => 'Session expired'], 419);
        }

        return $next($request);
    }
}
