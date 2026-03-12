<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;

Route::get('/', function () { return view('welcome');});

// Маршруты использования файлов cookie CSRF обрабатывается пакетом Sanctum (GET /sanctum/csrf-cookie)
Route::post('/api/register', [AuthController::class, 'register']);
Route::post('/api/login', [AuthController::class, 'login']);

// GET‑маршрут /login. Внутри — анонимная функция (замыкание), которая принимает Request и возвращает либо JSON с 401(запрос не авторизован, потому что клиент не предоставил корректные учётные данные (аутентификация отсутствует или недействительна)), либо редирект на фронтенд.
//Если запрос ожидает JSON (API/AJAX/fetch) — возвращает 401 JSON { "message": "Unauthenticated." } (чтобы SPA/клиент понял, что нужна авторизация). Иначе (обычный браузерный переход) — редиректит на внешний фронтенд URL http://shopper.local:5173/account.

Route::get('/login', function (Request $request) {
    // Если это AJAX/Fetch/CORS запрос — вернёт 401 JSON, чтобы не было редиректа
    if ($request->expectsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest' || $request->is('api/*')) { return response()->json(['message' => 'Unauthenticated.'], 401); }

// Для обычного браузерного перехода — редиректит на фронтенд URL (away), чтобы не резолвить /account на backend
return redirect()->away('http://shopper.local:5173/account');
})->name('login');
