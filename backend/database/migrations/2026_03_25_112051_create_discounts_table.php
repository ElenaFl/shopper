<?php use Illuminate\Database\Migrations\Migration;
    use Illuminate\Database\Schema\Blueprint;
    use Illuminate\Support\Facades\Schema;

    return new class extends Migration {
        public function up(): void {

            Schema::create('discounts', function (Blueprint $table) {

                $table->id();
                $table->string('sku')->index();
                // привязка к SKU
                $table->enum('type', ['percent', 'fixed'])->default('percent'); $table->decimal('value', 10, 2)->default(0);
                // процент (например 15.00) или фиксированная сумма
                $table->string('currency')->nullable();
                // опционально для fixed
                $table->boolean('active')->default(true);
                $table->timestamp('starts_at')->nullable();
                $table->timestamp('ends_at')->nullable();
                $table->text('note')->nullable();
                $table->timestamps();
                $table->index(['sku', 'active']);

            });
        }

        public function down(): void
        {
            Schema::dropIfExists('discounts');

        }
};
