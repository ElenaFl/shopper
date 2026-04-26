<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class ChatSession
 *
 * Модель сессии чата
 */

class ChatSession extends Model
{
    protected $fillable = ['user_id','provider','provider_session_id'];


    // связь "один-ко-многим": все ChatMessage, принадлежащие данной сессии
    public function messages()
    {
        return $this->hasMany(ChatMessage::class, 'session_id');
    }
}
