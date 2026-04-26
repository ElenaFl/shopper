<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;


/**
 * Class CartItem
 *
 * Модель строки корзины.
 * Хранит привязку к пользователю, товару, количество, цену и snapshot (метаданные товара)
 */

class CartItem extends Model
{

    // список полей, допустимых для массового заполнения (Mass Assignment)
    protected $fillable = [
        'user_id',
        'product_id',
        'sku',
        'title',
        'snapshot',
        'unit_price',
        'quantity',
    ];


    protected $casts = [
        //при получении из БД поле автоматически декодируется в массив; при сохранении — сериализуется в JSON
        'snapshot' => 'array',
        'unit_price' => 'decimal:2',
    ];

    //отношение принадлежности к пользователю (от дочерней(владеющей модели) к родительской)
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
