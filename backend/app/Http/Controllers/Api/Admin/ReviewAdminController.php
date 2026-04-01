<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Review;
use App\Http\Resources\ReviewResource;

class ReviewAdminController extends Controller
{
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

        // return a paginated resource collection (data + meta)
        return ReviewResource::collection($paginator);
    }
}
