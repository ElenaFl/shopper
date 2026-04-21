<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\OrderItem;

/**
 *
 * Модель Order
 */

class Order extends Model
{

    // первичный ключ модели не является автоинкрементным целым числом
    public $incrementing = false;

    // первичный ключ модели строковый (id генерируется в коде - OrderController::store)
    protected $keyType = 'string';

    // поля массового заполнения
    protected $fillable = [
        'id',
        'number',
        'user_id',
        'status',
        'totals',
        'billing',
        'payment',
    ];

    // эти поля автоматически при чтении/записи преобразуются в/из массива (JSON в БД)
    protected $casts = [
        'totals' => 'array',
        'billing' => 'array',
        'payment' => 'array',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'order_id', 'id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class);
    }
}
