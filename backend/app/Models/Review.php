<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class Review
 *
 * Eloquent‑модель отзыва на товар.
 */

class Review extends Model
{

    // разрешает массовое заполнение этих полей через create()/fill()
    protected $fillable = [
        'product_id',
        'user_id',
        'rating',
        'comment'
    ];

    // устанавливает связь «отзыв принадлежит товару»
    public function product() {

        return $this->belongsTo(Product::class);
    }

    //  устанавливает связь «отзыв принадлежит пользователю»
    public function user() {

        return $this->belongsTo(User::class);
    }

}
