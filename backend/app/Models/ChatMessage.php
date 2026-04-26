<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class ChatMessage
 *
 * Eloquent-модель сообщения в чат‑сессии.
 *
 */

class ChatMessage extends Model
{
    protected $fillable = ['session_id','user_id','role','content','meta'];

    protected $casts = [
        'meta' => 'array',
    ];

    //  связь «сообщение принадлежит сессии»
    public function session()
    {
        return $this->belongsTo(ChatSession::class, 'session_id');
    }
}
