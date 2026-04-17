<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\OrderItem;

class Order extends Model
{
    public $incrementing = false; // id — string
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'number',
        'user_id',
        'status',
        'totals',
        'billing',
        'payment',
    ];

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
