<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Http\Resources\AdminProductResource;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

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

        if ($perPage > 0) {
            $paginator = $query->paginate($perPage);
            return AdminProductResource::collection($paginator);
        }

        return AdminProductResource::collection($query->get());
    }

    public function store(Request $request)
    {
        /** @var User|null $user */
        $user = auth()->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (! (bool) ($user->is_admin ?? false)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'sku'         => 'nullable|string|max:100|unique:products,sku',
            'category_id' => 'nullable|integer|exists:categories,id',
            'price'       => 'required|numeric|min:0',
            'currency'    => 'nullable|string|max:10',
            'description' => 'nullable|string',
            'img'         => 'nullable',
            'weight'      => 'nullable|string|max:100',
            'dimensions'  => 'nullable|string|max:255',
            'colours'     => 'nullable|string|max:255',
            'material'    => 'nullable|string|max:255',
            'is_popular'  => 'nullable|boolean',
        ]);

        // Accept either uploaded file OR a path (images/..., storage/..., full URL)
        if ($request->hasFile('img') && $request->file('img')->isValid()) {
            try {
                $path = $request->file('img')->store('products', 'public');
                $data['img'] = $path;
            } catch (\Throwable $e) {
                Log::warning('Image store failed: ' . $e->getMessage());
            }
        } elseif (isset($data['img']) && is_string($data['img']) && trim($data['img']) === '') {
            unset($data['img']);
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
            'sku' => ['nullable','string','max:100', Rule::unique('products','sku')->ignore($product->id)],
            'category_id' => 'nullable|integer|exists:categories,id',
            'price' => 'sometimes|required|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'description' => 'nullable|string',
            'img' => 'nullable',
            'weight' => 'nullable|string|max:100',
            'dimensions' => 'nullable|string|max:255',
            'colours' => 'nullable|string|max:255',
            'material' => 'nullable|string|max:255',
            'is_popular' => 'nullable|boolean',
        ]);

        if ($request->hasFile('img') && $request->file('img')->isValid()) {
            // delete old if stored in storage
            if ($product->img && preg_match('#^(?:products/|storage/|/storage/)#', $product->img)) {
                $old = ltrim(preg_replace('#^/?storage/#', '', $product->img), '/');
                if (Storage::disk('public')->exists($old)) {
                    Storage::disk('public')->delete($old);
                }
            }
            try {
                $path = $request->file('img')->store('products', 'public');
                $data['img'] = $path;
            } catch (\Throwable $e) {
                Log::warning('Image store failed (update): ' . $e->getMessage());
            }
        } elseif (isset($data['img']) && is_string($data['img']) && trim($data['img']) === '') {
            unset($data['img']);
        }

        $product->update($data);

        return new AdminProductResource($product->load('category'));
    }

    public function destroy(Product $product)
    {
        $this->authorize('delete', $product);

        if ($product->img && preg_match('#^(?:products/|storage/|/storage/)#', $product->img)) {
            $old = ltrim(preg_replace('#^/?storage/#', '', $product->img), '/');
            if (Storage::disk('public')->exists($old)) {
                Storage::disk('public')->delete($old);
            }
        }

        $product->delete();

        return response()->noContent();
    }
}
