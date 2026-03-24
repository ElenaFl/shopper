<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Здесь располагаются маршруты, которые используют web middleware group
| (сессии, cookies, CSRF). Мы размещаем в web.php маршруты аутентификации,
| чтобы они работали в stateful режиме (cookie-based) с Laravel Sanctum.
|
*/

Route::get('/', function () {
    return view('welcome');
});

// Маршрут для фронтенд-логина (возвращает 401 для AJAX/fetch запросов,
// иначе редиректит на фронтенд страницу аккаунта)
Route::get('/login', function (Request $request) {
    if ($request->expectsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest' || $request->is('api/*')) {
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    return redirect()->away('http://shopper.local:5173/account');
})->name('login');

/*
|--------------------------------------------------------------------------
| Auth (stateful) routes
|--------------------------------------------------------------------------
|
| Размещаем регистрационные и login/logout/user маршруты здесь под префиксом /api,
| чтобы веб middleware (StartSession, ShareErrorsFromSession и т.д.) применялись к ним,
| и Auth::logout() корректно работал.
|
*/


Route::prefix('api')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
});

