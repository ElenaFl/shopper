<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DiscountsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('discounts')->truncate();
        $now = Carbon::now();
        // Попробуем взять несколько product_id по SKU (если есть sku в products)
        $product = DB::table('products')
                    ->select('id','sku')
                    ->first();

        $rows = [
            [
                'sku' => $product->sku ?? 'TEST-SKU-1',
                'product_id' => $product->id ?? null,
                'type' => 'percent',
                'value' => 15.00,
                'currency' => null,
                'active' => true,
                'starts_at' => $now,
                'ends_at' => $now->copy()->addDays(30),
                'note' => '15% introductory discount',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'sku' => $product->sku ?? 'TEST-SKU-1',
                'product_id' => $product->id ?? null,
                'type' => 'fixed',
                'value' => 100.00,
                'currency' => 'USD',
                'active' => true,
                'starts_at' => $now,
                'ends_at' => $now->copy()
                    ->addDays(7),
                'note' => 'Fixed promo',
                'created_at' => $now,
                'updated_at' => $now, ],
            ];

        DB::table('discounts')->insert($rows);
    }
}


