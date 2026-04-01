<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DeleteAuthorCommentsSeeder extends Seeder
{
    public function run(): void
    {
        $authorId = 3;

        $count = DB::table('comments')->where('user_id', $authorId)->count();
        $this->command->info("Deleting {$count} comments for user_id={$authorId}");

        DB::table('comments')->where('user_id', $authorId)->delete();

        $this->command->info("Deleted {$count} comments for user_id={$authorId}");
    }
}
