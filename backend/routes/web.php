<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Здесь остаются веб‑маршруты, страницы и редиректы.
|
*/

Route::get('/', function () {
    return view('welcome');
});

// Маршрут для фронтенд-логина (возвращает 401 для AJAX/fetch запросов,
// иначе редиректит на фронтенд страницу аккаунта)
Route::get('/login', function (\Illuminate\Http\Request $request) {
    if ($request->expectsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest' || $request->is('api/*')) {
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    return redirect()->away('http://shopper.local:5173/account');
})->name('login');




