<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Carbon\Carbon;
use DB;

class BlogSeeder extends Seeder
{
    public function run()
    {
        $postsData = [
            [
                'title' => 'Top Trends From Spring',
                'slug' => 'top-trends-from-spring',
                'excerpt' => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
                'body' => 'Full post body for Top Trends From Spring. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum.',
                'img' => 'images/blog12.jpg',
                'published_at' => Carbon::now()->subDays(10),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'How to Style Your Summer Wardrobe',
                'slug' => 'how-to-style-your-summer-wardrobe',
                'excerpt' => 'Short tips about summer wardrobe...',
                'body' => 'Full post body for How to Style Your Summer Wardrobe. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.',
                'img' => 'images/blog02.jpg',
                'published_at' => Carbon::now()->subDays(8),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Accessory Guide 2026',
                'slug' => 'accessory-guide-2026',
                'excerpt' => 'Best accessories to pair with your outfit...',
                'body' => 'Full post body for Accessory Guide 2026. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum.',
                'img' => 'images/blog03.jpg',
                'published_at' => Carbon::now()->subDays(6),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Sustainable Fashion: What You Need to Know',
                'slug' => 'sustainable-fashion-what-you-need-to-know',
                'excerpt' => 'Eco-friendly choices for modern wardrobes...',
                'body' => 'Full post body for Sustainable Fashion. Cras mattis consectetur purus sit amet fermentum.',
                'img' => 'images/blog15.jpg',
                'published_at' => Carbon::now()->subDays(4),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // If you want to avoid duplicates by slug, you can upsert:
        foreach ($postsData as $p) {
            DB::table('posts')->updateOrInsert(
                ['slug' => $p['slug']],
                $p
            );
        }
    }
}
