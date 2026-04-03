<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Comment extends Model
{
    use SoftDeletes;

    protected $dates = ['deleted_at'];

    protected $fillable = [
        'post_id',
        'user_id',
        'body',
        'parent_id',
    ];

    // Post relation
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    // User relation
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // parent comment
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    // child replies
    public function children(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id')->orderBy('created_at', 'asc');
    }
}
