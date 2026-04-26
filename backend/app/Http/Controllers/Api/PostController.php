<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Post;
use App\Http\Resources\PostResource;
use App\Jobs\IncrementPostViews;

/**
 * Class PostController
 *
 * Публичный API для работы с постами блога.
 *
 * Поведение:
 * - index: возвращает список опубликованных постов с опциональной фильтрацией по тегу и поиском.
 * - show: возвращает один пост, увеличивает счётчик просмотров (синхронно и через Job) и подгружает отношения.
 *
 * Ответы:
 * - 200 OK с ресурсами PostResource.
 */

class PostController extends Controller
{
    // GET /api/blog/posts
    public function index(Request $request)
    {
        $query = Post::query()->with(['author', 'tags']);

        // на данный момент не реализован
        if ($request->filled('search')) {
            $s = trim(mb_substr((string)$request->query('search'), 0, 200));
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('excerpt', 'like', "%{$s}%")
                  ->orWhere('body', 'like', "%{$s}%");
            });
        }

        // вернёт только те посты, у которых есть tag со slug = $tag
        // filled() — проверяет: присутствует ли в запросе параметр и не пустое ли у него значение
        if ($request->filled('tag')) {
            $tag = (string) $request->query('tag');
            // выбирает только те родительские записи, у которых есть связанные записи, удовлетворяющие заданному условию
            $query->whereHas('tags', function ($q) use ($tag) {
                $q->where('slug', $tag);
            });
        }

        // список опубликованных постов, отсортированных от самых новых к старым
        $items = $query->whereNotNull('published_at')->orderByDesc('published_at')->get();
        // сериализует коллекцию  постов в JSON при возврате ответа
        return PostResource::collection($items);
    }

    public function show(Post $post)
{
    // Асинхронно поставить задачу (job) для дополнительной обработки просмотра (лог, аналитика и т.д.) --- пока не используется
    IncrementPostViews::dispatch($post->id);

    //  увеличить счётчик просмотров в БД (UPDATE posts SET views = views + 1)
    $post->increment('views');

    // Подгрузить связанные сущности:
    // - author: автор поста
    // - comments: только корневые комментарии (parent_id IS NULL), а для них eager-load:
    //     - user: автор комментария
    //     - children.user: ответы на комментарии и их авторы
    // (Это предотвращает N+1 запросы при сериализации)
    $post->load([
        'author',
        'comments' => function($q) {
            $q->whereNull('parent_id')->with(['user','children.user']);
        },
    ]);

    // Вернуть сериализованный ресурс поста для API
    return new PostResource($post);
}
}
