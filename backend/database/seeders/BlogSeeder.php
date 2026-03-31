<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Tag;
use Carbon\Carbon;

class BlogSeeder extends Seeder
{
    public function run()
    {
        // 1) Найдём или создадим автора
        $authorEmail = 'blog@local';
        $author = DB::table('users')->where('email', $authorEmail)->first();

        if (! $author) {
            $authorId = DB::table('users')->insertGetId([
                'name' => 'Blog Author',
                'email' => $authorEmail,
                'password' => Hash::make('secret123'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $authorId = $author->id;
        }

        // 2) Создаём теги
        $tagNames = ['Fashion', 'Style', 'Summer', 'Accessories', 'Sustainable'];
        $tags = [];
        foreach ($tagNames as $name) {
            $slug = Str::slug($name);
            $t = Tag::firstOrCreate(['slug' => $slug], ['name' => $name, 'slug' => $slug]);
            $tags[$slug] = $t->id;
        }

        // 3) Посты и какие теги привязать
        $postsData = [
            [
                'title' => 'Top Trends From Spring',
                'slug' => 'top-trends-from-spring',
                'excerpt' => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
                'body' => 'Full post body for Top Trends From Spring. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum.',
                'img' => 'images/blog12.jpg',
                'published_at' => Carbon::now()->subDays(10),
                'author_id' => $authorId,
                'tags' => ['fashion','style'],
            ],
            [
                'title' => 'How to Style Your Summer Wardrobe',
                'slug' => 'how-to-style-your-summer-wardrobe',
                'excerpt' => 'Short tips about summer wardrobe...',
                'body' => 'Full post body for How to Style Your Summer Wardrobe. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.',
                'img' => 'images/blog02.jpg',
                'published_at' => Carbon::now()->subDays(8),
                'author_id' => $authorId,
                'tags' => ['style','summer'],
            ],
            [
                'title' => 'Accessory Guide 2026',
                'slug' => 'accessory-guide-2026',
                'excerpt' => 'Best accessories to pair with your outfit...',
                'body' => 'Full post body for Accessory Guide 2026. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum.',
                'img' => 'images/blog03.jpg',
                'published_at' => Carbon::now()->subDays(6),
                'author_id' => $authorId,
                'tags' => ['accessories','fashion'],
            ],
            [
                'title' => 'Sustainable Fashion: What You Need to Know',
                'slug' => 'sustainable-fashion-what-you-need-to-know',
                'excerpt' => 'Eco-friendly choices for modern wardrobes...',
                'body' => 'Full post body for Sustainable Fashion. Cras mattis consectetur purus sit amet fermentum.',
                'img' => 'images/blog15.jpg',
                'published_at' => Carbon::now()->subDays(4),
                'author_id' => $authorId,
                'tags' => ['sustainable','fashion'],
            ],
        ];

        // 4) Вставка/обновление постов и привязка тегов
        foreach ($postsData as $p) {
            $tagsForPost = $p['tags'] ?? [];
            unset($p['tags']);

            DB::table('posts')->updateOrInsert(
                ['slug' => $p['slug']],
                array_merge($p, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );

            // Получим id поста
            $postId = DB::table('posts')->where('slug', $p['slug'])->value('id');

            if ($postId && !empty($tagsForPost)) {
                // sync pivot manually (DB) to avoid model dependency
                DB::table('post_tag')->where('post_id', $postId)->delete();
                foreach ($tagsForPost as $tslug) {
                    if (isset($tags[$tslug])) {
                        DB::table('post_tag')->insertOrIgnore([
                            'post_id' => $postId,
                            'tag_id' => $tags[$tslug],
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }

        // 5) Тестовые комментарии
        // Используем существующего автора как комментатора
        $post1 = DB::table('posts')->where('slug', 'top-trends-from-spring')->first();
        $post2 = DB::table('posts')->where('slug', 'how-to-style-your-summer-wardrobe')->first();

        if ($post1) {
            DB::table('comments')->insertOrIgnore([
                'post_id' => $post1->id,
                'user_id' => $authorId,
                'body' => 'Great tips — loved the spring trends!',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if ($post2) {
            DB::table('comments')->insertOrIgnore([
                'post_id' => $post2->id,
                'user_id' => $authorId,
                'body' => 'Nice ideas for summer outfits — thanks for sharing.',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }


    }
}

