<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Post;
use App\Models\Comment;
use App\Http\Resources\CommentResource;

class CommentController extends Controller
{
    public function __construct()
    {
        // require auth for posting comments
        $this->middleware('auth:sanctum');
    }

    // POST /api/blog/posts/{post}/comments
    public function store(Request $request, Post $post)
    {
        $data = $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $comment = Comment::create([
            'post_id' => $post->id,
            'user_id' => $user->id,
            'body' => $data['body'],
        ]);

        // reload comments count if you want; load user relation for resource
        $comment->load('user');

        return (new CommentResource($comment))->response()->setStatusCode(201);
    }
}
