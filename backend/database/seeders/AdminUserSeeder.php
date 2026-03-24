<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = 'n.a.092024@yandex.ru';

        // Создать пользователя если не существует
        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name'     => 'Elena',
                'password' => bcrypt('123456'), // для локалки — безопасно; в проде нельзя так делать
                'is_admin' => true,
            ]
        );

        // Если пользователь существовал, убедимся, что он помечен как админ
        if (! $user->is_admin) {
            $user->is_admin = true;
            $user->save();
        }

        // Создать персональный токен если доступен (Sanctum)
        if (method_exists($user, 'createToken')) {
            $token = $user->createToken('local-admin-token')->plainTextToken;
            $this->command->info("Admin user: {$email}");
            $this->command->info("Personal access token: {$token}");
        } else {
            $this->command->info("Admin user created/ensured: {$email}");
        }
    }
}
