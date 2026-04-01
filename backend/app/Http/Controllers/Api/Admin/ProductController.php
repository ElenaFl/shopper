<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Http\Resources\AdminProductResource;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Intervention\Image\Facades\Image;

class ProductController extends Controller
{
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
        /** @param \Illuminate\Http\Request $request */
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
            $file = $request->file('img');
            $original = preg_replace('/[^A-Za-z0-9-_.]/', '', $file->getClientOriginalName());
            $name = time() . '-' . $original;
            $destination = public_path('images');
            if (! is_dir($destination)) {
                @mkdir($destination, 0755, true);
            }
            try {
                $file->move($destination, $name);
                $data['img'] = 'images/' . $name;
            } catch (\Throwable $e) {
                Log::warning('Image move failed: ' . $e->getMessage());
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
        /** @var \App\Models\User|null $user */
        $user = auth()->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        if (! (bool) ($user->is_admin ?? false)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

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

        // Handle uploaded image (if any)
        if ($request->hasFile('img') && $request->file('img')->isValid()) {
            // 1) Delete previous image if it resided in public/images
            if ($product->img && preg_match('#^(?:images/|/images/)#',  $product->img)) {
            $oldPath = public_path(ltrim($product->img, '/'));
            try {
                if (file_exists($oldPath)) {
                    @unlink($oldPath);
                }
            } catch (\Throwable $e) {
                // do not fail update if deletion fails
                Log::warning('Failed to unlink old image: ' . $e->getMessage());
            }
        }
        // 2) If previous image was stored using storage disk (products/... or storage/...), delete from storage disk
        elseif ($product->img && preg_match('#^(?:products/|storage/|/storage/)#', $product->img)) {
            $old = ltrim(preg_replace('#^/?storage/#', '', $product->img), '/');
            try {
                if (Storage::disk('public')->exists($old)) {
                    Storage::disk('public')->delete($old);
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to delete old storage image: ' . $e->getMessage());
            }
        }

        // 3) Move uploaded file into public/images with a safe unique name
        $file = $request->file('img');
        $original = preg_replace('/[^A-Za-z0-9\-_\.]/', '', $file->getClientOriginalName());
        $name = time() . '-' . $original;
        $destination = public_path('images');
        if (! is_dir($destination)) {
            @mkdir($destination, 0755, true);
        }

        try {
            $file->move($destination, $name);
            $data['img'] = 'images/' . $name;

            // Optional: generate thumbnail here if you use Intervention Image
            $thumbName = 'thumb-' . $name;
            Image::make(public_path('images/' . $name))
                ->fit(300, 300)
                ->save(public_path('images/' . $thumbName));
                $data['img_thumb'] = 'images/' . $thumbName;
        } catch (\Throwable $e) {
            Log::warning('Image move failed (update): ' . $e->getMessage());
            // do not abort update because of image move failure; remove img from $data so it won't overwrite
            if (isset($data['img'])) {
                unset($data['img']);
            }
        }
    } elseif (isset($data['img']) && is_string($data['img']) && trim($data['img']) === '') {
        // If explicit empty string sent for img, ignore (keep current), or you may want to null it:
        unset($data['img']);
    }

    $product->update($data);

    return new AdminProductResource($product->load('category'));
}

    public function destroy(Product $product)
    {
         /** @var \App\Models\User|null $user */
        $user = auth()->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        if (! (bool) ($user->is_admin ?? false)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

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
