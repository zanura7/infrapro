<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Viber AI — OpenAI-compatible proxy used for strategy / image / video gen.
    'viber' => [
        'key' => env('VIBER_API_KEY'),
        'base_url' => env('AI_BASE_URL', 'https://gstd.viber.id/v1'),
        'models' => [
            'text' => env('AI_TEXT_MODEL', 'grok-4.20-beta'),
            'image' => env('AI_IMAGE_MODEL', 'grok-imagine-1.0'),
            'video' => env('AI_VIDEO_MODEL', 'grok-imagine-1.0-video'),
        ],
    ],

    // Social OAuth providers for auto-posting integrations.
    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('FACEBOOK_REDIRECT_URI', '/integrations/meta/callback'),
    ],

    'tiktok' => [
        'client_id' => env('TIKTOK_CLIENT_ID'),
        'client_secret' => env('TIKTOK_CLIENT_SECRET'),
        'redirect' => env('TIKTOK_REDIRECT_URI', '/integrations/tiktok/callback'),
    ],

    '9router' => [
        'api_key' => env('NINEROUTER_API_KEY'),
        'base_url' => env('NINEROUTER_BASE_URL', 'https://router.viber.id/v1'),
        'model' => env('NINEROUTER_MODEL', 'grok-2-1212'),
    ],

    'ai_provider' => env('AI_PROVIDER', 'viber'),
];
