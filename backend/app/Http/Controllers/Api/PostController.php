<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Post;
use App\Http\Resources\PostResource;

class PostController extends Controller
{
    // GET /api/blog/posts
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 12);
        $query = Post::query()->with('author');

        if ($request->filled('search')) {
            $s = trim(mb_substr((string)$request->query('search'), 0, 200));
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('excerpt', 'like', "%{$s}%")
                  ->orWhere('body', 'like', "%{$s}%");
            });
        }

        $query->whereNotNull('published_at')->orderByDesc('published_at');

        if ($perPage > 0) {
            $items = $query->paginate($perPage);
            return PostResource::collection($items);
        }

        $items = $query->get();
        return PostResource::collection($items);
    }

    // GET /api/blog/posts/{post} (by id)
    public function show(Post $post)
    {
        // increment views atomically
        $post->increment('views');

        // load author and comments with their users
        $post->load(['author', 'comments.user']);

        return new PostResource($post);
    }
}
