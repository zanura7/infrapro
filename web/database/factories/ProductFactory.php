<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = $this->faker->words(3, true);

        return [
            'user_id' => User::factory(),
            'name' => ucwords($name),
            'slug' => Str::slug($name) . '-' . $this->faker->unique()->numerify('###'),
            'sku' => strtoupper($this->faker->bothify('??###-###')),
            'category' => $this->faker->randomElement([
                'Personal Care · Skincare',
                'Food · Health',
                'Fashion · Modest',
                'Health · Supplement',
                'Home · Lifestyle',
            ]),
            'price' => $this->faker->randomFloat(2, 10, 500),
            'currency' => 'MYR',
            'description' => $this->faker->paragraph(),
            'usp' => $this->faker->randomElements(
                ['100% natural', 'halal-certified', 'cruelty-free', 'premium quality', 'locally sourced'],
                3,
            ),
            'target_audience' => $this->faker->sentence(5),
            'pain_point' => $this->faker->sentence(10),
            'brand_voice' => [
                'tone' => ['Warm', 'Trustworthy'],
                'formality' => 40,
                'dos' => ['Be empathetic', 'Highlight benefits'],
                'donts' => ['Avoid exaggerated claims'],
            ],
            'current_version' => 1,
            'archived_at' => null,
        ];
    }
}
