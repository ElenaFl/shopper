<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Post;
use App\Http\Resources\PostResource;
use App\Jobs\IncrementPostViews;

class PostController extends Controller
{
    // GET /api/blog/posts
    public function index(Request $request)
    {
        $query = Post::query()->with(['author', 'tags']);

        if ($request->filled('search')) {
            $s = trim(mb_substr((string)$request->query('search'), 0, 200));
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('excerpt', 'like', "%{$s}%")
                  ->orWhere('body', 'like', "%{$s}%");
            });
        }

        if ($request->filled('tag')) {
            $tag = (string) $request->query('tag');
            $query->whereHas('tags', function ($q) use ($tag) {
                $q->where('slug', $tag);
            });
        }

        $items = $query->whereNotNull('published_at')->orderByDesc('published_at')->get();

        return PostResource::collection($items);
    }

    // GET /api/blog/posts/{post} (by id)
    public function show(Post $post)
    {
        // диспатчим job асинхронно (без ожидания)
        IncrementPostViews::dispatch($post->id);
        // increment views atomically
        $post->increment('views');

        // load author and comments with their users and tags
        $post->load(['author', 'comments' => function($q) {
            $q->whereNull('parent_id')->with(['user','children.user']);
        }, 'comments.user']);

        return new PostResource($post);
    }
}
