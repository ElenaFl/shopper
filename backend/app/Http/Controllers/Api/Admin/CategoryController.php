<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use App\Http\Resources\AdminCategoryResource;

/**
 * CategoryController - отвечает за CRUD операции с категориями в административной части приложения (создание, просмотр списка, редактирование, удаление)
 */

class CategoryController extends Controller
{

    // Требует аутентификацию через Sanctum для всех методов контроллера — доступ к админским операциям только для авторизованных пользователей.
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    // получает все категории вместе с подсчётом связанных товаров
    public function index()
    {
        $categories = Category::withCount('products')->get();

        // возвращает коллекцию AdminCategoryResource
        return AdminCategoryResource::collection($categories);
    }


    //
    public function store(Request $request)
    {
        // проверяет право создания с помощью $this->authorize('create', Category::class) (Policy)
        $this->authorize('create', Category::class);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'slug'  => 'nullable|string|max:255|unique:categories,slug',
        ]);

        // если slug не передан — генерирует уникальный slug через Category::generateUniqueSlug()
        if (empty($data['slug'])) {
            $data['slug'] = Category::generateUniqueSlug($data['title']);
        }

        // создаёт категорию и возвращает ресурс с HTTP 201 Created
        $category = Category::create($data);

        return (new AdminCategoryResource($category))->response()->setStatusCode(201);
    }

    // возвращает AdminCategoryResource для одной категории, предварительно загрузив relation products ($category->load('products'))
    public function show(Category $category)
    {
        return new AdminCategoryResource($category->load('products'));
    }

    // обновляет модель и возвращает ресурс
    public function update(Request $request, Category $category)
    {
        $this->authorize('update', $category);

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'slug'  => 'nullable|string|max:255|unique:categories,slug,' . $category->id,
        ]);

        if (array_key_exists('title', $data) && empty($data['slug'])) {
            $data['slug'] = Category::generateUniqueSlug($data['title'], $category->id);
        }

        $category->update($data);

        return new AdminCategoryResource($category);
    }

    // удаление контролируется политикой доступа;
    public function destroy(Category $category)
    {
        $this->authorize('delete', $category);

        $category->delete();

        return response()->noContent();
    }
}
