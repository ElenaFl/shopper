<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

/**
 * Class IncrementPostViews
 *
 * Увеличивает поле views в таблице products для заданного productId posts
 */


class IncrementProductViews implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $productId;

    public function __construct(int $productId)
    {
        $this->productId = $productId;
    }

    public function handle(): void
    {
        DB::table('products')->where('id', $this->productId)->increment('views');
    }
}
