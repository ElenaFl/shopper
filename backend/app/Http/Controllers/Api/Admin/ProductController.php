<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Http\Resources\AdminProductResource;

class ProductController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Админский список продуктов — можно добавить фильтры/пагинацию.
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 24);
        $query = Product::query()->with('category');

        // Простейшие фильтры (category_id, search)
        if ($categoryId = $request->query('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($search = (string) $request->query('search', '')) {
            $s = trim(mb_substr($search, 0, 200));
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%");
            });
        }

        // Сортировка: по популярности по умолчанию для админа
        $sort = $request->query('sort', 'popular');
        switch ($sort) {
            case 'price_asc':
                $query->orderBy('price', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('price', 'desc');
                break;
            case 'newest':
                $query->orderByDesc('created_at');
                break;
            case 'popular':
            default:
                $query->orderByDesc('popularity_score')->orderByDesc('sales_count');
                break;
        }

        if ($perPage > 0) {
            $paginator = $query->paginate($perPage);
            return AdminProductResource::collection($paginator);
        }

        return AdminProductResource::collection($query->get());
    }

    /**
     * Создать продукт (админ).
     */
    public function store(Request $request)
    {
        $this->authorize('create', Product::class);

        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'sku'         => 'nullable|string|max:100|unique:products,sku',
            'category_id' => 'nullable|integer|exists:categories,id',
            'price'       => 'required|numeric|min:0',
            'currency'    => 'nullable|string|max:10',
            'description' => 'nullable|string',
            'img'         => 'nullable|string|max:255',
            'weight'      => 'nullable|string|max:100',
            'dimensions'  => 'nullable|string|max:255',
            'colours'     => 'nullable|string|max:255',
            'material'    => 'nullable|string|max:255',
            // служебные поля админа (только если нужно позволить устанавливать при создании)
            'sales_count'      => 'nullable|integer|min:0',
            'popularity_score' => 'nullable|numeric|min:0',
            'is_popular'       => 'nullable|boolean',
        ]);

        $product = Product::create($data);

        return (new AdminProductResource($product->load('category')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Показать продукт (админ) — с служебными полями.
     */
    public function show(Product $product)
    {
        $product->loadMissing('category');
        return new AdminProductResource($product);
    }

    /**
     * Обновить продукт (админ).
     */
    public function update(Request $request, Product $product)
    {
        $this->authorize('update', $product);

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'sku' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('products', 'sku')->ignore($product->id),
            ],
            'category_id' => 'nullable|integer|exists:categories,id',
            'price' => 'sometimes|required|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'description' => 'nullable|string',
            'img' => 'nullable|string|max:255',
            'weight' => 'nullable|string|max:100',
            'dimensions' => 'nullable|string|max:255',
            'colours' => 'nullable|string|max:255',
            'material' => 'nullable|string|max:255',
            // служебные поля админа
            'sales_count'      => 'nullable|integer|min:0',
            'popularity_score' => 'nullable|numeric|min:0',
            'is_popular'       => 'nullable|boolean',
        ]);

        $product->update($data);

        return new AdminProductResource($product->load('category'));
    }

    /**
     * Удалить продукт (админ).
     */
    public function destroy(Product $product)
    {
        $this->authorize('delete', $product);

        $product->delete();

        return response()->noContent(); // 204
    }
}
