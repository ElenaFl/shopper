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

    public function index($postId)
    {
        $comments = Comment::with(['user', 'children.user'])
            ->where('post_id', $postId)
            ->orderBy('created_at', 'asc')
            ->get();

        return CommentResource::collection($comments);
    }

    // POST /api/blog/posts/{post}/comments
    public function store(Request $request, Post $post)
{
    $user = $request->user();
    if (! $user) {
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    $data = $request->validate([
        'body' => 'required|string|max:2000',
        'parent_id' => 'nullable|exists:comments,id',
    ]);

    // If parent_id provided, ensure parent is a root comment (no nesting deeper than 1)
    if (!empty($data['parent_id'])) {
        $parent = \App\Models\Comment::find($data['parent_id']);
        if (! $parent) {
            return response()->json(['message' => 'Parent comment not found'], 404);
        }
        if ($parent->parent_id !== null) {
            return response()->json(['message' => 'Replies to replies are not allowed'], 422);
        }
    }

    $comment = Comment::create([
        'post_id' => $post->id,
        'user_id' => $user->id,
        'body' => $data['body'],
        'parent_id' => $data['parent_id'] ?? null,
    ]);

    $comment->load('user');

    return (new CommentResource($comment))->response()->setStatusCode(201);
}


    /**
 * DELETE /api/blog/comments/{comment}
 */
/**
 * DELETE /api/blog/comments/{comment}
 */
public function destroy(Comment $comment)
{
    $user = request()->user();

    // Authorization: only owner or admin can delete
    if (! $user || ($comment->user_id !== $user->id && !($user->is_admin ?? false))) {
        return response()->json(['message' => 'Forbidden'], 403);
    }

    // If this is a reply (has parent), allow owner to remove it completely if no children,
    // otherwise soft-delete to preserve reply thread.
    if ($comment->parent_id !== null) {
        $hasChildren = Comment::where('parent_id', $comment->id)->exists();

        if ($hasChildren) {
            $comment->update([
                'is_deleted' => true,
                'deleted_at' => now(),
                'deleted_by' => $user->id,
            ]);
        } else {
            $comment->delete();
        }

        return response()->json(null, 204);
    }

    // Root comment:
    // If it has children -> soft-delete (keep children visible)
    // If no children -> soft-delete as well (keeps behaviour consistent)
    $hasChildren = Comment::where('parent_id', $comment->id)->exists();

    $comment->update([
        'is_deleted' => true,
        'deleted_at' => now(),
        'deleted_by' => $user->id,
    ]);

    return response()->json(null, 204);
}
}
