<?php

namespace Database\Seeders;

use App\Models\PosterTemplate;
use Illuminate\Database\Seeder;

class PosterTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'slug' => 'premium-clean-saas',
                'name' => 'Premium Clean SaaS',
                'description' => 'Modern premium, clean luxury aesthetic. Visual seperti campaign Apple / Stripe / Notion. Cocok untuk produk premium yang ingin terlihat trustworthy & high-end.',
                'prompt_template' => <<<'TXT'
Buat desain banner promosi Instagram ukuran 1080x1350 untuk produk [NAMA PRODUK].
Style:
* modern premium
* clean luxury aesthetic
* high-end startup branding
* visual seperti campaign Apple + Stripe + Notion
* fokus pada produk sebagai hero
* gunakan pencahayaan soft cinematic
* background minimalis dengan depth dan gradient elegan
* typography bold modern sans serif
* layout rapi dan whitespace lega
* warna utama mengikuti warna produk
Komposisi:
* produk berada di center
* headline besar dan tajam
* subheadline singkat dan persuasive
* tambahkan CTA button modern
* tambahkan elemen glassmorphism tipis
* tambahkan shadow realistis dan reflection lembut
Tulisan:
Headline: "[HEADLINE BESAR]"
Subheadline: "[SUBTITLE PENJUALAN]"
CTA: "[CTA]"
Mood:
professional, trustworthy, expensive, conversion-focused, scroll-stopping
TXT,
                'negative_prompt' => 'low quality, blurry text, cluttered design, bad typography, watermark, distorted product, amateur layout, oversaturated, low resolution',
                'fields' => [
                    ['key' => 'headline',    'token' => '[HEADLINE BESAR]',     'label' => 'Headline besar',       'required' => true,  'placeholder' => 'e.g. Kulit Sehat Tanpa Drama'],
                    ['key' => 'subheadline', 'token' => '[SUBTITLE PENJUALAN]', 'label' => 'Subtitle penjualan',   'required' => true,  'placeholder' => 'e.g. Formula natural untuk kulit sensitif'],
                    ['key' => 'cta',         'token' => '[CTA]',                'label' => 'Call to action',       'required' => true,  'placeholder' => 'e.g. Coba Sekarang'],
                ],
                'sort_order' => 10,
            ],
            [
                'slug' => 'flash-sale-aggressive',
                'name' => 'Flash Sale — Aggressive Conversion',
                'description' => 'Hyper-professional Instagram banner untuk high conversion & impulse buy. Bold visual hierarchy, glow & motion blur. Cocok untuk diskon, flash sale, promo terbatas.',
                'prompt_template' => <<<'TXT'
Create a hyper-professional Instagram promotional banner for [PRODUCT NAME], optimized for high conversion and impulse buying.
Canvas:
1080x1350 portrait Instagram post.
Visual Direction:
* premium ecommerce advertising
* bold visual hierarchy
* dramatic lighting
* modern digital marketing aesthetic
* luxury cyber commerce style
* vibrant but controlled colors
* highly polished product render
* energetic composition
Design Elements:
* huge discount badge
* glowing accents
* motion blur streaks
* floating particles
* dynamic depth
* layered composition
* premium UI-inspired elements
Text:
Headline: "[DISKON / PROMO]"
Offer text: "[DETAIL PROMO]"
CTA: "Order Sekarang"
Style Inspiration:
Nike campaign ads, modern Tokopedia premium ads, high-end ecommerce campaigns.
Important:
text must be readable, balanced composition, highly professional, realistic product proportions, Instagram-ready, viral ad quality.
TXT,
                'negative_prompt' => 'cheap design, unreadable typography, messy layout, fake shadows, blurry image, extra fingers, distorted packaging',
                'fields' => [
                    ['key' => 'headline',    'token' => '[DISKON / PROMO]', 'label' => 'Diskon / promo headline', 'required' => true, 'placeholder' => 'e.g. DISKON 50% HARI INI'],
                    ['key' => 'subheadline', 'token' => '[DETAIL PROMO]',   'label' => 'Detail promo',            'required' => true, 'placeholder' => 'e.g. Berlaku sampai stock habis. Free shipping nasional.'],
                ],
                'sort_order' => 20,
            ],
            [
                'slug' => 'elegant-herbal-skincare',
                'name' => 'Elegant Herbal / Skincare',
                'description' => 'Natural luxury branding, elegant botanical aesthetic. Magazine-quality advertising. Cocok untuk skincare, herbal, beauty products.',
                'prompt_template' => <<<'TXT'
Generate an ultra realistic Instagram promotional banner for a premium herbal/skincare product called [NAMA PRODUK].
Visual Style:
* natural luxury branding
* elegant botanical aesthetic
* clean beauty commercial photography
* magazine-quality advertising
* warm natural lighting
* cinematic macro details
* fresh organic atmosphere
Scene:
* product displayed on elegant stone or glass platform
* subtle leaves, water splash, or herbs around product
* soft shadows and premium reflections
* creamy gradient background
* realistic depth of field
Typography:
minimal and elegant
high-fashion cosmetic branding style
Text:
Headline: "[MANFAAT UTAMA]"
Subheadline: "[VALUE PROPOSITION]"
CTA: "Coba Sekarang"
Mood:
premium, healthy, trusted, luxurious, calming, modern
TXT,
                'negative_prompt' => 'fake skin texture, cheap packaging, cluttered composition, low-end ecommerce look, blurry text, unrealistic lighting',
                'fields' => [
                    ['key' => 'headline',    'token' => '[MANFAAT UTAMA]',      'label' => 'Manfaat utama (headline)', 'required' => true, 'placeholder' => 'e.g. Kulit Glowing 14 Hari'],
                    ['key' => 'subheadline', 'token' => '[VALUE PROPOSITION]',  'label' => 'Value proposition',         'required' => true, 'placeholder' => 'e.g. Diformulasi dari olive oil cold-pressed'],
                ],
                'sort_order' => 30,
            ],
            [
                'slug' => 'dark-futuristic-tech',
                'name' => 'Dark Futuristic Tech',
                'description' => 'Dark mode futuristic UI, cyberpunk premium aesthetic. Cocok untuk gadget, electronics, tech products, launch campaign.',
                'prompt_template' => <<<'TXT'
Create a futuristic Instagram promo banner for [PRODUCT NAME].
Style:
* dark mode futuristic UI
* cyberpunk premium aesthetic
* cinematic tech advertising
* luxury gadget launch vibes
* ultra detailed
* neon ambient lighting
* realistic reflections
* black and metallic color palette
Composition:
* product floating in center
* holographic UI elements surrounding product
* glowing edges
* subtle smoke/fog atmosphere
* dramatic contrast
* advanced technology vibe
Typography:
bold futuristic sans serif
clean hierarchy
minimal but powerful
Text:
Headline: "[HEADLINE]"
Subheadline: "[FITUR UTAMA]"
CTA: "Get Access Now"
Inspiration:
Tesla launch visuals, futuristic AI startup branding, sci-fi commercial campaign.
TXT,
                'negative_prompt' => 'cartoonish, low detail, messy neon, unrealistic anatomy, blurry render, low quality text',
                'fields' => [
                    ['key' => 'headline',    'token' => '[HEADLINE]',     'label' => 'Headline',      'required' => true, 'placeholder' => 'e.g. The Future Is Here'],
                    ['key' => 'subheadline', 'token' => '[FITUR UTAMA]',  'label' => 'Fitur utama',   'required' => true, 'placeholder' => 'e.g. AI-powered. Real-time. Always on.'],
                ],
                'sort_order' => 40,
            ],
            [
                'slug' => 'viral-ugc-hybrid',
                'name' => 'Viral UGC + Professional',
                'description' => 'Authentic UGC energy + premium commercial quality. Lifestyle photo + testimonial bubble. Cocok untuk influencer-style ads dan social commerce.',
                'prompt_template' => <<<'TXT'
Create a highly engaging Instagram promotional banner for [PRODUCT NAME] that combines authentic UGC energy with premium commercial quality.
Visual Style:
* realistic social media ad
* emotional and relatable
* premium influencer marketing aesthetic
* modern Instagram viral ad style
* cinematic lifestyle photography
Scene:
* human interacting naturally with product
* authentic expression
* believable environment
* product clearly visible
* dynamic framing
* realistic lighting
* subtle motion feel
Layout:
* bold hook headline at top
* testimonial/chat bubble style element
* social proof indicators
* CTA section at bottom
* visually optimized for stopping scroll
Text:
Headline: "[HOOK VIRAL]"
Social proof: "[TESTIMONI SINGKAT]"
CTA: "Klik Link di Bio"
Mood:
high trust, emotional trigger, modern social commerce, highly clickable
TXT,
                'negative_prompt' => 'fake human expression, awkward hands, cluttered layout, unrealistic skin, low resolution, unreadable text',
                'fields' => [
                    ['key' => 'headline',    'token' => '[HOOK VIRAL]',         'label' => 'Hook viral',          'required' => true, 'placeholder' => 'e.g. Akhirnya nemu yang bener'],
                    ['key' => 'subheadline', 'token' => '[TESTIMONI SINGKAT]',  'label' => 'Testimoni singkat',   'required' => true, 'placeholder' => 'e.g. "Pakai 3 hari, kulit langsung mulus." — Sarah, KL'],
                ],
                'sort_order' => 50,
            ],
        ];

        foreach ($templates as $t) {
            PosterTemplate::updateOrCreate(['slug' => $t['slug']], $t);
        }
    }
}
