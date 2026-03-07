<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        $products = [
            [
                'id' => 1,
                'title' => 'Lira Earrings',
                'currency' => '$',
                'price' => 20.00,
                'img' => '/images/Img01.jpg',
                'category_id' => 1,
                'SKU' => 'EL712',
                'material' => 'Metal',
                'dimentions' => '15cm x 10cm x 1cm',
                'weight' => '0.03kg',
                'colours' => 'Gold',
                'description' => "Elegant handcrafted jewelry piece made from high-quality materials. Perfect for everyday wear and special occasions. Lightweight design with lasting finish.",
            ],
            [
                'id' => 2,
                'title' => 'Hal Earrings',
                'currency' => '$',
                'price' => 25.00,
                'img' => '/images/Img02.jpg',
                'category_id' => 1,
                'SKU' => 'EH102',
                'material' => 'Metal',
                'dimentions' => '15cm x 5cm x 1cm',
                'weight' => '0.02kg',
                'colours' => 'Gold',
                'description' => "Elegant handcrafted jewelry piece made from high-quality materials. Perfect for everyday wear and special occasions. Lightweight design with lasting finish.",
            ],
            [
                'id' => 3,
                'title' => 'Kaede Hair Pin Set Of 3',
                'currency' => '$',
                'price' => 30.00,
                'img' => '/images/Img03.jpg',
                'category_id' => 3,
                'SKU' => 'HS314',
                'material' => 'Metal',
                'dimentions' => '10cm x 3cm x 1cm',
                'weight' => '0.01kg',
                'colours' => 'Gold, White',
                'description' => "Elegant handcrafted jewelry piece made from high-quality materials. Perfect for everyday wear and special occasions. Lightweight design with lasting finish.",
            ],
            [
                'id' => 4,
                'title' => 'Hair Pin Set of 4',
                'currency' => '$',
                'price' => 30.00,
                'img' => '/images/Img04.jpg',
                'category_id' => 3,
                'SKU' => 'HS412',
                'material' => 'Metal',
                'dimentions' => '10cm x 3cm x 1cm',
                'weight' => '0.01kg',
                'colours' => 'Gold, White',
                'description' => "Elegant handcrafted jewelry piece made from high-quality materials. Perfect for everyday wear and special occasions. Lightweight design with lasting finish.",
            ],
            [
                'id' => 5,
                'title' => 'Plaine Necklace',
                'currency' => '$',
                'price' => 19.00,
                'img' => '/images/Img05.jpg',
                'category_id' => 4,
                'SKU' => 'NK722',
                'material' => 'Metal',
                'dimentions' => '2cm x 2cm x 1cm',
                'weight' => '0.01kg',
                'colours' => 'Gold, Black',
                'description' => "Elegant handcrafted jewelry piece made from high-quality materials. Perfect for everyday wear and special occasions. Lightweight design with lasting finish.",
            ],
            [
                'id' => 6,
                'title' => 'Yuki Hair Pin Set of 3',
                'currency' => '$',
                'price' => 29.00,
                'img' => '/images/Img06.jpg',
                'category_id' => 3,
                'SKU' => 'HS325',
                'material' => 'Metal',
                'dimentions' => '10cm x 1cm x 1cm',
                'weight' => '0.01kg',
                'colours' => 'Gold, Ruby',
                'description' => "Elegant handcrafted jewelry piece made from high-quality materials. Perfect for everyday wear and special occasions. Lightweight design with lasting finish.",
            ],
        ];

        foreach ($products as $p) {
            DB::table('products')->updateOrInsert(
                ['id' => $p['id']], // сохраняем те же id, как в фронтенде
                [
                    'title' => $p['title'],
                    'sku' => $p['SKU'],
                    'category_id' => $p['category_id'],
                    'price' => $p['price'],
                    'currency' => $p['currency'],
                    'description' => $p['description'],
                    'img' => $p['img'],
                    'weight' => $p['weight'],
                    'dimentions' => $p['dimentions'],
                    'colours' => $p['colours'],
                    'material' => $p['material'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }
}
