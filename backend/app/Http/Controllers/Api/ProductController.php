<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Discount;
use Illuminate\Http\Request;
use App\Http\Resources\ProductResource;
use Illuminate\Support\Facades\DB;
use App\Jobs\IncrementProductViews;

class ProductController extends Controller
{
    /**
     * List products with optional filters, sort and pagination.
     * Query params: per_page (default 24), page, category_id, search, sort (newest|price_asc|price_desc|popular)
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page');
        $sort = $request->query('sort', 'newest');
        $categoryId = $request->query('category_id');
        $search = (string) $request->query('search', '');

        $now = now();

        // Eloquent query, with category relation
        $query = Product::query()->with('category');

        // eager-load active discounts condition (we will attach normalized discounts later to avoid SKU-case issues)
        // keep this for potential eager loading but we won't rely solely on it
        $query->with(['discounts' => function ($dq) use ($now) {
            $dq->where('active', true)
                ->where(function ($sq) use ($now) {
                    $sq->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
                })
                ->where(function ($sq) use ($now) {
                    $sq->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
                })
                ->orderByDesc('id');
        }]);

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

        if ($request->filled('price_min')) {
            $min = (float) $request->query('price_min');
            $query->where('price', '>=', $min);
        }

        if ($request->filled('price_max')) {
            $max = (float) $request->query('price_max');
            $query->where('price', '<=', $max);
        }

        if ($request->boolean('on_sale')) {
            // filter products that have an active discount (using WHERE EXISTS with normalized SKU compare)
            $query->whereExists(function ($q) use ($now) {
                $q->select(DB::raw(1))
                    ->from('discounts')
                    ->whereRaw('LOWER(TRIM(discounts.sku)) = LOWER(TRIM(products.sku))')
                    ->where('discounts.active', true)
                    ->where(function ($sq) use ($now) {
                        $sq->whereNull('discounts.starts_at')
                            ->orWhere('discounts.starts_at', '<=', $now);
                    })->where(function ($sq) use ($now) {
                        $sq->whereNull('discounts.ends_at')
                            ->orWhere('discounts.ends_at', '>=', $now);
                    });
            });
        }

        switch ($sort) {
            case 'popular':
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

        // Execute query with pagination or full collection
        if ($perPage > 0) {
            $items = $query->paginate($perPage);
        } else {
            $items = $query->get();
        }

        // Normalize SKUs from retrieved products (lowercase + trim) and build list
        $productItems = $items instanceof \Illuminate\Pagination\LengthAwarePaginator ? collect($items->items()) : $items;
        $skus = $productItems
            ->pluck('sku')
            ->filter()
            ->map(function ($s) {
                return mb_strtolower(trim((string) $s));
            })
            ->unique()
            ->values()
            ->all();

        if (!empty($skus)) {
            // Load active discounts matching normalized SKUs
            $discounts = Discount::query()
                ->where('active', true)
                ->where(function ($q) use ($now) {
                    $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
                })
                ->where(function ($q) use ($now) {
                    $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
                })
                ->whereIn(DB::raw('LOWER(TRIM(sku))'), $skus)
                ->orderByDesc('id')
                ->get()
                ->groupBy(function ($d) {
                    return mb_strtolower(trim((string) $d->sku));
                });

            // Attach discounts to products by normalized SKU so ProductResource sees them as relation 'discounts'
            foreach ($productItems as $product) {
                $key = mb_strtolower(trim((string) $product->sku));
                $matched = $discounts->get($key) ?? collect();
                if (! $matched instanceof \Illuminate\Support\Collection) {
                    $matched = collect($matched);
                }
                $product->setRelation('discounts', $matched);
            }
        } else {
            foreach ($productItems as $product) {
                $product->setRelation('discounts', collect());
            }
        }

        return ProductResource::collection($items);
    }

    public function show(Product $product)
    {
        $product->loadMissing('category');

        IncrementProductViews::dispatch($product->id);

        $discountModel = $product->activeDiscount();
        if ($discountModel) {
            $product->setRelation('discounts', collect([$discountModel]));
        }

        return new ProductResource($product);
    }
}
