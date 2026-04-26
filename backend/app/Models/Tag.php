<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Class Tag
 *
 * Eloquent‑модель для тегов
 */

class Tag extends Model
{
    protected $fillable = ['name', 'slug'];

    protected static function booted()
    {
        static::creating(function ($tag) {
            if (empty($tag->slug)) {
                $tag->slug = Str::slug($tag->name);
            }
        });
    }

    // Связь posts(): belongsToMany с моделью Post через таблицу post_tag (многие‑ко‑многим)
    public function posts()
    {
        return $this->belongsToMany(Post::class, 'post_tag');
    }


}
