<?php

namespace App\Jobs;

use App\Models\Product;
use App\Services\Contracts\AiProviderInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateProductStrategyJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Product $product,
    ) {}

    public function handle(AiProviderInterface $ai): void
    {
        $prompt = $this->buildPrompt($this->product);

        try {
            $response = $ai->chat($prompt);
            $strategy = $this->parseResponse($response);

            $this->product->update(['strategy' => $strategy]);

            Log::info('product.strategy.generated', [
                'product_id' => $this->product->id,
                'strategy_keys' => array_keys($strategy),
            ]);
        } catch (\Exception $e) {
            Log::error('product.strategy.failed', [
                'product_id' => $this->product->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    private function buildPrompt(Product $product): string
    {
        $context = [];
        $context[] = "Product Name: {$product->name}";
        if ($product->description) {
            $context[] = "Description: {$product->description}";
        }
        if ($product->category) {
            $context[] = "Category: {$product->category}";
        }
        if ($product->price) {
            $context[] = "Price: {$product->currency} {$product->price}";
        }
        if ($product->usp) {
            $context[] = "USP: " . implode(', ', $product->usp);
        }
        if ($product->target_audience) {
            $context[] = "Target Audience: {$product->target_audience}";
        }
        if ($product->pain_point) {
            $context[] = "Pain Point: {$product->pain_point}";
        }

        $productInfo = implode("\n", $context);

        return <<<PROMPT
Analyze this product and create a content strategy. Return ONLY valid JSON with this structure:

{
  "value_proposition": "Core value proposition in one sentence",
  "personas": [
    {"name": "Persona 1", "description": "Brief description"},
    {"name": "Persona 2", "description": "Brief description"},
    {"name": "Persona 3", "description": "Brief description"}
  ],
  "selling_points": [
    "Selling point 1",
    "Selling point 2",
    "Selling point 3",
    "Selling point 4",
    "Selling point 5"
  ],
  "hashtags": [
    "#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5",
    "#hashtag6", "#hashtag7", "#hashtag8", "#hashtag9", "#hashtag10"
  ],
  "tone_of_voice": "Suggested tone (e.g., professional, casual, enthusiastic)"
}

Product:
{$productInfo}
PROMPT;
    }

    private function parseResponse(string $response): array
    {
        $cleaned = trim($response);

        // Strip markdown fences
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $cleaned, $m)) {
            $cleaned = trim($m[1]);
        }

        // Extract outermost JSON object
        $first = strpos($cleaned, '{');
        $last = strrpos($cleaned, '}');
        if ($first !== false && $last !== false && $last > $first) {
            $cleaned = substr($cleaned, $first, $last - $first + 1);
        }

        $data = json_decode($cleaned, true);
        if (!is_array($data)) {
            throw new \RuntimeException('AI response is not valid JSON.');
        }

        return $data;
    }
}
