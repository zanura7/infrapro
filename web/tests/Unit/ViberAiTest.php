<?php

namespace Tests\Unit;

use App\Services\Ai\ViberAi;
use PHPUnit\Framework\TestCase;

class ViberAiTest extends TestCase
{
    public function test_extracts_json_with_think_tags_and_markdown(): void
    {
        // Use Reflection to access private extractJson method
        $viberAi = new ViberAi('dummy-key', 'https://dummy.url', []);
        $reflection = new \ReflectionClass(ViberAi::class);
        $method = $reflection->getMethod('extractJson');
        $method->setAccessible(true);

        $rawResponse = <<<EOT
<think>
This is the model thinking process.
I will structure the JSON now.
</think>
Here is the JSON you requested:
```json
{
  "product": {
    "name": "Test Product",
    "category": "Test Category",
    "description": "Test description",
    "key_features": ["Feature 1"]
  },
  "audience": {
    "primary": "Test audience",
    "psychographics": "Test psychographics",
    "pain_points": ["Pain 1"]
  },
  "strategy": {
    "angle": "trust",
    "rationale": "Because."
  },
  "format": {
    "type": "short_video",
    "aspect_ratio": "9:16",
    "rationale": "Because."
  },
  "hook": "Buy now",
  "cta": "Click here",
  "scenes": []
}
```
EOT;

        $extracted = $method->invoke($viberAi, $rawResponse);
        
        $data = json_decode($extracted, true);
        
        $this->assertIsArray($data);
        $this->assertEquals('Test Product', $data['product']['name']);
        $this->assertStringNotContainsString('<think>', $extracted);
        $this->assertStringNotContainsString('Here is the JSON you requested:', $extracted);
    }
    
    public function test_extracts_json_without_fences(): void
    {
        $viberAi = new ViberAi('dummy-key', 'https://dummy.url', []);
        $reflection = new \ReflectionClass(ViberAi::class);
        $method = $reflection->getMethod('extractJson');
        $method->setAccessible(true);

        $rawResponse = <<<EOT
<think>Thinking...</think>
{
  "simple": "json"
}
EOT;

        $extracted = $method->invoke($viberAi, $rawResponse);
        $data = json_decode($extracted, true);
        
        $this->assertIsArray($data);
        $this->assertEquals('json', $data['simple']);
    }
}
