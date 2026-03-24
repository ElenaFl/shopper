<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use App\Http\Resources\ProductResource;

class ProductController extends Controller
{
    /**
     * List products with optional filters, sort and pagination.
     * Query params: per_page (default 24), page, category_id, search, sort (newest|price_asc|price_desc|popular)
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 24);
        $sort = $request->query('sort', 'newest');
        $categoryId = $request->query('category_id');
        $search = (string) $request->query('search', '');

        // Eloquent query, with category relation
        $query = Product::query()->with('category');

        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        if ($search !== '') {
            $s = trim(mb_substr($search, 0, 200));
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%");
            });
        }

        switch ($sort) {
            case 'popular':
                // сервер может сортировать по служебному полю, но не отдавать его в публичном ресурсе
                $query->orderByDesc('popularity_score')->orderByDesc('sales_count');
                break;
            case 'price_asc':
                $query->orderBy('price', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('price', 'desc');
                break;
            case 'newest':
            default:
                $query->orderByDesc('created_at');
                break;
        }

        if ($perPage > 0) {
            $paginator = $query->paginate($perPage);
            return ProductResource::collection($paginator);
        }

        return ProductResource::collection($query->get());
    }

    /**
     * Show single product (route model binding).
     * Route must be /products/{product} and method signature Product $product
     */
    public function show(Product $product)
    {
        // load category relation if not already loaded
        $product->loadMissing('category');

        return new ProductResource($product);
    }
}
