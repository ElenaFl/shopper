<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

    return new class extends Migration {

        public function up(): void {
            Schema::create('products', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->string('sku')->nullable()->index();
                $table->unsignedBigInteger('category_id')->nullable();
                $table->decimal('price', 10, 2)->default(0);
                $table->string('currency')->default('USD');
                $table->text('description')->nullable();
                $table->string('img')->nullable();
                $table->string('weight')->nullable();
                $table->string('dimensions')->nullable();
                $table->string('colours')->nullable();
                $table->string('material')->nullable();
                // popularity / stats
                $table->unsignedBigInteger('sales_count')->default(0); $table->unsignedInteger('reviews_count')->default(0);
                $table->decimal('rating', 3, 2)->nullable();
                $table->decimal('popularity_score', 8, 4)->default(0);
                $table->boolean('is_popular')->default(false); $table->unsignedBigInteger('views')->default(0);
                $table->timestamps();
                $table->foreign('category_id')
                    ->references('id')
                    ->on('categories')
                    ->onDelete('set null');
            });
        }

        public function down(): void {
            Schema::dropIfExists('products');
        }
};








