<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Product;
use App\Models\User;


/**
 * Class SavedItem
 *
 * Eloquent‑модель содержит логику работы с сохраненными товарами
 */

class SavedItem extends Model {

    protected $fillable = [
        'user_id',
        'product_id',
        'meta'
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    // SavedItem "принадлежит" пользователю. Позволяет получить автора/владельца через $savedItem->user.
    public function user(): BelongsTo {
        return $this->belongsTo(User::class);
    }

    // связь с моделью Product — какой товар сохранён
    public function product(): BelongsTo {

        return $this->belongsTo(Product::class, 'product_id', 'id');
    }
}
