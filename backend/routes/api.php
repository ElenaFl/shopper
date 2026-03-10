<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\AuthController;
// use App\Http\Controllers\Api\CartController;
// use App\Http\Controllers\Api\OrderController;
// use App\Http\Controllers\Api\CommentController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Публичные и защищённые маршруты для SPA API (Sanctum cookie-based).
| RouteServiceProvider автоматически добавляет префикс "api".
|
*/

// Публичные маршруты (доступны без аутентификации)
Route::middleware('api')->group(function () {
    // Categories
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{id}', [CategoryController::class, 'show']);

    // Products
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{id}', [ProductController::class, 'show']);

    // Auth: регистрация и логин (используйте Sanctum CSRF cookie на клиенте)
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// Защищённые маршруты: наследуют 'api' и требуют 'auth:sanctum'
Route::middleware(['api', 'auth:sanctum'])->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::get('/me', [AuthController::class, 'me']);

    // Cart (пример контроллера: CartController)
    // Методы: index (GET) - получить элементы корзины, store (POST) - добавить товар,
    // update (PUT/PATCH) - изменить количество, destroy (DELETE) - удалить товар,
    // save (POST) - сохранить/закончить работу с сохранённой корзиной (опционально).
    // Route::get('/cart', [CartController::class, 'index']);
    // Route::post('/cart', [CartController::class, 'store']);
    // Route::patch('/cart/{id}', [CartController::class, 'update']);
    // Route::delete('/cart/{id}', [CartController::class, 'destroy']);
    // Опционально: маршрут для сохранения корзины в профиль
    // Route::post('/cart/save', [CartController::class, 'save']);

    // Orders (OrderController)
    // Методы: index (GET) - список заказов пользователя, store (POST) - оформить заказ,
    // show (GET) - показать заказ, cancel (POST) - отмена заказа и т.п.
    // Route::get('/orders', [OrderController::class, 'index']);
    // Route::post('/orders', [OrderController::class, 'store']);
    // Route::get('/orders/{id}', [OrderController::class, 'show']);
    // Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel']);

    // Comments (CommentController) — полиморфные комментарии для products и posts
    // Пример payload: { "commentable_type": "product", "commentable_id": 123, "body": "..." }
    // Route::post('/comments', [CommentController::class, 'store']);
    // Route::patch('/comments/{id}', [CommentController::class, 'update']);
    // Route::delete('/comments/{id}', [CommentController::class, 'destroy']);

    // Дополнительно: управление избранным, отзывы, адреса доставки и т.д.
});
