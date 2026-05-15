<?php

namespace Database\Factories;

use App\Models\ContentJob;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContentJob>
 */
class ContentJobFactory extends Factory
{
    protected $model = ContentJob::class;

    public function definition(): array
    {
        $status = $this->faker->randomElement(['queued', 'running', 'succeeded', 'failed']);
        $startedAt = in_array($status, ['running', 'succeeded', 'failed'])
            ? $this->faker->dateTimeBetween('-1 hour', 'now')
            : null;
        $finishedAt = in_array($status, ['succeeded', 'failed']) ? $this->faker->dateTimeBetween($startedAt, 'now') : null;

        return [
            'product_id' => Product::factory(),
            'user_id' => User::factory(),
            'kind' => $this->faker->randomElement(['strategy', 'poster', 'video', 'salespage']),
            'status' => $status,
            'model' => $this->faker->randomElement(['gpt-4o', 'claude-3-5-sonnet', null]),
            'input' => ['prompt' => $this->faker->sentence()],
            'output' => $status === 'succeeded'
                ? ['url' => 'https://example.com/' . $this->faker->slug()]
                : null,
            'error' => $status === 'failed'
                ? ['message' => $this->faker->sentence()]
                : null,
            'cost' => $status === 'succeeded' ? $this->faker->randomFloat(4, 0.001, 0.5) : 0,
            'duration_ms' => $finishedAt && $startedAt
                ? (int) (($finishedAt->getTimestamp() - $startedAt->getTimestamp()) * 1000)
                : null,
            'started_at' => $startedAt,
            'finished_at' => $finishedAt,
        ];
    }

    public function queued(): static
    {
        return $this->state(['status' => 'queued', 'started_at' => null, 'finished_at' => null]);
    }

    public function succeeded(): static
    {
        return $this->state(fn () => [
            'status' => 'succeeded',
            'started_at' => now()->subSeconds(10),
            'finished_at' => now(),
            'output' => ['url' => 'https://example.com/' . fake()->slug()],
        ]);
    }
}
