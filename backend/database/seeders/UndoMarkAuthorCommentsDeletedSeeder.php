<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class UndoMarkAuthorCommentsDeletedSeeder extends Seeder
{
    public function run(): void
    {
        $authorId = 3; // <- замените на нужный user_id

        $hasDeletedBy = Schema::hasColumn('comments', 'deleted_by');

        $update = ['is_deleted' => 0, 'deleted_at' => null];
        if ($hasDeletedBy) {
            $update['deleted_by'] = null;
        }

        $count = DB::table('comments')->where('user_id', $authorId)->count();
        $this->command->info("Comments to restore for user_id={$authorId}: {$count}");

        if ($count === 0) {
            $this->command->info("Nothing to do.");
            return;
        }

        DB::table('comments')->where('user_id', $authorId)->update($update);

        $this->command->info("Restored {$count} comments for user_id={$authorId}.");
    }
}
