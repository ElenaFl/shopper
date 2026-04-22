<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Discount;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use App\Models\Product;

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
            ->map(fn($s) => trim((string) $s))
            ->map(fn($s) => mb_strtolower($s))
            ->filter()
            ->values()
            ->all();

        // Удаляем старые записи для этих SKU (безопасно для повторного запуска)
        DB::table('discounts')->whereIn('sku', $skus)->delete();

        $created = 0;

        foreach ($skus as $index => $sku) {
            $position = $index + 1;

            // найдём продукт по нормализованному SKU (если есть)
            $product = Product::whereRaw('LOWER(TRIM(sku)) = ?', [$sku])->first();

            if ($position % 6 === 0) {
                $data = [
                    'sku' => $sku,
                    'product_id' => $product?->id,
                    'type' => 'percent',
                    'value' => 20.00,
                    'currency' => null,
                    'active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                    'note' => $product ? "Auto seed: 20% off for product_id {$product->id}" : "Auto seed: 20% off for SKU {$sku}",
                ];
                Discount::create($data);
                $created++;
            } elseif ($position % 5 === 0) {
                $data = [
                    'sku' => $sku,
                    'product_id' => $product?->id,
                    'type' => 'percent',
                    'value' => 10.00,
                    'currency' => null,
                    'active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                    'note' => $product ? "Auto seed: 10% off for product_id {$product->id}" : "Auto seed: 10% off for SKU {$sku}",
                ];
                Discount::create($data);
                $created++;
            }
        }

        $this->command->info("DiscountSeeder: created {$created} discounts.");
    }
}
