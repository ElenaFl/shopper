<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Модель OrderItem — Eloquent‑модель для строки заказа
 */

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'product_id',
        'title',
        'sku',
        'price',
        'quantity',
        'img',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    // отношение belongsTo к модели Order. Каждая запись OrderItem "принадлежит" одному Order. Позволяет:Получить заказ для позиции: $orderItem->order. Выполнить запрос с подгрузкой: OrderItem::with('order')->get(). Строить запросы через отношение: OrderItem::whereHas('order', fn($q)=>...) и т.д
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id', 'id');
    }
}
