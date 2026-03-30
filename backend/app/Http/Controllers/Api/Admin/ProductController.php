<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Http\Resources\AdminProductResource;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 24);
        $query = Product::query()->with('category');

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

    public function store(Request $request)
    {
        $this->authorize('create', Product::class);

        // Валидация: img теперь может быть файлом (image) или строкой, поэтому принимаем оба варианта
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'sku'         => 'nullable|string|max:100|unique:products,sku',
            'category_id' => 'nullable|integer|exists:categories,id',
            'price'       => 'required|numeric|min:0',
            'currency'    => 'nullable|string|max:10',
            'description' => 'nullable|string',
            // img может быть либо файл (image), либо строка (url/path)
            'img'         => 'nullable',
            'weight'      => 'nullable|string|max:100',
            'dimensions'  => 'nullable|string|max:255',
            'colours'     => 'nullable|string|max:255',
            'material'    => 'nullable|string|max:255',
            'sales_count'      => 'nullable|integer|min:0',
            'popularity_score' => 'nullable|numeric|min:0',
            'is_popular'       => 'nullable|boolean',
        ]);

        // Обработка загруженного файла (если есть)
        if ($request->hasFile('img') && $request->file('img')->isValid()) {
            // Сохраняем файл на диске 'public' в папке 'products'
            $path = $request->file('img')->store('products', 'public'); // вернёт путь вида products/xxxxx.jpg
            // По соглашению используем доступный путь через /storage/
            $data['img'] = '/storage/' . $path;
        } else {
            // Если пришла строка (например URL) — оставляем как есть.
            // Если в $data['img'] пусто — ничего не делаем.
            if (isset($data['img']) && is_string($data['img']) && trim($data['img']) === '') {
                unset($data['img']);
            }
        }

        $product = Product::create($data);

        return (new AdminProductResource($product->load('category')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Product $product)
    {
        $product->loadMissing('category');
        return new AdminProductResource($product);
    }

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
            'img' => 'nullable',
            'weight' => 'nullable|string|max:100',
            'dimensions' => 'nullable|string|max:255',
            'colours' => 'nullable|string|max:255',
            'material' => 'nullable|string|max:255',
            'sales_count'      => 'nullable|integer|min:0',
            'popularity_score' => 'nullable|numeric|min:0',
            'is_popular'       => 'nullable|boolean',
        ]);

        if ($request->hasFile('img') && $request->file('img')->isValid()) {
            // удалить старый файл при необходимости
            if ($product->img && str_starts_with($product->img, '/storage/')) {
                $oldPath = substr($product->img, strlen('/storage/'));
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }
            $path = $request->file('img')->store('products', 'public');
            $data['img'] = '/storage/' . $path;
        } else {
            if (isset($data['img']) && is_string($data['img']) && trim($data['img']) === '') {
                unset($data['img']);
            }
        }

        $product->update($data);

        return new AdminProductResource($product->load('category'));
    }

    public function destroy(Product $product)
    {
        $this->authorize('delete', $product);

        // при удалении можно удалить файл изображения
        if ($product->img && str_starts_with($product->img, '/storage/')) {
            $oldPath = substr($product->img, strlen('/storage/'));
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $product->delete();

        return response()->noContent();
    }
}
