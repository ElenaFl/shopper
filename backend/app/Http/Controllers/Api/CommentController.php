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

        $post->comments_count = $post->comments()->count();
        $post->saveQuietly();
        $comment->load('user');

        return (new CommentResource($comment))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Comment $comment)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // allow if owner or admin (adjust admin check to your app)
        $isOwner = $comment->user_id === $user->id;
        $isAdmin = $user->is_admin ?? false; // замените на вашу логику проверки админа

        if (! $isOwner && ! $isAdmin) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $post = $comment->post; // загрузим связанный пост
        $comment->delete();

        // обновляем агрегат с количеством комментариев
        if ($post) {
            $post->comments_count = $post->comments()->count();
            $post->saveQuietly();
        }

        return response()->json(null, 204);
    }
}
