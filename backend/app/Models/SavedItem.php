<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedItem extends Model {
    protected $fillable = [
        'user_id',
        'product_id',
        'meta'
    ];

    protected $casts = [
        'meta' => 'array',
        ];
    public function user(): BelongsTo {
        return $this->belongsTo(\App\Models\User::class);
    }

    public function product(): BelongsTo {

        return $this->belongsTo(\App\Models\Product::class, 'product_id', 'id');
    }
}
