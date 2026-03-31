<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\CommentController;


Route::apiResource('categories', CategoryController::class)->only(['index','show']);
Route::apiResource('products', ProductController::class)->only(['index','show']);

Route::prefix('admin')->middleware(['web','auth:sanctum'])->group(function ()
{
    Route::apiResource('categories', AdminCategoryController::class);
    Route::apiResource('products', AdminProductController::class);
});

Route::prefix('blog')->group(function () {
    Route::get('posts', [PostController::class, 'index']);
    Route::get('posts/{post}', [PostController::class, 'show']);
    Route::post('posts/{post}/comments', [CommentController::class, 'store'])->middleware('auth:sanctum');
});







