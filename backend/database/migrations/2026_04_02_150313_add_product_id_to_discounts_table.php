<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('discounts', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable()->after('sku')->index();
        });
    }

    public function down(): void {
        Schema::table('discounts', function (Blueprint $table) {
            $table->dropIndex(['product_id']);
            $table->dropColumn('product_id');
        });
    }
};
