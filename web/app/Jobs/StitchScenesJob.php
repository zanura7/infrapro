<?php

namespace App\Jobs;

use App\Models\ContentJob;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

class StitchScenesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 300;

    public function __construct(public readonly int $contentJobId) {}

    public function handle(): void
    {
        $job = ContentJob::find($this->contentJobId);
        if (! $job) return;

        $job->markRunning();
        $input = (array) $job->input;
        $clipUrls = $input['clip_urls'] ?? [];

        if (count($clipUrls) < 2) {
            $job->markFailed('Need at least 2 clips to stitch.');
            return;
        }

        $workDir = storage_path('app/temp/stitch-' . uniqid());
        @mkdir($workDir, 0755, true);

        try {
            // Download each clip to local temp
            $localPaths = [];
            foreach ($clipUrls as $i => $url) {
                $bytes = $this->downloadClip($url);
                $local = $workDir . '/clip_' . str_pad((string) $i, 2, '0', STR_PAD_LEFT) . '.mp4';
                file_put_contents($local, $bytes);
                $localPaths[] = $local;
            }

            // Build concat list file
            $listFile = $workDir . '/list.txt';
            $listContent = '';
            foreach ($localPaths as $p) {
                $listContent .= "file '" . str_replace("'", "'\\''", $p) . "'\n";
            }
            file_put_contents($listFile, $listContent);

            $outFile = $workDir . '/stitched.mp4';

            // Try fast path first (concat demuxer with -c copy) — only works if all clips share codec/dims.
            // Falls back to re-encode if it fails.
            $fast = new Process([
                'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
                '-i', $listFile, '-c', 'copy', $outFile,
            ]);
            $fast->setTimeout(180);
            $fast->run();

            if (! $fast->isSuccessful() || ! file_exists($outFile) || filesize($outFile) < 1024) {
                // Fallback: re-encode (slower but tolerant of mixed codec/dim)
                Log::info('stitch.fallback_reencode', [
                    'job' => $job->id,
                    'fast_err' => mb_substr($fast->getErrorOutput(), 0, 300),
                ]);
                @unlink($outFile);

                $reencode = new Process([
                    'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
                    '-i', $listFile,
                    '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
                    '-r', '30',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
                    '-c:a', 'aac', '-b:a', '128k',
                    '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart',
                    $outFile,
                ]);
                $reencode->setTimeout(240);
                $reencode->run();

                if (! $reencode->isSuccessful() || ! file_exists($outFile) || filesize($outFile) < 1024) {
                    throw new \RuntimeException(
                        'ffmpeg stitch failed: ' . mb_substr($reencode->getErrorOutput(), 0, 500)
                    );
                }
            }

            // Move final to public disk
            $name = sprintf('products/%d/stitched-%s.mp4', $job->product_id, uniqid());
            Storage::disk('public')->put($name, file_get_contents($outFile));
            $publicUrl = Storage::disk('public')->url($name);

            $job->markSucceeded([
                'url'   => $publicUrl,
                'path'  => $name,
                'clips' => count($clipUrls),
            ]);
        } catch (\Throwable $e) {
            Log::error('studio.stitch_failed', ['error' => $e->getMessage(), 'job' => $job->id]);
            $job->markFailed($e->getMessage());
        } finally {
            $this->cleanup($workDir);
        }
    }

    private function downloadClip(string $url): string
    {
        // Local /storage/... URL — read direct from disk
        $path = parse_url($url, PHP_URL_PATH);
        $storagePrefix = '/storage/';
        if ($path && str_starts_with($path, $storagePrefix)) {
            $relative = substr($path, strlen($storagePrefix));
            return Storage::disk('public')->get($relative);
        }
        $response = \Illuminate\Support\Facades\Http::timeout(60)->get($url);
        if (!$response->successful()) {
            throw new \RuntimeException("Cannot download clip: {$url}");
        }
        return $response->body();
    }

    private function cleanup(string $dir): void
    {
        if (! is_dir($dir)) return;
        foreach (glob($dir . '/*') as $f) {
            @unlink($f);
        }
        @rmdir($dir);
    }
}
