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
});

// Blog routes (public read, auth required for posting/deleting comments)
Route::prefix('blog')->group(function () {
    Route::get('posts', [PostController::class, 'index']);
    Route::get('posts/{post}', [PostController::class, 'show']);
    Route::middleware('web')->group(function () {
    Route::post('posts/{post}/comments', [CommentController::class, 'store'])->middleware('auth:sanctum');
    });
    Route::delete('comments/{comment}', [CommentController::class, 'destroy'])->middleware('auth:sanctum');
});

// Auth and review routes (stateful) — run under web middleware so sessions/CSRF work
Route::middleware('web')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    // Reviews for products (stateful, auth:sanctum)
    Route::post('/products/{product}/reviews', [ReviewController::class, 'store'])->middleware('auth:sanctum');
});






