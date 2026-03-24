<?php
 use Illuminate\Database\Migrations\Migration;
 use Illuminate\Database\Schema\Blueprint;
 use Illuminate\Support\Facades\DB;
 use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void {
        // 1) Добавляем новую колонку dimensions, если её ещё нет
        Schema::table('products', function (Blueprint $table) { if (! Schema::hasColumn('products', 'dimensions')) { $table->string('dimensions')->nullable()->after('weight'); } });
        // 2) Копируем данные из старой колонки dimentions (если она есть)
        if (Schema::hasColumn('products', 'dimentions')) { DB::table('products')->whereNotNull('dimentions')->update([ 'dimensions' => DB::raw('dimentions') ]); }
        // 3) Удаляем старую колонку dimentions
        Schema::table('products', function (Blueprint $table) { if (Schema::hasColumn('products', 'dimentions')) { $table->dropColumn('dimentions'); } }); } public function down(): void {
        // 1) Восстанавливаем старую колонку dimentions, если её нет
        Schema::table('products', function (Blueprint $table) { if (! Schema::hasColumn('products', 'dimentions')) { $table->string('dimentions')->nullable()->after('weight'); } });
        // 2) Копируем данные обратно из dimensions в dimentions
        if (Schema::hasColumn('products', 'dimensions')) { DB::table('products')->whereNotNull('dimensions')->update([ 'dimentions' => DB::raw('dimensions') ]); }
        // 3) Удаляем новую колонку dimensions
        Schema::table('products', function (Blueprint $table) { if (Schema::hasColumn('products', 'dimensions')) { $table->dropColumn('dimensions'); }
    });}
};
