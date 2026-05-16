<?php

use App\Services\Ai\ViberAi;
use App\Services\Contracts\AiProviderInterface;
use App\Services\Contracts\ImageProviderInterface;

test('AiProviderInterface resolves to ViberAi instance', function () {
    $instance = app(AiProviderInterface::class);

    expect($instance)->toBeInstanceOf(ViberAi::class);
});

test('ImageProviderInterface resolves to ViberAi instance', function () {
    $instance = app(ImageProviderInterface::class);

    expect($instance)->toBeInstanceOf(ViberAi::class);
});
