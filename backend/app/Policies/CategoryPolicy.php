<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Category;

class CategoryPolicy
{
    /**
     * Определяет, может ли пользователь просматривать список категорий.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Определяет, может ли пользователь просмотреть конкретную категорию.
     */
    public function view(User $user, Category $category): bool
    {
        return true;
    }

    /**
     * Определяет, может ли пользователь создавать категории.
     */
    public function create(User $user): bool
    {
        return $user->is_admin ?? false;
    }

    /**
     * Определяет, может ли пользователь обновлять категорию.
     */
    public function update(User $user, Category $category): bool
    {
        return $user->is_admin ?? false;
    }

    /**
     * Определяет, может ли пользователь удалять категорию.
     */
    public function delete(User $user, Category $category): bool
    {
        return $user->is_admin ?? false;
    }

}
