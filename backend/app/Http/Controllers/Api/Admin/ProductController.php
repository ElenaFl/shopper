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

/**
 * Class ProductController
 *
 * Админский API для управления товарами (CRUD).
 *
 * Поведение:
 * - index: список продуктов с пагинацией (per_page, page), с relation category и discounts.
 * - store: создать продукт (требует admin), загрузка изображения, опциональное создание скидки.
 * - show: показать продукт с reviews.user, category, discounts.
 * - update: обновить продукт (требует admin), обновить/удалить изображение, обновить или удалить скидку.
 * - destroy: удалить продукт (требует admin) и связанный файл изображения.
 *
 * Ответы:
 * - 200 OK, 201 Created, 204 No Content, 401/403/422/500 при ошибках.
 */

class ProductController extends Controller
{
    // Формирует базовый запрос Product::query(), подгружает relations category и discounts, делает пагинацию по per_page и page из запроса.Возвращает коллекцию ProductResource через пагинатор.
    public function index(Request $request)
    {
        $query = Product::query();

        $perPage = $request->query('per_page', 15);
        $page = $request->query('page', 1);

        //  подгружает связи category и discounts
        $query->with(['category', 'discounts']);
        // делает пагинацию по per_page и page из запроса (показ 1 страницы)
        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

       // возвращает коллекцию ProductResource через пагинатор
        return ProductResource::collection($paginator);
    }

    // создаёт продукт через Product::create($data)
    public function store(Request $request)
    {
        /** @var \App\Models\User|null $user */
        $user = request()->user();

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

        try {
            $discountValue = $request->input('discount');
            $discountCurrency = $request->input('discount_currency') ?? $request->input('currency') ?? null;
            if ($discountValue !== null && $discountValue !== '' && is_numeric($discountValue) && floatval($discountValue) > 0) {
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
        }
        catch (\Throwable $e) {
        }

        return (new AdminProductResource($product->load('category')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Product $product)
    {
        $product->load(['reviews.user', 'category', 'discounts']);

        return new ProductResource($product);
    }

    public function update(Request $request, Product $product)
    {
        $user = request()->user();
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

        if ($request->hasFile('img') && $request->file('img')->isValid()) {
            if ($product->img && preg_match('#^(?:images/|/images/)#',  $product->img)) {
            $oldPath = public_path(ltrim($product->img, '/'));
            try {
                if (file_exists($oldPath)) {
                    @unlink($oldPath);
                }
            } catch (\Throwable $e) {
            }
        }
        elseif ($product->img && preg_match('#^(?:products/|storage/|/storage/)#', $product->img)) {
            $old = ltrim(preg_replace('#^/?storage/#', '', $product->img), '/');
            try {
                if (Storage::disk('public')->exists($old)) {
                    Storage::disk('public')->delete($old);
                }
            } catch (\Throwable $e) {
            }
        }

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
            if (isset($data['img'])) {
                unset($data['img']);
            }
        }
    } elseif (isset($data['img']) && is_string($data['img']) && trim($data['img']) === '') {
        unset($data['img']);
    }

    $product->update($data);

    try {
        $discountValue = $request->input('discount');
        $discountCurrency = $request->input('discount_currency') ?? $request->input('currency') ?? null;

        if ($discountValue !== null && $discountValue !== '' && is_numeric($discountValue) && floatval($discountValue) > 0) {
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
            ]);
        } else {
            Discount::where('product_id', $product->id)->delete();
        }
        } catch (\Throwable $e) {
        }

        return new AdminProductResource($product->load('category'));
    }

    public function destroy(Product $product)
    {
        // получить текущего аутентифицированного пользователя
        /**
         * @var \App\Models\User|null $user / $user = auth()->user();
         */
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
