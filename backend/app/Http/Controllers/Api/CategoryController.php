<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Http\Resources\CategoryResource;

class CategoryController extends Controller
{
    /**
     * Публичный список категорий.
     */
    public function index()
    {
        $categories = Category::select('id', 'title', 'slug')->get();
        return CategoryResource::collection($categories);
    }

    /**
     * Публичное отображение одной категории.
     */
    public function show(Category $category)
    {
        return new CategoryResource($category);
    }
}
