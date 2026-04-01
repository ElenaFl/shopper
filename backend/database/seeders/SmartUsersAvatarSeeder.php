<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SmartUsersAvatarSeeder extends Seeder
{
    public function run(): void
    {
        $map = [
            'elena' => '/images/avatarElena.webp',
            'anna'  => '/images/avatarAnna.webp',
            'ivan'  => '/images/avatarIvan.webp',
            // add more mappings as needed
        ];
        $default = '/images/avatar-placeholder.png';

        DB::table('users')->chunkById(200, function ($users) use ($map, $default) {
            foreach ($users as $u) {
                if (!empty($u->avatar)) continue;
                $name = trim(strtolower(explode(' ', $u->name ?? '')[0] ?? ''));
                $avatar = $map[$name] ?? $default;
                DB::table('users')->where('id', $u->id)->update(['avatar' => $avatar]);
            }
        });
    }
}
