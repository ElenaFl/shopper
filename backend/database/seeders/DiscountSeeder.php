<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Discount;
use Illuminate\Support\Facades\DB; 
use Illuminate\Support\Carbon;
class DiscountSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now();
        
        // Список SKU
        $skus = DB::table('products')
            ->orderBy('id')
            ->pluck('sku')
            ->filter()
            ->unique()
            // уберёт null/пустые
            ->map(fn($s) => trim((string) $s))
            // удаляет пробелы по краям
            ->map(fn($s) => mb_strtolower($s))
            // в нижний регистр
            ->filter()
            // ещё раз на всякий случай (после trim может остаться пустая строка) 
            ->values()
            ->all();

        // Удаляем старые записи для этих SKU (безопасно для повторного запуска)
        DB::table('discounts')->whereIn('sku', $skus)->delete();

        $created = 0; 

        foreach ($skus as $index => $sku) {
            $position = $index + 1;
            // позиции 1..N
            if ($position % 6 === 0) {
                // каждый 6-й — скидка 20%
                Discount::create([
                    'sku' => $sku,
                    'type' => 'percent',
                    'value' => 20.00,
                    'currency' => null,
                    'active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                    'note' => 'Auto seed: 20% off for each 6th product',
                ]);
                $created++;
            } elseif ($position % 5 === 0) {
                // каждый 5-й — скидка 10%
                Discount::create([
                    'sku' => $sku,
                    'type' => 'percent',
                    'value' => 10.00,
                    'currency' => null,
                    'active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                    'note' => 'Auto seed: 10% off for each 5th product',
                ]);
                $created++;
            } 
        }
        $this->command->info("DiscountSeeder: created {$created} discounts.");           
    }
}
