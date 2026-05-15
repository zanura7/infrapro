<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductAsset;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductAsset>
 */
class ProductAssetFactory extends Factory
{
    protected $model = ProductAsset::class;

    public function definition(): array
    {
        $type = $this->faker->randomElement(['image', 'logo', 'document']);

        return [
            'product_id' => Product::factory(),
            'uploaded_by' => User::factory(),
            'type' => $type,
            'disk' => 'local',
            'path' => 'products/' . $this->faker->uuid() . '.' . ($type === 'document' ? 'pdf' : 'jpg'),
            'thumbnail_path' => $type === 'image'
                ? 'products/thumbs/' . $this->faker->uuid() . '.jpg'
                : null,
            'mime' => match ($type) {
                'image', 'logo' => 'image/jpeg',
                'document' => 'application/pdf',
                default => 'application/octet-stream',
            },
            'size' => $this->faker->numberBetween(50_000, 5_000_000),
            'width' => $type !== 'document' ? $this->faker->randomElement([800, 1200, 1920]) : null,
            'height' => $type !== 'document' ? $this->faker->randomElement([600, 800, 1080]) : null,
            'duration_ms' => null,
            'tag' => $this->faker->optional()->word(),
            'meta' => null,
        ];
    }
}
