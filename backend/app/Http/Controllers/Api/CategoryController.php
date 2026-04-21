<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Http\Resources\CategoryResource;

class CategoryController extends Controller
{
    /**
     * Публичный список категорий, возвращает все категории, выбирая только id, title, slug, через ресурс CategoryResource
     */


    public function index()
    {
        $categories = Category::select('id', 'title', 'slug')->get();

        return CategoryResource::collection($categories);
    }

    /**
     * Публичное отображение одной категории, возвращает одну категорию через ресурс (оборачивает их в класс ресурса)
     */
    public function show(Category $category)
    {
        return new CategoryResource($category);
    }
}
