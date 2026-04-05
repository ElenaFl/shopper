<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    protected $fillable = ['session_id','user_id','role','content','meta'];

    protected $casts = [
        'meta' => 'array',
    ];

    public function session()
    {
        return $this->belongsTo(ChatSession::class, 'session_id');
    }
}
