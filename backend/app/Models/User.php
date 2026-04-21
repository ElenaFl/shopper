<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * модель пользователя в Laravel — класс User предоставляет аутентификацию/токены/уведомления
 *
 * extends Authenticatable — стандартная модель пользователя с готовой реализацией методов аутентификации
 */

class User extends Authenticatable
{

    //HasApiTokens — поддержка Laravel Sanctum (API-токены)
    //Notifiable — уведомления (email)
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    //атрибуты, которые не будут включены в массив/JSON представления модели (например, при response()->json($user)). Здесь скрывают password и remember_token
    protected $hidden = [
        'password',
        'remember_token',
    ];
}
