<?php

namespace App\Jobs;

use App\Models\ContentJob;
use App\Services\Contracts\AiProviderInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Generate video script: calls AI to produce scene breakdown (JSON array),
 * then creates child GenerateSceneVideoJob for each scene.
 */
class GenerateVideoScriptJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 120;

    public function __construct(public readonly int $contentJobId) {}

    public function handle(AiProviderInterface $ai): void
    {
        $job = ContentJob::find($this->contentJobId);
        if (! $job) {
            return;
        }

        $job->markRunning();
        $input = (array) $job->input;

        try {
            // Build prompt for scene breakdown
            $prompt = $this->buildSceneBreakdownPrompt($input);

            // Call AI to generate JSON array of scene prompts
            $response = $ai->chat($prompt);

            // Parse JSON response
            $sceneData = $this->parseSceneBreakdown($response);

            if (empty($sceneData)) {
                throw new \RuntimeException('AI returned empty scene breakdown.');
            }

            // Create child jobs for each scene
            $childJobIds = [];
            foreach ($sceneData as $index => $scene) {
                $childJob = ContentJob::create([
                    'product_id' => $job->product_id,
                    'user_id' => $job->user_id,
                    'parent_id' => $job->id,
                    'kind' => 'video',
                    'status' => 'queued',
                    'model' => config('services.viber.models.video'),
                    'input' => [
                        'scene_index' => $index + 1,
                        'total_scenes' => count($sceneData),
                        'prompt' => $scene['prompt'] ?? '',
                        'voiceover_script' => $scene['voiceover_script'] ?? null,
                        'approved_image' => $scene['approved_image'] ?? ($input['approved_image'] ?? null),
                        'aspect_ratio' => $input['aspect_ratio'] ?? '9:16',
                        'clip_seconds' => $input['clip_seconds'] ?? 6,
                    ],
                ]);

                GenerateSceneVideoJob::dispatch($childJob->id);
                $childJobIds[] = $childJob->id;
            }

            $job->markSucceeded([
                'scene_count' => count($sceneData),
                'child_job_ids' => $childJobIds,
                'scenes' => $sceneData,
            ]);
        } catch (\Throwable $e) {
            Log::error('studio.video_script_failed', ['error' => $e->getMessage(), 'job' => $job->id]);
            $job->markFailed($e->getMessage());
        }
    }

    private function buildSceneBreakdownPrompt(array $input): string
    {
        $sceneCount = $input['scene_count'] ?? 5;
        $clipSeconds = $input['clip_seconds'] ?? 6;
        $productContext = $input['product_context'] ?? '';

        return <<<PROMPT
You are a video script writer. Generate a {$sceneCount}-scene video script breakdown as a JSON array.

Product context:
{$productContext}

Each scene should be {$clipSeconds} seconds long.

Return ONLY a JSON array with this structure:
[
  {
    "prompt": "Scene 1 video generation prompt",
    "voiceover_script": "What the person says in this scene"
  },
  {
    "prompt": "Scene 2 video generation prompt",
    "voiceover_script": "What the person says in this scene"
  }
]

Return ONLY the JSON array, no markdown fences, no extra text.
PROMPT;
    }

    private function parseSceneBreakdown(string $response): array
    {
        $cleaned = trim($response);

        // Strip markdown fences
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $cleaned, $m)) {
            $cleaned = trim($m[1]);
        }

        // Trim to outermost [ ... ]
        $first = strpos($cleaned, '[');
        $last = strrpos($cleaned, ']');
        if ($first !== false && $last !== false && $last > $first) {
            $cleaned = substr($cleaned, $first, $last - $first + 1);
        }

        $data = json_decode($cleaned, true);
        if (! is_array($data)) {
            throw new \RuntimeException('AI response is not valid JSON array.');
        }

        return $data;
    }
}
