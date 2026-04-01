<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            // add flag for logical deletion
            if (! Schema::hasColumn('comments', 'is_deleted')) {
                $table->boolean('is_deleted')->default(false)->after('body');
            }

            // store when it was marked deleted
            if (! Schema::hasColumn('comments', 'deleted_at')) {
                $table->timestamp('deleted_at')->nullable()->after('is_deleted');
            }

            // who deleted it (optional)
            if (! Schema::hasColumn('comments', 'deleted_by')) {
                $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->after('deleted_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            if (Schema::hasColumn('comments', 'deleted_by')) {
                $table->dropForeign(['deleted_by']);
                $table->dropColumn('deleted_by');
            }
            if (Schema::hasColumn('comments', 'deleted_at')) {
                $table->dropColumn('deleted_at');
            }
            if (Schema::hasColumn('comments', 'is_deleted')) {
                $table->dropColumn('is_deleted');
            }
        });
    }
};
