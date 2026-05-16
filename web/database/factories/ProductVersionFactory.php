<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductVersion>
 */
class ProductVersionFactory extends Factory
{
    protected $model = ProductVersion::class;

    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'user_id' => User::factory(),
            'version' => 1,
            'snapshot' => [
                'name' => $this->faker->words(3, true),
                'description' => $this->faker->paragraph(),
                'category' => 'Personal Care · Skincare',
                'price' => $this->faker->randomFloat(2, 10, 500),
            ],
            'change_summary' => 'Initial version',
            'diff' => null,
        ];
    }
}
