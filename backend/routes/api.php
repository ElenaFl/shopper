<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;

Route::apiResource('categories', CategoryController::class)->only(['index','show']);
Route::apiResource('products', ProductController::class)->only(['index','show']);

Route::prefix('admin')->middleware(['web','auth:sanctum'])->group(function ()
{
    Route::apiResource('categories', AdminCategoryController::class);
    Route::apiResource('products', AdminProductController::class);
});








