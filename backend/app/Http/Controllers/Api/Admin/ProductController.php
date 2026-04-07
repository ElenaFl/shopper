<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Http\Resources\AdminProductResource;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Facades\Image;
use App\Http\Resources\ProductResource;
use App\Models\Discount;

class ProductController extends Controller
{
    public function index(Request $request)
{
    // build base query (existing logic may include filters)
    $query = Product::query();

    // (apply any existing admin filters/pagination here)
    $perPage = $request->query('per_page', 15);
    $page = $request->query('page', 1);

    // eager-load discounts so resource can use them without extra queries
    $query->with(['category', 'discounts']);

    $paginator = $query->paginate($perPage, ['*'], 'page', $page);

    return ProductResource::collection($paginator);
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
                }
        } elseif (isset($data['img']) && is_string($data['img']) && trim($data['img']) === '') {
            unset($data['img']);
        }

        $product = Product::create($data);

        // handle discount (optional)
try {
    $discountValue = $request->input('discount'); // could be null or string/number
    $discountCurrency = $request->input('discount_currency') ?? $request->input('currency') ?? null;
    if ($discountValue !== null && $discountValue !== '' && is_numeric($discountValue) && floatval($discountValue) > 0) {
        // create discount as percent
        Discount::create([
            'product_id' => $product->id,
            'sku' => $product->sku ?? $request->input('sku'),
            'type' => 'percent',
            'value' => number_format((float)$discountValue, 2, '.', ''), // store as decimal
            'currency' => $discountCurrency,
            'active' => true,
            'starts_at' => $request->input('discount_starts_at') ?? null,
            'ends_at' => $request->input('discount_ends_at') ?? null,
            'note' => $request->input('discount_note') ?? null,
        ]);
    }
} catch (\Throwable $e) {
    // don't fail product creation on discount error; optionally return warning in response
}



        return (new AdminProductResource($product->load('category')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Product $product)
{
    // load relations including discounts
    $product->load(['reviews.user', 'category', 'discounts']);
    return new ProductResource($product);
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

    // handle discount upsert/delete
try {
    $discountValue = $request->input('discount'); // may be null/empty to remove
    $discountCurrency = $request->input('discount_currency') ?? $request->input('currency') ?? null;

    if ($discountValue !== null && $discountValue !== '' && is_numeric($discountValue) && floatval($discountValue) > 0) {
        // upsert percent discount by product_id
        Discount::updateOrCreate(
            ['product_id' => $product->id],
            [
                'sku' => $product->sku ?? $request->input('sku'),
                'type' => 'percent',
                'value' => number_format((float)$discountValue, 2, '.', ''),
                'currency' => $discountCurrency,
                'active' => true,
                'starts_at' => $request->input('discount_starts_at') ?? null,
                'ends_at' => $request->input('discount_ends_at') ?? null,
                'note' => $request->input('discount_note') ?? null,
            ]
        );
    } else {
        // remove discounts for this product (if any)
        Discount::where('product_id', $product->id)->delete();
    }
} catch (\Throwable $e) {
}

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
