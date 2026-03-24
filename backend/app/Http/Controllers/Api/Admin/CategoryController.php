<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use App\Http\Resources\AdminCategoryResource;

class CategoryController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index()
    {
        // админская версия: возможно с дополнительными полями/фильтрацией
        $categories = Category::withCount('products')->get();
        return AdminCategoryResource::collection($categories);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Category::class);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'slug'  => 'nullable|string|max:255|unique:categories,slug',
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = Category::generateUniqueSlug($data['title']);
        }

        $category = Category::create($data);

        return (new AdminCategoryResource($category))->response()->setStatusCode(201);
    }

    public function show(Category $category)
    {
        return new AdminCategoryResource($category->load('products'));
    }

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

    public function destroy(Category $category)
    {
        $this->authorize('delete', $category);

        $category->delete();

        return response()->noContent();
    }
}
