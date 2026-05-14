<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductVersion;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@bedaie.id'],
            [
                'name' => 'Bedaie IT',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]
        );

        $this->seedSihate($admin);
        $this->seedOtherProducts($admin);
        $this->call(StudioTemplateSeeder::class);
    }

    private function seedSihate(User $owner): void
    {
        $product = Product::firstOrCreate(
            ['slug' => 'sihate-olive-soap'],
            [
                'user_id' => $owner->id,
                'name' => 'Sihaté Olive Soap',
                'sku' => 'SHTOS-001',
                'category' => 'Personal Care · Skincare',
                'price' => 25.00,
                'currency' => 'MYR',
                'description' => 'Cold-pressed olive oil soap formulated for sensitive skin. Free from harsh sulfates, parabens, and synthetic fragrances. Halal-certified by JAKIM.',
                'usp' => ['100% natural', 'halal-certified', 'sensitive-skin friendly', 'cruelty-free'],
                'target_audience' => 'Women 25–45 · urban · sensitive skin · halal-conscious',
                'pain_point' => 'Sensitive skin reacts badly to commercial soaps loaded with sulfates and synthetic fragrances.',
                'brand_voice' => [
                    'tone' => ['Warm', 'Caring', 'Trustworthy'],
                    'formality' => 35,
                    'dos' => [
                        'Lead with empathy for sensitive-skin pain',
                        'Always mention halal certification',
                        'Use real customer testimonials with names',
                    ],
                    'donts' => [
                        'Never claim medical benefits (cure / treat)',
                        "Don't name competitor brands directly",
                        'Avoid superlatives without proof ("best," "#1")',
                    ],
                    'samples' => [
                        '"Untuk kulit sensitif, kena pilih yang lembut. Sihaté guna minyak zaitun gred terbaik — no harsh chemicals."',
                    ],
                ],
                'current_version' => 1,
            ]
        );

        ProductVersion::firstOrCreate(
            ['product_id' => $product->id, 'version' => 1],
            [
                'user_id' => $owner->id,
                'snapshot' => $product->only([
                    'name', 'sku', 'category', 'price', 'currency',
                    'description', 'usp', 'target_audience',
                    'pain_point', 'brand_voice',
                ]),
                'change_summary' => 'Initial version',
            ]
        );
    }

    private function seedOtherProducts(User $owner): void
    {
        $extras = [
            [
                'name' => 'Madu Bedaie',
                'category' => 'Food · Health',
                'price' => 45.00,
                'description' => 'Raw forest honey, single-origin.',
                'usp' => ['100% raw', 'single-origin', 'unfiltered'],
                'target_audience' => 'Health-conscious families',
            ],
            [
                'name' => 'Tudung Klasik',
                'category' => 'Fashion · Modest',
                'price' => 89.00,
                'description' => 'Classic modest hijab, premium chiffon.',
                'usp' => ['Premium chiffon', 'lightweight', 'wrinkle-resistant'],
                'target_audience' => 'Muslimah 20–40 · office workers',
            ],
            [
                'name' => 'Bedaie Vitamin C',
                'category' => 'Health · Supplement',
                'price' => 120.00,
                'description' => 'High-potency Vitamin C with rose hips.',
                'usp' => ['1000mg per serving', 'with rose hips', 'sugar-free'],
                'target_audience' => 'Adults 25–55 · immune-conscious',
            ],
        ];

        foreach ($extras as $data) {
            Product::firstOrCreate(
                ['slug' => \Illuminate\Support\Str::slug($data['name'])],
                array_merge($data, [
                    'user_id' => $owner->id,
                    'currency' => 'MYR',
                    'current_version' => 1,
                ])
            );
        }
    }
}
