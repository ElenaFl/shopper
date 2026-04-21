<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;


/**
 * Класс политики (Policy) — набор правил авторизации для модели Order,
 * регистрируется для модели Order и затем вызывается, например, $this->authorize('view', $order) в контроллере
 */

class OrderPolicy
{
    /**
     * Может ли пользователь смотреть свои заказы (пока не используется в контроллере, в последующем - для унифицирования логики)
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /**
     * Разрешает просмотр конкретного заказа
     */
    public function view(?User $user, Order $order): bool
    {
        if (! $user) {
            return false;
        }
        // админская логика
        if (method_exists($user, 'isAdmin') && $user->isAdmin()) {
            return true;
        }
        return $order->user_id !== null && $order->user_id === $user->id;
    }

    /**
     * Разрешение на создание заказа
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Разрешение на изменение заказа
     */
    public function update(User $user, Order $order): bool
    {
        return false;
    }

    /**
     * Разрешение на удаление заказа
     */
    public function delete(User $user, Order $order): bool
    {
        return false;
    }

    /**
     * Разрешение на восстановление заказа
     */
    public function restore(User $user, Order $order): bool
    {
        return false;
    }

    /**
     *Разрешение на принудительное удаление заказа
     */
    public function forceDelete(User $user, Order $order): bool
    {
        return false;
    }
}
