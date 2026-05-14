<?php

namespace Database\Seeders;

use App\Models\StudioTemplate;
use Illuminate\Database\Seeder;

class StudioTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'slug' => 'before-after',
                'name' => 'Before-After',
                'description' => 'Side-by-side or transition-based comparison showcasing dramatic product transformation over time.',
                'best_for' => 'Skincare, cosmetics, wellness, fitness, haircare, supplements',
                'narrative_shape' => [
                    'Scene 1 (BEFORE): Close-up establishes the problem subtly — model shows concern with neutral lighting and dignified framing. Problem area highlighted clearly without exaggeration.',
                    'Scene 2 (PRODUCT INTRO): Hero shot of product emerges with clean background. Key benefits overlaid or narrated. Sets up the solution.',
                    'Scene 3 (APPLICATION): Quick montage of elegant product use — hands apply with confidence, handling shows premium quality. Transformation begins visually.',
                    'Scene 4 (TRANSFORMATION): Hard swipe or smooth morph transition reveals the "after" state with identical camera angle. Lighting brightens, model radiates confidence and joy.',
                    'Scene 5 (RESULT & CTA): Before/after split-screen comparison held side-by-side. Model endorses with genuine smile, product gets final hero shot, clear call-to-action.',
                ],
                'scene_guidance' => 'Match camera angles precisely between before and after for fair comparison. Use consistent lighting OR an intentional transition (dim→bright) to signal transformation. Swipe/morph transitions should feel smooth and professional. A timeline overlay ("After X days") reinforces credibility. Keep close-ups on face/problem area to show emotional and visual proof.',
                'sort_order' => 10,
            ],
            [
                'slug' => 'problem-solution',
                'name' => 'Problem-Solution',
                'description' => 'Emotional narrative arc from frustration and struggle to relief and joy through product discovery and use.',
                'best_for' => 'Skincare, wellness, personal care, health solutions, pain relief, problem-solving products',
                'narrative_shape' => [
                    'Scene 1 (PROBLEM): Model in a relatable daily scenario, frustration visible. Close-up shows authentic struggle — sighing, touching problem area, discouragement. Lighting slightly dim to underscore emotional heaviness.',
                    'Scene 2 (BREAKING POINT): Escalation of failed attempts with old solutions. Model exhausted but still dignified. Sets up desperation for change.',
                    'Scene 3 (DISCOVERY & HOPE): Product enters frame. Eyes widen with curiosity. Lighting gradually brightens. Model reads the label, decision crystallizes. Determined expression shows commitment to try.',
                    'Scene 4 (APPLICATION & TRANSFORMATION): Product use begins. Real-time visible improvement as application progresses. Model\'s face brightens alongside the lighting. Satisfaction and relief wash over features.',
                    'Scene 5 (RELIEF & CTA): Full transformation reveal with radiant expression. Model speaks directly to camera with a genuine testimonial. Product hero shot. Strong emotional endorsement and clear call-to-action.',
                ],
                'scene_guidance' => 'Build emotional authenticity — frustration must feel relatable, not exaggerated. Use a lighting arc (dim→bright) to mirror the emotional journey from struggle to relief. Use close-ups on the face for emotional beats. The product becomes the "turning point" visually and narratively. End on a satisfied, confident expression to reinforce transformation.',
                'sort_order' => 20,
            ],
            [
                'slug' => 'mirror-selfie',
                'name' => 'Mirror Selfie',
                'description' => 'OOTD-style rapid-fire pose sequences in a mirror reflection, phone visible, showcasing outfit/product fit and styling.',
                'best_for' => 'Fashion, apparel, accessories, jewelry, footwear, styling products, beauty products, lifestyle items',
                'narrative_shape' => [
                    'Scene 1 (INTRO & POSE 1): Model stands in front of a large mirror, phone grip clearly visible in hand. Aesthetic upright stance, body angled slightly, head tilted. Product/outfit prominent in frame. Establishes the "selfie moment" authenticity.',
                    'Scene 2 (POSE 2 — JUMP CUT): Instant cut to a completely different pose — hair touch, sweet smile to mirror/camera. Free hand detail adjustment. Product remains visible. Dynamic energy through rapid transition.',
                    'Scene 3 (POSE 3 — JUMP CUT): Another instant cut — hand adjusts outfit hem / collar / detail. Shows how the product fits/moves on the body. Confident, satisfied expression. Demonstrates garment function and comfort.',
                    'Scene 4 (POSE 4 — JUMP CUT): Full or three-quarter body angle shift. Confident energy peaks. Product fully visible in context. Model owns the moment.',
                    'Scene 5 (CLOSING & CTA): Step back slightly for complete outfit view. Bye-bye gesture to mirror OR point downward (CTA). Phone and product both clearly framed. Energy closes on inviting, "shop now" vibe.',
                ],
                'scene_guidance' => 'Phone grip MUST be visible in the mirror reflection — this is the authenticator of the selfie aesthetic. Jump cuts every ~3 seconds for viral pacing (no slow motion). No text overlays, subtitles, watermarks, or UI icons — keep it clean and natural. Lighting bright and flattering for selfie (avoid backlighting). Each pose should show a different angle of the product/outfit fit. The closing gesture should feel natural — either a bye-bye or a downward point linking to the shop link.',
                'sort_order' => 30,
            ],
            [
                'slug' => 'product-demo',
                'name' => 'Product Demo',
                'description' => 'Premium e-commerce showcase of product design, construction, features, and functionality through elegant camera work and hand interactions.',
                'best_for' => 'Electronics, tech gadgets, beauty tools, home goods, premium products, mechanical/functional items, luxury goods',
                'narrative_shape' => [
                    'Scene 1 (REVEAL): Product emerges dramatically from shadow or fog. Studio lighting catches premium materials, gleam, and finish. 45-degree hero angle. Sets the aspirational first impression. Hands (if visible) enter elegantly.',
                    'Scene 2 (ORBIT & 360°): Smooth 180–360° rotation or camera orbit around the product. Each angle appreciated. Lighting reveals material quality from different perspectives. Pause on key design features. Establishes craftsmanship.',
                    'Scene 3 (DETAIL & CONSTRUCTION): Rack focus or zoom to main features. Macro close-up reveals texture, seams, construction quality, material finish. Shows premium nature. Hands may demonstrate scale or handling if needed.',
                    'Scene 4 (FUNCTION & USAGE): Product in action or a practical scenario. Elegant hands interact naturally, demonstrating ergonomics, buttons, mechanisms, or intended use. If face is shown, presenter expresses genuine appreciation. Proves functionality.',
                    'Scene 5 (HERO FINALE & CTA): Product returns to a center-frame hero shot, pristine and fully visible. Warm, aspirational lighting. Final composition perfect for e-commerce conversion. Logo/CTA zone clear. Frame reads as "ready to buy."',
                ],
                'scene_guidance' => 'Premium lighting essential — large softbox for face if any, accent kicker for edge definition, material-optimized gels. Camera movements smooth and intentional (orbits, racks, dolly). Close-ups must show texture and construction detail (seams, finish, materials). Hands move gracefully and never dominate the product. Transitions between segments should feel seamless and professional. End composition should scream "e-commerce premium" — product centered, well-lit, no distractions.',
                'sort_order' => 40,
            ],
        ];

        foreach ($templates as $t) {
            StudioTemplate::updateOrCreate(['slug' => $t['slug']], $t);
        }
    }
}
