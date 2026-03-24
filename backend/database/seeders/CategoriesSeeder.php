<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $categories = [
            ['id' => 1, 'title' => 'Earrings',  'slug' => 'earrings'],
            ['id' => 2, 'title' => 'Hoops',      'slug' => 'hoops'],
            ['id' => 3, 'title' => 'Hairpins',   'slug' => 'hairpins'],
            ['id' => 4, 'title' => 'Necklaces',  'slug' => 'necklaces'],
            ['id' => 5, 'title' => 'Choker',  'slug' => 'choker'],
            ['id' => 6, 'title' => 'Perle',  'slug' => 'perle'],
            ['id' => 7, 'title' => 'Pendentif',  'slug' => 'pendentif'],
            ['id' => 8, 'title' => 'Bracelet',  'slug' => 'bracelet'],
        ];

        foreach ($categories as $cat) {
            // updateOrInsert делает сидер идемпотентным
            DB::table('categories')->updateOrInsert(
                // по id — чтобы записать те же id, если таблица пустая
                ['id' => $cat['id']],
                [
                    'title' => $cat['title'],
                    'slug' => $cat['slug'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }
}
