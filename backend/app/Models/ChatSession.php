<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatSession extends Model
{
    protected $fillable = ['user_id','provider','provider_session_id'];

    public function messages()
    {
        return $this->hasMany(ChatMessage::class, 'session_id');
    }
}
