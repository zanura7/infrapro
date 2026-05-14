<?php

namespace Database\Seeders;

use App\Models\PosterTemplate;
use Illuminate\Database\Seeder;

class PosterTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            // ------------------------------------------------------------------
            [
                'slug' => 'premium-clean-saas',
                'name' => 'Premium Clean SaaS',
                'description' => 'Modern premium banner — visual seperti campaign Apple / Stripe / Notion. Cocok untuk produk premium yang ingin terlihat trustworthy & high-end.',
                'prompt_template' => <<<'TXT'
Ultra high-quality 1080x1350 portrait Instagram banner — commercial advertising photography, magazine-grade composition, tack-sharp focus, perfect studio lighting.

PRODUCT (hero subject): [NAMA PRODUK]
The product is shown center-frame as the unmistakable hero of the composition. Photoreal, premium materials, soft-edge studio lighting with subtle rim light. Realistic shadow and gentle reflection on the surface beneath.

ART DIRECTION:
- Style: Apple keynote × Stripe homepage × Notion campaign
- Aesthetic: clean luxury minimalism, expensive feel, conversion-focused
- Background: minimalist with soft elegant gradient and subtle depth, neutral hero color drawn from the product
- Lighting: soft cinematic, key light from upper-left, gentle fill, color-graded for premium feel
- Composition: generous whitespace, balanced negative space, hero product slightly above center, text below
- Optional elements: very subtle glassmorphism panel behind text, faint vignette

TYPOGRAPHY (render text legibly, no garbled letters):
- Headline (large bold modern sans-serif, center-aligned, high contrast): "[HEADLINE BESAR]"
- Subheadline (lighter weight, 60% size of headline, max 2 lines): "[SUBTITLE PENJUALAN]"
- CTA button (rounded pill, solid accent fill, white text, small drop-shadow): "[CTA]"

CAMERA & RENDER:
shot on Phase One IQ4 medium-format, 80mm lens, f/8, ISO 100, color profile: cinematic teal/cream, 8K resolution, no chromatic aberration, no banding.

MOOD: professional, trustworthy, expensive, scroll-stopping, conversion-focused.

If a reference image is supplied: the product's exact shape, label, color, packaging proportions and branding MUST be preserved identically. Do not invent or alter packaging.
TXT,
                'negative_prompt' => 'low quality, blurry text, garbled letters, misspelled words, cluttered layout, watermark, signature, distorted product, fake packaging, amateur design, oversaturated colors, harsh shadows, plastic look, cgi look, low resolution, jpeg artifacts, extra hands, deformed objects',
                'fields' => [
                    ['key' => 'headline',    'token' => '[HEADLINE BESAR]',     'label' => 'Headline besar',     'required' => true,  'placeholder' => 'e.g. Kulit Sehat Tanpa Drama'],
                    ['key' => 'subheadline', 'token' => '[SUBTITLE PENJUALAN]', 'label' => 'Subtitle penjualan', 'required' => true,  'placeholder' => 'e.g. Formula natural untuk kulit sensitif'],
                    ['key' => 'cta',         'token' => '[CTA]',                'label' => 'Call to action',     'required' => true,  'placeholder' => 'e.g. Coba Sekarang'],
                ],
                'sort_order' => 10,
            ],

            // ------------------------------------------------------------------
            [
                'slug' => 'flash-sale-aggressive',
                'name' => 'Flash Sale — Aggressive Conversion',
                'description' => 'Hyper-professional banner untuk high conversion & impulse buy. Bold visual hierarchy, glow & motion. Cocok untuk diskon, flash sale, promo terbatas.',
                'prompt_template' => <<<'TXT'
Hyper-professional 1080x1350 portrait Instagram banner optimized for impulse buying — premium ecommerce campaign quality, vibrant but controlled, scroll-stopping.

PRODUCT (hero subject): [PRODUCT NAME]
The product is rendered as a highly polished hero shot with dramatic lighting. Realistic proportions, premium-looking surfaces, subtle motion blur streaks behind it suggesting speed/urgency.

ART DIRECTION:
- Style: Nike campaign × modern Tokopedia premium ad × luxury cyber commerce
- Composition: layered, energetic, bold visual hierarchy with the headline dominating top third
- Lighting: dramatic key + colorful rim light, controlled saturation, no neon vomit
- Effects: huge eye-catching discount badge top-right corner, glowing accent rings, floating particles, dynamic depth-of-field, subtle motion blur streaks
- Background: bold solid color or radial gradient (red/orange/black combination) with energetic geometric shapes

TYPOGRAPHY (render text legibly, no garbled letters):
- Headline (massive bold extruded sans-serif, dominant top of frame, high contrast): "[DISKON / PROMO]"
- Offer text (medium weight, supporting line below headline): "[DETAIL PROMO]"
- CTA button (vivid contrast pill, white text): "Order Sekarang"

CAMERA & RENDER:
shot in studio with high-end advertising rig, 50mm lens, f/4, dramatic chiaroscuro, vibrant cinematic grade, 8K, tack-sharp on product.

MOOD: urgent, exciting, premium ecommerce, viral ad quality, highly clickable.

If a reference image is supplied: lock the product's exact shape, color, label, packaging, branding. Do not alter the product.
TXT,
                'negative_prompt' => 'cheap design, low resolution, blurry text, unreadable typography, messy layout, fake shadows, amateur cgi look, distorted packaging, extra fingers, extra hands, watermark, harsh oversaturation, jpeg artifacts, garbled letters',
                'fields' => [
                    ['key' => 'headline',    'token' => '[DISKON / PROMO]', 'label' => 'Diskon / promo headline', 'required' => true, 'placeholder' => 'e.g. DISKON 50% HARI INI'],
                    ['key' => 'subheadline', 'token' => '[DETAIL PROMO]',   'label' => 'Detail promo',            'required' => true, 'placeholder' => 'e.g. Berlaku sampai stock habis. Free shipping.'],
                ],
                'sort_order' => 20,
            ],

            // ------------------------------------------------------------------
            [
                'slug' => 'elegant-herbal-skincare',
                'name' => 'Elegant Herbal / Skincare',
                'description' => 'Natural luxury, elegant botanical aesthetic. Magazine-quality beauty advertising. Cocok untuk skincare, herbal, beauty products.',
                'prompt_template' => <<<'TXT'
Ultra-realistic 1080x1350 portrait Instagram banner — magazine-quality beauty editorial advertising for a premium herbal/skincare brand, Vogue cosmetic campaign standard.

PRODUCT (hero subject): [NAMA PRODUK]
The product (bottle/jar/tube) is displayed on an elegant pedestal — polished stone slab, frosted glass plinth, or natural travertine. Soft natural-window lighting wraps around the bottle, gentle reflection on the platform surface, realistic macro details on label and material.

SCENE:
- Subtle fresh botanical elements around the product: a few green leaves, water droplets on the bottle, a sprig of herb, or natural fiber texture
- Creamy gradient background (cream, soft beige, warm white) with very gentle out-of-focus bokeh
- Cinematic macro depth-of-field — product tack sharp, background creamily blurred
- Atmosphere: fresh, organic, calming, expensive

ART DIRECTION:
- Style: clean beauty commercial photography, Hourglass × Tatcha × Dior Skincare campaign
- Lighting: warm natural soft daylight, soft golden-hour key, gentle fill, soft shadows
- Color palette: cream, ivory, sage, warm taupe — never harsh

TYPOGRAPHY (render text legibly, no garbled letters):
- Headline (elegant high-fashion serif or refined sans-serif, centered, minimal weight): "[MANFAAT UTAMA]"
- Subheadline (smaller, italicized or lighter weight, supporting line): "[VALUE PROPOSITION]"
- CTA button (thin elegant pill, beige/gold accent, dark text): "Coba Sekarang"

CAMERA & RENDER:
shot on Hasselblad H6D-100c, 120mm macro lens, f/2.8, natural window light, 8K resolution, color profile: warm cream skin tones.

MOOD: premium, healthy, trusted, calming, modern, luxurious, scroll-stopping editorial.

If a reference image is supplied: the product packaging, label, color, and proportions MUST match the reference exactly. Do not invent or alter packaging.
TXT,
                'negative_prompt' => 'cheap packaging, fake skin texture, plastic shine, low-end ecommerce look, cluttered composition, harsh studio flash, garbled text, blurry typography, low resolution, unrealistic lighting, oversaturated greens, cartoon style, watermark',
                'fields' => [
                    ['key' => 'headline',    'token' => '[MANFAAT UTAMA]',     'label' => 'Manfaat utama (headline)', 'required' => true, 'placeholder' => 'e.g. Kulit Glowing 14 Hari'],
                    ['key' => 'subheadline', 'token' => '[VALUE PROPOSITION]', 'label' => 'Value proposition',         'required' => true, 'placeholder' => 'e.g. Diformulasi dari olive oil cold-pressed'],
                ],
                'sort_order' => 30,
            ],

            // ------------------------------------------------------------------
            [
                'slug' => 'dark-futuristic-tech',
                'name' => 'Dark Futuristic Tech',
                'description' => 'Dark mode cyberpunk premium. Cocok untuk gadget, electronics, launch campaign produk teknologi.',
                'prompt_template' => <<<'TXT'
Ultra-detailed 1080x1350 portrait Instagram banner — dark mode futuristic tech advertising, Tesla launch visual standard, sci-fi commercial campaign quality.

PRODUCT (hero subject): [PRODUCT NAME]
The product floats center-frame against a dark cyberpunk environment. Subtle metallic finish picks up neon rim light. Glowing accent edges. The product looks pristine, sharply rendered, with realistic reflections and tiny holographic UI elements (data points, scan lines, faint tech glyphs) hovering near it.

ART DIRECTION:
- Style: Tesla / Apple Vision Pro / Riot Games promo / futuristic AI startup branding
- Aesthetic: dark cyberpunk premium, neon ambient lighting, luxury gadget launch
- Background: deep matte black or carbon-fiber texture with subtle smoke/fog drifting at the bottom, soft volumetric light beams
- Color palette: black, dark graphite, gunmetal, deep navy, with neon cyan, magenta, or electric blue accent
- Effects: holographic floating UI panels (very subtle, not cluttered), glowing product edges, light bloom on neon highlights, dramatic contrast, faint lens flare

TYPOGRAPHY (render text legibly, no garbled letters):
- Headline (bold futuristic sans-serif, condensed if possible, with subtle neon glow, top-center): "[HEADLINE]"
- Subheadline (thinner weight, sometimes mono-spaced, supporting line): "[FITUR UTAMA]"
- CTA button (neon outline pill or glowing rectangle, white/cyan text): "Get Access Now"

CAMERA & RENDER:
shot in studio with motion-control rig, 35mm lens, f/2.0, deep contrast, cinematic color grade, 8K, ARRI Alexa anamorphic look.

MOOD: cinematic, advanced, premium, scroll-stopping, "tomorrow's tech today".

If a reference image is supplied: lock product's silhouette, material finish, ports/details, and proportions exactly to the reference. Do not invent extra features.
TXT,
                'negative_prompt' => 'cartoonish, low detail, messy neon, unrealistic anatomy, blurry render, garbled text, broken UI elements, plastic toy look, low resolution, oversaturated rainbow, watermark, extra hands, distorted product',
                'fields' => [
                    ['key' => 'headline',    'token' => '[HEADLINE]',    'label' => 'Headline',    'required' => true, 'placeholder' => 'e.g. The Future Is Here'],
                    ['key' => 'subheadline', 'token' => '[FITUR UTAMA]', 'label' => 'Fitur utama', 'required' => true, 'placeholder' => 'e.g. AI-powered. Real-time. Always on.'],
                ],
                'sort_order' => 40,
            ],

            // ------------------------------------------------------------------
            [
                'slug' => 'viral-ugc-hybrid',
                'name' => 'Viral UGC + Professional',
                'description' => 'Authentic UGC energy + premium commercial quality. Lifestyle photo + testimonial bubble + social proof. Cocok untuk influencer-style ads, social commerce.',
                'prompt_template' => <<<'TXT'
Highly engaging 1080x1350 portrait Instagram banner — UGC authenticity meets premium commercial polish, modern viral social commerce ad standard.

SCENE (hero subject): a real-looking person naturally using or holding [PRODUCT NAME]
- Authentic expression, genuine smile or focused attention, no awkward "model" pose
- Believable environment: bedroom / cafe / bathroom / kitchen / sunlit room — depending on product context
- Natural lighting (window light, soft golden hour), subtle motion feel, candid framing
- Product clearly visible, in-focus, identifiable
- Dynamic framing — three-quarter or close-up portrait orientation
- Realistic skin texture, real hands, real fingernails, no plastic skin

ART DIRECTION:
- Style: premium influencer marketing × Instagram viral ad × cinematic lifestyle photography
- Composition: human + product central, with breathing room for text overlay top and bottom
- Color: warm natural tones, color-graded but not over-stylized

OVERLAY ELEMENTS (clearly readable, designed in Figma-quality):
- Bold hook headline at TOP of frame, large modern sans-serif, drop-shadow for legibility against photo: "[HOOK VIRAL]"
- A testimonial / chat bubble (rounded rect, white background, dark text, small avatar dot, social proof indicator like 5 stars or "✓ Verified buyer"): "[TESTIMONI SINGKAT]"
- CTA section near bottom (vivid pill button, contrasting color): "Klik Link di Bio"

CAMERA & RENDER:
shot on Sony A7 IV, 35mm f/1.8, natural window light, 8K, realistic skin tones, no oversharpening, no plastic skin, no uncanny faces.

MOOD: high trust, emotional, modern social commerce, highly clickable, "this could be me".

If a reference image is supplied: lock product's exact shape, color, label and packaging to the reference. The on-screen person should hold/use that exact product.
TXT,
                'negative_prompt' => 'fake human expression, uncanny face, awkward hands, deformed fingers, extra fingers, plastic skin, cluttered layout, garbled text, blurry image, low resolution, watermark, signature, distorted product, unrealistic anatomy, mannequin look',
                'fields' => [
                    ['key' => 'headline',    'token' => '[HOOK VIRAL]',        'label' => 'Hook viral',        'required' => true, 'placeholder' => 'e.g. Akhirnya nemu yang bener'],
                    ['key' => 'subheadline', 'token' => '[TESTIMONI SINGKAT]', 'label' => 'Testimoni singkat', 'required' => true, 'placeholder' => 'e.g. "Pakai 3 hari, kulit langsung mulus." — Sarah, KL'],
                ],
                'sort_order' => 50,
            ],
        ];

        foreach ($templates as $t) {
            PosterTemplate::updateOrCreate(['slug' => $t['slug']], $t);
        }
    }
}
