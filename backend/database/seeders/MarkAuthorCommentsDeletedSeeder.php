<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MarkAuthorCommentsDeletedSeeder extends Seeder
{
    public function run(): void
    {
        // Замените на ID автора блога, комментарии которого нужно пометить как удалённые
        $authorId = 3;

        // Для безопасности, сначала выведем сколько записей будет затронуто (опционально)
        $count = DB::table('comments')->where('user_id', $authorId)->count();
        $this->command->info("Comments to mark as deleted for user_id={$authorId}: {$count}");

        if ($count === 0) {
            $this->command->info("Nothing to do.");
            return;
        }

        DB::table('comments')
            ->where('user_id', $authorId)
            ->update([
                'is_deleted' => true,
                'deleted_at' => Carbon::now(),
                'deleted_by' => $authorId,
            ]);

        $this->command->info("Marked {$count} comments as deleted for user_id={$authorId}.");
    }
}
