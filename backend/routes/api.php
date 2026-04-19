<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\Admin\ReviewAdminController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ChatWidgetController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\SavedItemController;
use App\Http\Controllers\Api\CartController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Здесь располагаются API маршруты. Аутентификационные маршруты
| (login/register/logout/user) зарегистрированы внутри web middleware
| для корректной работы cookie‑based Sanctum (stateful).
|
*/

// Public resources
Route::apiResource('categories', CategoryController::class)->only(['index','show']);
Route::apiResource('products', ProductController::class)->only(['index','show']);

// Admin API (web + auth:sanctum)
Route::prefix('admin')->middleware(['web','auth:sanctum'])->group(function () {
    Route::apiResource('categories', AdminCategoryController::class);
    Route::apiResource('products', AdminProductController::class);
    Route::get('reviews', [ReviewAdminController::class, 'index']);
});

// Blog routes (public read, auth required for posting/deleting comments)
Route::prefix('blog')->group(function () {
    Route::get('posts', [PostController::class, 'index']);
    Route::get('posts/{post}', [PostController::class, 'show']);

    Route::middleware('web')->group(function () {
    Route::get('posts/{post}/comments', [CommentController::class, 'index'])->middleware('auth:sanctum');
    Route::post('posts/{post}/comments', [CommentController::class, 'store'])->middleware('auth:sanctum');
    Route::delete('comments/{comment}', [CommentController::class, 'destroy'])->middleware('auth:sanctum');
    });
});

// Auth and review routes (stateful) — run under web middleware so sessions/CSRF work
Route::middleware('web')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    // Reviews for products (stateful, auth:sanctum)
    Route::post('/products/{product}/reviews', [ReviewController::class, 'store'])->middleware('auth:sanctum');
    Route::get('/products/{product}/reviews', [ReviewController::class, 'index'])->middleware('auth:sanctum');
    Route::get('reviews', [ReviewAdminController::class, 'index'])->middleware('auth:sanctum');
    Route::delete('/products/{product}/reviews/{review}',   [ReviewController::class, 'destroy'])->middleware('auth:sanctum');
    // Route::middleware('auth:sanctum')->group(function () {
        Route::post('/orders', [OrderController::class, 'store'])->middleware('auth:sanctum');
        Route::get('/orders', [OrderController::class, 'index'])->middleware('auth:sanctum');
        Route::get('/orders/{id}', [OrderController::class, 'show'])->middleware('auth:sanctum');
    // });

    Route::get('/user/saved-items', [SavedItemController::class, 'index'])->middleware('auth:sanctum');
    Route::post('/user/saved-items', [SavedItemController::class, 'store'])->middleware('auth:sanctum');
    Route::delete('/user/saved-items/{id}', [SavedItemController::class, 'destroy'])->middleware('auth:sanctum');
    Route::post('/user/saved-items/sync', [SavedItemController::class, 'sync'])->middleware('auth:sanctum');

    Route::get('/user/cart', [CartController::class, 'index'])->middleware('auth:sanctum');
    Route::post('/user/cart', [CartController::class, 'store'])->middleware('auth:sanctum');
    Route::put('/user/cart/{id}', [CartController::class, 'update'])->middleware('auth:sanctum');
    Route::delete('/user/cart/{id}', [CartController::class, 'destroy'])->middleware('auth:sanctum');
    Route::post('/user/cart/sync', [CartController::class, 'sync'])->middleware('auth:sanctum');

});


Route::middleware(['web','auth:sanctum'])->group(function () {
    Route::post('/chat/sessions', [ChatController::class, 'createSession'])->middleware('auth:sanctum');
    Route::post('/chat/send', [ChatController::class, 'send'])->middleware('auth:sanctum');
    Route::get('/chat/sessions/{id}', [ChatController::class, 'session'])->middleware('auth:sanctum');
});

Route::middleware(['web','auth:sanctum', 'throttle:30,1'])->group(function () {
    Route::get('/chat/widget-state', [ChatWidgetController::class, 'getState'])->middleware('auth:sanctum');
    Route::post('/chat/widget-state', [ChatWidgetController::class, 'setState'])->middleware('auth:sanctum');
});






