<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Post;
use App\Models\Comment;
use App\Http\Resources\CommentResource;

/**
 * CommentController - контроллер API, отвечающий за работу с комментариями к постам
 * Требует авторизации (middleware auth:sanctum) для операций, где это нужно (публикация/удаление комментариев).
 * Получение комментариев (index)
 * Возвращает список комментариев для конкретного поста.
 * Подгружает связанные данные (пользователя автора и пользователей у дочерних комментариев), сортирует по времени создания (по возрастанию).
 * Использует CommentResource для единообразного форматирования ответа.
 *
 */

class CommentController extends Controller
{
    // Подключает middleware auth:sanctum — то есть требует аутентификацию через Sanctum для всех экшенов контроллера (для публикации и удаления комментариев)
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index($postId)
    {
        // 'children.user' - возвращает дочерние комментарии (ответы) данного комментария
        $comments = Comment::with(['user', 'children.user'])
            ->where('post_id', $postId)
            ->orderBy('created_at', 'asc')
            ->get();

        return CommentResource::collection($comments);
    }

    // создание комментария
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

        // Если указан parent_id, убедиться, что родитель — корневой комментарий
        // (нельзя отвечать на ответ — глубина вложенности не больше 1)
        if (!empty($data['parent_id'])) {
            $parent = Comment::find($data['parent_id']);
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
     * Удаление комментария
     */
    public function destroy(Comment $comment)
    {
        $user = request()->user();

        // Проверка прав: удалять может автор комментария или администратор
        if (! $user || ($comment->user_id !== $user->id && !($user->is_admin ?? false))) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Если это ответ (не корневой комментарий)
        if ($comment->parent_id !== null) {
            $hasChildren = Comment::where('parent_id', $comment->id)->exists();

            if ($hasChildren) {
                // Есть вложенные ответы — выполняем мягкое удаление (soft delete)
                $comment->delete();
            } else {
                // Вложений нет — полностью удаляем запись из БД
                $comment->forceDelete();
            }

            return response()->json(null, 204);
        }

        // Корневой комментарий — мягко удаляем, чтобы ответы оставались видимыми
        $comment->delete();

        return response()->json(null, 204);
    }
}
