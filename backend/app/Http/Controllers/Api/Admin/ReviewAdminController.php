<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Review;
use App\Http\Resources\ReviewResource;

/**
 * ReviewAdminController - контроллер для просмотра отзывов.
 *  Предназначен для получения постраничного списка отзывов с мета‑данными пользователя и товара.
*/

class ReviewAdminController extends Controller
{

    // возвращает paginated коллекцию отзывов (ReviewResource) на товары.
    // фильтрация по product_id
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 20);
        $query = Review::with(['user:id,name,avatar', 'product:id,title'])
                    ->orderByDesc('created_at');

        // optional: filter by product, user, rating, etc.
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->query('product_id'));
        }

        $paginator = $query->paginate($perPage);

        return ReviewResource::collection($paginator);
    }
}
