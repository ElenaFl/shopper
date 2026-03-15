<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Здесь находятся публичные API маршруты (без сессий), например для категорий
| и товаров. Эти маршруты загружаются RouteServiceProvider в группу 'api'
| и предназначены для stateless взаимодействия.
|
*/

Route::middleware('api')->group(function () {
    // Categories (public)
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{id}', [CategoryController::class, 'show']);

    // Products (public)
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{id}', [ProductController::class, 'show']);

    // Public debug route to inspect Sanctum stateful config
    Route::get('/debug-stateful', function (Request $request) {
        Log::info('stateful config: ' . json_encode(config('sanctum.stateful')));
        return response()->json(config('sanctum.stateful'));
    });
});



