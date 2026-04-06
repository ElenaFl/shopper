<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void {
        Schema::create('discounts', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->index();
            $table->unsignedBigInteger('product_id')->nullable()->index(); $table->enum('type', ['percent', 'fixed'])->default('percent'); $table->decimal('value', 10, 2)->default(0);
            $table->string('currency')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            // внешний ключ на products
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('cascade');
        });
}

    public function down(): void {
        Schema::dropIfExists('discounts');
    }
};
