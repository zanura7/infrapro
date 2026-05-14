import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowRight, Brain, Check, Combine, Download, Film,
    Image as ImageIcon, Loader2, Megaphone, Package, RefreshCw, RotateCcw,
    Sparkles, Target, Upload, Video, X, Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Separator } from '@/Components/ui/separator';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select';
import { cn } from '@/lib/utils';

type Asset = { id: number; type: string; url: string };
type Product = {
    id: number; slug: string; name: string;
    category: string | null; price: string | null; currency: string;
    assets: Asset[];
};
type Template = {
    id: number; slug: string; name: string;
    description: string | null; best_for: string | null;
    narrative_shape: string[];
    default_scene_count: number;
    default_clip_seconds: number;
    default_aspect_ratio: string;
};
type Scene = {
    index: number;
    title: string;
    image_prompt: string;
    video_prompt: string;
    voiceover_script: string;
};
type Strategy = {
    product: { name: string; category: string; description: string; key_features: string[] };
    audience: { primary: string; psychographics: string; pain_points: string[] };
    strategy: { angle: string; rationale: string };
    format: { type: string; aspect_ratio: string; rationale: string };
    hook: string;
    cta: string;
    scenes: Scene[];
    meta?: { aspect_ratio: string; clip_seconds: number; scene_count: number; template_slug: string | null; skip_analyze?: boolean };
};

type SceneState = {
    image_url?: string;
    image_job_id?: number;
    image_loading?: boolean;
    video_url?: string;
    video_job_id?: number;
    video_loading?: boolean;
    error?: string;
};

type StitchState = {
    job_id?: number;
    url?: string;
    loading?: boolean;
    error?: string;
};

const POLL_INTERVAL_MS = 3000;

async function pollJob(jobId: number): Promise<{ status: string; output: any; error: any }> {
    const { data } = await axios.get(route('studio.job', { id: jobId }));
    return data;
}

async function waitForJob(jobId: number): Promise<{ status: string; output: any; error: any }> {
    while (true) {
        const r = await pollJob(jobId);
        if (r.status === 'succeeded' || r.status === 'failed') return r;
        await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
    }
}

export default function StudioIndex({ products, templates }: { products: Product[]; templates: Template[] }) {
    const [productId, setProductId] = useState<number | null>(products[0]?.id ?? null);
    const [assetId, setAssetId] = useState<number | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
    const [templateSlug, setTemplateSlug] = useState<string | null>(templates[0]?.slug ?? null);
    const [language, setLanguage] = useState<'indonesian' | 'malay' | 'english'>('indonesian');
    const [skipAnalyze, setSkipAnalyze] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [strategy, setStrategy] = useState<Strategy | null>(null);
    const [sceneStates, setSceneStates] = useState<Record<number, SceneState>>({});
    const [stitchState, setStitchState] = useState<StitchState>({});
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const cancelledRef = useRef(false);

    const selectedProduct = useMemo(
        () => products.find((p) => p.id === productId) || null,
        [productId, products],
    );
    const selectedTemplate = useMemo(
        () => templates.find((t) => t.slug === templateSlug) || null,
        [templateSlug, templates],
    );

    const aspectRatio = strategy?.meta?.aspect_ratio || selectedTemplate?.default_aspect_ratio || '9:16';
    const clipSeconds = strategy?.meta?.clip_seconds || selectedTemplate?.default_clip_seconds || 6;

    useEffect(() => {
        return () => { cancelledRef.current = true; };
    }, []);

    const reset = () => {
        setStrategy(null);
        setSceneStates({});
        setStitchState({});
        setError(null);
    };

    const onFile = (f: File) => {
        setUploadedFile(f);
        const r = new FileReader();
        r.onloadend = () => setUploadedPreview(r.result as string);
        r.readAsDataURL(f);
        setAssetId(null);
    };

    const updateScene = (i: number, patch: Partial<SceneState>) =>
        setSceneStates((s) => ({ ...s, [i]: { ...(s[i] || {}), ...patch } }));

    const buildImagePayload = () => {
        const fd = new FormData();
        fd.append('product_id', String(productId));
        if (assetId) fd.append('asset_id', String(assetId));
        if (uploadedFile) fd.append('image', uploadedFile);
        return fd;
    };

    const analyze = async () => {
        if (!productId) { setError('Select a product first.'); return; }
        if (!skipAnalyze && !assetId && !uploadedFile && !selectedProduct?.assets.length) {
            setError('Upload an image or pick a product asset.'); return;
        }
        setError(null);
        setAnalyzing(true);
        setStrategy(null);
        setSceneStates({});
        setStitchState({});
        try {
            const fd = buildImagePayload();
            fd.append('language', language);
            if (templateSlug) fd.append('template_slug', templateSlug);
            if (skipAnalyze) fd.append('skip_analyze', '1');
            const { data } = await axios.post(route('studio.analyze'), fd);
            setStrategy(data.strategy);
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.message || 'Analyze failed.');
        } finally {
            setAnalyzing(false);
        }
    };

    const generateSceneImage = async (scene: Scene) => {
        if (!productId) return;
        updateScene(scene.index, { image_loading: true, error: undefined });
        try {
            const fd = buildImagePayload();
            fd.append('scene_index', String(scene.index));
            fd.append('prompt', scene.image_prompt);
            fd.append('aspect_ratio', aspectRatio);
            const { data } = await axios.post(route('studio.image'), fd);
            updateScene(scene.index, { image_job_id: data.job_id });

            const result = await waitForJob(data.job_id);
            if (cancelledRef.current) return;
            if (result.status === 'succeeded') {
                updateScene(scene.index, { image_url: result.output?.url, image_loading: false });
            } else {
                updateScene(scene.index, {
                    image_loading: false,
                    error: result.error?.message || 'Image generation failed.',
                });
            }
        } catch (e: any) {
            updateScene(scene.index, {
                image_loading: false,
                error: e?.response?.data?.error || e?.message || 'Image dispatch failed.',
            });
        }
    };

    const generateSceneVideo = async (scene: Scene) => {
        const st = sceneStates[scene.index];
        if (!productId || !st?.image_url) return;
        updateScene(scene.index, { video_loading: true, error: undefined });
        try {
            const { data } = await axios.post(route('studio.video'), {
                product_id: productId,
                scene_index: scene.index,
                approved_image: st.image_url,
                prompt: scene.video_prompt,
                voiceover_script: scene.voiceover_script,
                aspect_ratio: aspectRatio,
                clip_seconds: clipSeconds,
            });
            updateScene(scene.index, { video_job_id: data.job_id });

            const result = await waitForJob(data.job_id);
            if (cancelledRef.current) return;
            if (result.status === 'succeeded') {
                updateScene(scene.index, { video_url: result.output?.url, video_loading: false });
            } else {
                updateScene(scene.index, {
                    video_loading: false,
                    error: result.error?.message || 'Video generation failed.',
                });
            }
        } catch (e: any) {
            updateScene(scene.index, {
                video_loading: false,
                error: e?.response?.data?.error || e?.message || 'Video dispatch failed.',
            });
        }
    };

    const stitchAll = async () => {
        if (!strategy || !productId) return;
        const clipUrls = strategy.scenes
            .map((s) => sceneStates[s.index]?.video_url)
            .filter((u): u is string => !!u);
        if (clipUrls.length < 2) {
            setStitchState({ error: 'Need at least 2 finished clips to stitch.' });
            return;
        }
        setStitchState({ loading: true, error: undefined, url: undefined });
        try {
            const { data } = await axios.post(route('studio.stitch'), {
                product_id: productId,
                clip_urls: clipUrls,
            });
            setStitchState({ job_id: data.job_id, loading: true });
            const result = await waitForJob(data.job_id);
            if (cancelledRef.current) return;
            if (result.status === 'succeeded') {
                setStitchState({ url: result.output?.url, loading: false });
            } else {
                setStitchState({ loading: false, error: result.error?.message || 'Stitch failed.' });
            }
        } catch (e: any) {
            setStitchState({ loading: false, error: e?.response?.data?.error || e?.message || 'Stitch dispatch failed.' });
        }
    };

    const finishedClips = useMemo(() => {
        if (!strategy) return 0;
        return strategy.scenes.filter((s) => sceneStates[s.index]?.video_url).length;
    }, [strategy, sceneStates]);

    return (
        <AuthenticatedLayout header="AI Content Studio" activeKey="studio">
            <Head title="AI Content Studio" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-accent">
                            MODULE 02 · GENERATION
                        </div>
                        <h1 className="font-display text-3xl font-semibold sm:text-4xl">AI Content Studio</h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Pick a product, pick a template, get a 5-scene video ad. Per-scene image + 6s clip with lip-synced voiceover. Stitch when ready.
                        </p>
                    </div>
                    {strategy && (
                        <Button variant="ghost" size="sm" onClick={reset}>
                            <RotateCcw className="h-4 w-4" /> Start over
                        </Button>
                    )}
                </div>

                {error && (
                    <div className="mb-6 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                        <X className="mt-0.5 h-5 w-5 shrink-0" />
                        <div className="flex-1 whitespace-pre-wrap">{error}</div>
                        <button onClick={() => setError(null)} className="text-xs hover:underline">Dismiss</button>
                    </div>
                )}

                {products.length === 0 ? (
                    <NoProducts />
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        {/* Inputs */}
                        <aside className="space-y-4 lg:col-span-4 lg:space-y-5">
                            <Card>
                                <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                                    <Package className="h-4 w-4 text-accent" />
                                    <CardTitle className="text-sm">Product</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Select
                                        value={productId?.toString() || ''}
                                        onValueChange={(v) => {
                                            setProductId(Number(v));
                                            setAssetId(null);
                                            reset();
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map((p) => (
                                                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="mt-3 text-[11px] text-muted-foreground">
                                        {selectedProduct?.category}
                                        {selectedProduct?.price && ` · ${selectedProduct.currency} ${selectedProduct.price}`}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                                    <ImageIcon className="h-4 w-4 text-accent" />
                                    <CardTitle className="text-sm">Reference Image</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedProduct?.assets && selectedProduct.assets.length > 0 && !uploadedFile && (
                                        <div className="mb-3">
                                            <Label className="mb-2 block text-[11px] text-muted-foreground">Use existing asset:</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {selectedProduct.assets.map((a) => (
                                                    <button
                                                        key={a.id}
                                                        type="button"
                                                        onClick={() => setAssetId(a.id === assetId ? null : a.id)}
                                                        className={cn(
                                                            'aspect-square overflow-hidden rounded-lg border-2 transition',
                                                            assetId === a.id
                                                                ? 'border-accent ring-2 ring-accent/30'
                                                                : 'border-border hover:border-accent/40',
                                                        )}
                                                    >
                                                        <img src={a.url} alt="" className="h-full w-full object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Label className="mb-2 block text-[11px] text-muted-foreground">Or upload new:</Label>
                                    <div
                                        onClick={() => fileRef.current?.click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const f = e.dataTransfer.files?.[0];
                                            if (f && f.type.startsWith('image/')) onFile(f);
                                        }}
                                        className="cursor-pointer rounded-lg border-2 border-dashed border-border p-4 text-center transition hover:border-accent hover:bg-accent/5"
                                    >
                                        {uploadedPreview ? (
                                            <img src={uploadedPreview} alt="" className="mx-auto max-h-32 rounded" />
                                        ) : (
                                            <>
                                                <Upload className="mx-auto mb-1 h-6 w-6 text-muted-foreground" />
                                                <div className="text-xs text-muted-foreground">Tap or drop image</div>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                                    <Film className="h-4 w-4 text-accent" />
                                    <CardTitle className="text-sm">Template</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {templates.length === 0 && (
                                        <p className="text-xs text-muted-foreground">No templates available. Ask admin to seed.</p>
                                    )}
                                    {templates.map((t) => (
                                        <button
                                            key={t.slug}
                                            type="button"
                                            onClick={() => setTemplateSlug(t.slug === templateSlug ? null : t.slug)}
                                            className={cn(
                                                'w-full rounded-lg border p-3 text-left transition',
                                                templateSlug === t.slug
                                                    ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                                                    : 'border-border hover:border-accent/40',
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="font-medium text-sm">{t.name}</div>
                                                {templateSlug === t.slug && (
                                                    <Check className="h-4 w-4 shrink-0 text-accent" />
                                                )}
                                            </div>
                                            {t.description && (
                                                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{t.description}</p>
                                            )}
                                        </button>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                                    <Target className="h-4 w-4 text-accent" />
                                    <CardTitle className="text-sm">Options</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <Label className="mb-2 block text-[11px] text-muted-foreground">Voiceover language</Label>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {([
                                                { id: 'indonesian', label: '🇮🇩 ID' },
                                                { id: 'malay', label: '🇲🇾 MY' },
                                                { id: 'english', label: '🇬🇧 EN' },
                                            ] as const).map((l) => (
                                                <Button
                                                    key={l.id}
                                                    type="button"
                                                    onClick={() => setLanguage(l.id)}
                                                    size="sm"
                                                    variant={language === l.id ? 'default' : 'outline'}
                                                >
                                                    {l.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-xs hover:bg-muted/40">
                                        <input
                                            type="checkbox"
                                            checked={skipAnalyze}
                                            onChange={(e) => setSkipAnalyze(e.target.checked)}
                                            className="mt-0.5 h-3.5 w-3.5 rounded border-border text-primary focus:ring-ring"
                                        />
                                        <span className="flex-1">
                                            <span className="font-medium">Skip vision analyze</span>
                                            <span className="block text-[11px] text-muted-foreground">
                                                Use template defaults directly. Faster, free, but less product-tailored.
                                            </span>
                                        </span>
                                    </label>
                                </CardContent>
                            </Card>

                            <Button onClick={analyze} disabled={analyzing} size="lg" className="w-full">
                                {analyzing ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Building scenes…</>
                                ) : strategy ? (
                                    <><RefreshCw className="h-4 w-4" /> Rebuild scenes</>
                                ) : skipAnalyze ? (
                                    <><Zap className="h-4 w-4" /> Build scenes from template</>
                                ) : (
                                    <><Brain className="h-4 w-4" /> Analyze &amp; build scenes</>
                                )}
                            </Button>
                        </aside>

                        {/* Pipeline */}
                        <main className="space-y-4 lg:col-span-8 lg:space-y-5">
                            {!strategy && !analyzing && <PickHint />}
                            {analyzing && (
                                <LoadingCard
                                    title={skipAnalyze ? 'Building scenes from template…' : 'Analyzing image & building 5 scenes…'}
                                    subtitle={skipAnalyze
                                        ? 'No LLM call — using the template narrative directly.'
                                        : 'Vision LLM identifies the product and drafts your scene breakdown.'
                                    }
                                />
                            )}

                            {strategy && (
                                <>
                                    <StrategySummary strategy={strategy} />
                                    <ScenesGrid
                                        scenes={strategy.scenes}
                                        states={sceneStates}
                                        aspectRatio={aspectRatio}
                                        onGenerateImage={generateSceneImage}
                                        onGenerateVideo={generateSceneVideo}
                                    />
                                    <StitchCard
                                        totalScenes={strategy.scenes.length}
                                        finishedClips={finishedClips}
                                        state={stitchState}
                                        aspectRatio={aspectRatio}
                                        onStitch={stitchAll}
                                    />
                                </>
                            )}
                        </main>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function PickHint() {
    return (
        <Card className="grid min-h-[300px] place-items-center p-8 text-center sm:min-h-[400px] sm:p-12">
            <div>
                <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-accent/10">
                    <Sparkles className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-display text-xl font-semibold sm:text-2xl">Pick a product, image &amp; template to start.</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    The strategist inspects the image, follows the chosen template, and breaks the ad into 5 scenes — each with its own keyframe, video prompt, and lip-sync line.
                </p>
            </div>
        </Card>
    );
}

function LoadingCard({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <Card className="flex items-start gap-5 p-6 sm:p-8">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/10">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
            <div className="flex-1">
                <div className="font-semibold">{title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
            </div>
        </Card>
    );
}

function StrategySummary({ strategy }: { strategy: Strategy }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm">Strategy</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {strategy.meta?.template_slug && (
                        <Badge variant="accent" className="capitalize">{strategy.meta.template_slug.replace(/-/g, ' ')}</Badge>
                    )}
                    {strategy.meta?.skip_analyze && (
                        <Badge variant="muted">template-only</Badge>
                    )}
                    <Badge variant="muted" className="font-mono">{strategy.meta?.aspect_ratio || '9:16'}</Badge>
                    <Badge variant="muted">{strategy.meta?.clip_seconds || 6}s / scene</Badge>
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
                <Pane label="Product">
                    <div className="text-base font-semibold">{strategy.product.name}</div>
                    <div className="text-xs text-muted-foreground">{strategy.product.category}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{strategy.product.description}</p>
                </Pane>
                <Pane label="Audience">
                    <div className="text-sm font-medium">{strategy.audience.primary}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{strategy.audience.psychographics}</p>
                </Pane>
                <Pane label="Angle">
                    <Badge variant="accent" className="uppercase tracking-wide">
                        {strategy.strategy.angle}
                    </Badge>
                    <p className="mt-2 text-xs text-muted-foreground">{strategy.strategy.rationale}</p>
                </Pane>
                <Pane label="Hook + CTA">
                    <div className="font-serif text-base italic text-foreground/80">"{strategy.hook}"</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Megaphone className="h-3.5 w-3.5" /> {strategy.cta}
                    </div>
                </Pane>
            </CardContent>
        </Card>
    );
}

function Pane({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-accent">{label}</div>
            {children}
        </div>
    );
}

function ScenesGrid({
    scenes, states, aspectRatio, onGenerateImage, onGenerateVideo,
}: {
    scenes: Scene[];
    states: Record<number, SceneState>;
    aspectRatio: string;
    onGenerateImage: (scene: Scene) => void;
    onGenerateVideo: (scene: Scene) => void;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm">Scenes ({scenes.length})</CardTitle>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Generate per scene · async</span>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-4 pt-6">
                {scenes.map((scene) => (
                    <SceneRow
                        key={scene.index}
                        scene={scene}
                        state={states[scene.index] || {}}
                        aspectRatio={aspectRatio}
                        onGenerateImage={() => onGenerateImage(scene)}
                        onGenerateVideo={() => onGenerateVideo(scene)}
                    />
                ))}
            </CardContent>
        </Card>
    );
}

function SceneRow({
    scene, state, aspectRatio, onGenerateImage, onGenerateVideo,
}: {
    scene: Scene;
    state: SceneState;
    aspectRatio: string;
    onGenerateImage: () => void;
    onGenerateVideo: () => void;
}) {
    const hasImage = !!state.image_url;
    const hasVideo = !!state.video_url;

    return (
        <div className="rounded-xl border bg-muted/30 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
                <div className="space-y-2">
                    <MediaSlot
                        kind={hasVideo ? 'video' : 'image'}
                        url={hasVideo ? state.video_url : state.image_url}
                        loading={state.image_loading || state.video_loading}
                        loadingLabel={state.video_loading ? 'Rendering video…' : state.image_loading ? 'Rendering image…' : undefined}
                        aspectRatio={aspectRatio}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant={hasImage ? 'outline' : 'default'}
                            onClick={onGenerateImage}
                            disabled={state.image_loading || state.video_loading}
                            className="flex-1"
                        >
                            {state.image_loading ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Image…</>
                            ) : hasImage ? (
                                <><RefreshCw className="h-3.5 w-3.5" /> Image</>
                            ) : (
                                <><ImageIcon className="h-3.5 w-3.5" /> Image</>
                            )}
                        </Button>
                        <Button
                            size="sm"
                            variant={hasVideo ? 'outline' : 'success'}
                            onClick={onGenerateVideo}
                            disabled={!hasImage || state.video_loading || state.image_loading}
                            className="flex-1"
                        >
                            {state.video_loading ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Video…</>
                            ) : hasVideo ? (
                                <><RefreshCw className="h-3.5 w-3.5" /> Video</>
                            ) : (
                                <><Video className="h-3.5 w-3.5" /> Video</>
                            )}
                        </Button>
                    </div>
                    {hasVideo && (
                        <Button asChild size="sm" variant="ghost" className="w-full">
                            <a href={state.video_url} download={`scene-${scene.index}.mp4`}>
                                <Download className="h-3.5 w-3.5" /> Download clip
                            </a>
                        </Button>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="muted" className="font-mono">#{scene.index}</Badge>
                        <h4 className="text-sm font-semibold">{scene.title}</h4>
                    </div>
                    {scene.voiceover_script && (
                        <div className="rounded-lg border bg-card p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent">
                                <Megaphone className="h-3 w-3" /> Voiceover (lip-synced)
                            </div>
                            <p className="font-serif italic text-foreground/90">"{scene.voiceover_script}"</p>
                        </div>
                    )}
                    <details className="group">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            View prompts
                        </summary>
                        <div className="mt-2 space-y-2">
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Image prompt</div>
                                <pre className="mt-1 whitespace-pre-wrap rounded-md border bg-card p-2 text-[11px] leading-relaxed">{scene.image_prompt}</pre>
                            </div>
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Video prompt</div>
                                <pre className="mt-1 whitespace-pre-wrap rounded-md border bg-card p-2 text-[11px] leading-relaxed">{scene.video_prompt}</pre>
                            </div>
                        </div>
                    </details>
                    {state.error && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                            {state.error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MediaSlot({
    kind, url, loading, loadingLabel, aspectRatio,
}: { kind: 'image' | 'video'; url?: string; loading?: boolean; loadingLabel?: string; aspectRatio: string }) {
    return (
        <div
            className="grid w-full place-items-center overflow-hidden rounded-lg border bg-muted"
            style={{ aspectRatio: aspectRatio.replace(':', '/') }}
        >
            {loading ? (
                <div className="text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    {loadingLabel && (
                        <div className="mt-1 text-[10px] text-muted-foreground">{loadingLabel}</div>
                    )}
                </div>
            ) : url ? (
                kind === 'video' ? (
                    <video src={url} controls playsInline className="h-full w-full object-cover" />
                ) : (
                    <img src={url} alt="" className="h-full w-full object-cover" />
                )
            ) : (
                <div className="text-center text-[11px] text-muted-foreground">
                    <ImageIcon className="mx-auto mb-1 h-5 w-5 opacity-40" />
                    Empty
                </div>
            )}
        </div>
    );
}

function StitchCard({
    totalScenes, finishedClips, state, aspectRatio, onStitch,
}: {
    totalScenes: number;
    finishedClips: number;
    state: StitchState;
    aspectRatio: string;
    onStitch: () => void;
}) {
    const ready = finishedClips >= 2;
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                    <Combine className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm">Stitch — final video</CardTitle>
                </div>
                <Badge variant={finishedClips === totalScenes ? 'success' : 'muted'}>
                    {finishedClips}/{totalScenes} clips ready
                </Badge>
            </CardHeader>
            <Separator />
            <CardContent className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-[280px_1fr]">
                <div
                    className="grid place-items-center overflow-hidden rounded-xl border bg-muted"
                    style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                >
                    {state.loading ? (
                        <div className="text-center">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                            <div className="mt-1 text-[10px] text-muted-foreground">Stitching with ffmpeg…</div>
                        </div>
                    ) : state.url ? (
                        <video src={state.url} controls playsInline className="h-full w-full object-cover" />
                    ) : (
                        <div className="text-center text-[11px] text-muted-foreground">
                            <Combine className="mx-auto mb-1 h-5 w-5 opacity-40" />
                            Generate clips first
                        </div>
                    )}
                </div>
                <div className="space-y-3">
                    <div>
                        <h3 className="font-semibold">One MP4, all scenes back-to-back</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Combines your finished scene clips in order. Re-encodes to a uniform 720×1280@30fps if codecs/sizes differ, otherwise fast-concat.
                        </p>
                    </div>
                    {state.error && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                            {state.error}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={onStitch}
                            disabled={!ready || state.loading}
                            variant={state.url ? 'outline' : 'default'}
                        >
                            {state.loading ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Stitching…</>
                            ) : state.url ? (
                                <><RefreshCw className="h-4 w-4" /> Re-stitch</>
                            ) : (
                                <><Combine className="h-4 w-4" /> Stitch {finishedClips} clip{finishedClips === 1 ? '' : 's'}</>
                            )}
                        </Button>
                        {state.url && (
                            <Button asChild variant="ghost">
                                <a href={state.url} download="ad-final.mp4">
                                    <Download className="h-4 w-4" /> Download final
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function NoProducts() {
    return (
        <Card className="p-12 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="font-display text-xl font-semibold">Add a product first.</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                The Studio needs a product as the source of truth. Create one and upload an image to it.
            </p>
            <Button asChild className="mt-5">
                <Link href={route('products.create')}>
                    <ArrowRight className="h-4 w-4" /> Add product
                </Link>
            </Button>
        </Card>
    );
}
