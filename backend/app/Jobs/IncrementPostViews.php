<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Psr\Log\LoggerInterface;

class IncrementPostViews implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $postId;

    public function __construct(int $postId)
    {
        $this->postId = $postId;
    }

    public function handle(): void
    {
        // атомарный инкремент
        DB::table('posts')->where('id', $this->postId)->increment('views');
    }
}
