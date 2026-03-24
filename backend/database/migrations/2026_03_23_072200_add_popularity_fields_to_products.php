<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // поля для популярности/рейтинга
            $table->unsignedBigInteger('sales_count')->default(0)->after('price');
            $table->unsignedInteger('reviews_count')->default(0)->after('sales_count');
            $table->decimal('rating', 3, 2)->nullable()->after('reviews_count'); // 0.00 - 5.00
            $table->decimal('popularity_score', 8, 4)->default(0)->after('rating');
            $table->boolean('is_popular')->default(false)->after('popularity_score');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'sales_count',
                'reviews_count',
                'rating',
                'popularity_score',
                'is_popular',
            ]);
        });
    }
};

