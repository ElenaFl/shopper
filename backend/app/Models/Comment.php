<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class Comment
 *
 *
 * Eloquent‑модель комментария к посту.
 * Содержит логику доступа к комментариям и ответам на них
 */

class Comment extends Model
{
    // включает мягкое удаление (soft deletes). При вызове $comment->delete() запись не удаляется физически, а в колонку deleted_at записывается отметка времени
    use SoftDeletes;

    //позволяет «спрятать» комментарий, при этом сохранять запись в БД (чтобы, например, сохранять ответы или историю). поле deleted_at должно автоматически приводиться к типу 'datetime'.
    protected $casts = ['deleted_at' => 'datetime'];

    // какие атрибуты разрешены для массового присвоения
    protected $fillable = [
        'post_id',
        'user_id',
        'body',
        'parent_id',
    ];

    // связь «комментарий принадлежит посту». Позволяет по комментарию получить пост $comment->post
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    // связь с автором комментария. Позволяет получить данные автора: $comment->user.
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // отношение к родительскому комментарию (если это ответ). Возвращает единственную модель Comment или null.
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    // связь «один ко многим» — дочерние комментарии (ответы). Сортирует ответы по времени создания по возрастанию
    public function children(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id')->orderBy('created_at', 'asc');
    }
}
