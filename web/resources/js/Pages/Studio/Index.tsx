import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowRight, Brain, Check, CheckCircle2, ChevronRight, Download,
    Image as ImageIcon, Loader2, Megaphone, Package, RefreshCw, RotateCcw,
    Sparkles, Target, Upload, Video, X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

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
    id: number;
    slug: string;
    name: string;
    category: string | null;
    price: string | null;
    currency: string;
    assets: Asset[];
};
type Strategy = {
    product: { name: string; category: string; description: string; key_features: string[] };
    audience: { primary: string; psychographics: string; pain_points: string[] };
    strategy: { angle: string; rationale: string };
    format: { type: string; aspect_ratio: string; rationale: string };
    hook: string;
    cta: string;
    image_prompt: string;
    video_prompt: string;
};

type Step = 'pick' | 'analyzing' | 'strategy' | 'generating-image' | 'image-review' | 'generating-video' | 'done';

export default function StudioIndex({ products }: { products: Product[] }) {
    const [step, setStep] = useState<Step>('pick');
    const [productId, setProductId] = useState<number | null>(products[0]?.id ?? null);
    const [assetId, setAssetId] = useState<number | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
    const [language, setLanguage] = useState<'indonesian' | 'malay' | 'english'>('indonesian');
    const [strategy, setStrategy] = useState<Strategy | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const selectedProduct = useMemo(
        () => products.find((p) => p.id === productId) || null,
        [productId, products],
    );

    const stepIndex: number = useMemo(() => {
        if (step === 'pick') return 1;
        if (step === 'analyzing') return 2;
        if (step === 'strategy' || step === 'generating-image') return 3;
        if (step === 'image-review') return 4;
        return 5;
    }, [step]);

    const reset = () => {
        setStrategy(null);
        setImageUrl(null);
        setVideoUrl(null);
        setError(null);
        setStep('pick');
    };

    const onFile = (f: File) => {
        setUploadedFile(f);
        const r = new FileReader();
        r.onloadend = () => setUploadedPreview(r.result as string);
        r.readAsDataURL(f);
        setAssetId(null);
    };

    const analyze = async () => {
        if (!productId) { setError('Select a product first.'); return; }
        if (!assetId && !uploadedFile && !selectedProduct?.assets.length) {
            setError('Upload an image or pick a product asset.'); return;
        }
        setError(null);
        setStep('analyzing');
        try {
            const fd = new FormData();
            fd.append('product_id', String(productId));
            fd.append('language', language);
            if (assetId) fd.append('asset_id', String(assetId));
            if (uploadedFile) fd.append('image', uploadedFile);
            const { data } = await axios.post(route('studio.analyze'), fd);
            setStrategy(data.strategy);
            setStep('strategy');
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.message || 'Analyze failed.');
            setStep('pick');
        }
    };

    const generateImage = async () => {
        if (!productId || !strategy) return;
        setError(null);
        setStep('generating-image');
        try {
            const fd = new FormData();
            fd.append('product_id', String(productId));
            fd.append('prompt', strategy.image_prompt);
            fd.append('aspect_ratio', strategy.format.aspect_ratio || '9:16');
            if (assetId) fd.append('asset_id', String(assetId));
            if (uploadedFile) fd.append('image', uploadedFile);
            const { data } = await axios.post(route('studio.image'), fd);
            setImageUrl(data.image_url);
            setStep('image-review');
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.message || 'Image generation failed.');
            setStep('strategy');
        }
    };

    const generateVideo = async () => {
        if (!productId || !strategy || !imageUrl) return;
        setError(null);
        setStep('generating-video');
        try {
            const { data } = await axios.post(route('studio.video'), {
                product_id: productId,
                approved_image: imageUrl,
                prompt: strategy.video_prompt,
                aspect_ratio: strategy.format.aspect_ratio || '9:16',
            });
            setVideoUrl(data.video_url);
            setStep('done');
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.message || 'Video generation failed.');
            setStep('image-review');
        }
    };

    return (
        <AuthenticatedLayout header="AI Content Studio" activeKey="studio">
            <Head title="AI Content Studio" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-accent">
                            MODULE 02 · GENERATION
                        </div>
                        <h1 className="font-display text-3xl font-semibold sm:text-4xl">AI Content Studio</h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Not a generator. <em className="font-serif">A strategist.</em> Image → strategy → image → video. Approve at each step.
                        </p>
                    </div>
                    {(strategy || imageUrl || videoUrl) && (
                        <Button variant="ghost" size="sm" onClick={reset}>
                            <RotateCcw className="h-4 w-4" /> Start over
                        </Button>
                    )}
                </div>

                {/* Stepper — horizontal scroll on mobile */}
                <div className="mb-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 sm:mb-8">
                    <div className="flex min-w-max items-center gap-2 sm:gap-3">
                        <StepPill index={1} current={stepIndex} label="Pick" icon={Upload} />
                        <Connector active={stepIndex >= 2} />
                        <StepPill index={2} current={stepIndex} label="Analyze" icon={Brain} />
                        <Connector active={stepIndex >= 3} />
                        <StepPill index={3} current={stepIndex} label="Image" icon={ImageIcon} />
                        <Connector active={stepIndex >= 4} />
                        <StepPill index={4} current={stepIndex} label="Approve" icon={Check} />
                        <Connector active={stepIndex >= 5} />
                        <StepPill index={5} current={stepIndex} label="Video" icon={Video} />
                    </div>
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
                                                <SelectItem key={p.id} value={p.id.toString()}>
                                                    {p.name}
                                                </SelectItem>
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
                                    <Target className="h-4 w-4 text-accent" />
                                    <CardTitle className="text-sm">Language</CardTitle>
                                </CardHeader>
                                <CardContent>
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
                                                className="text-sm"
                                            >
                                                {l.label}
                                            </Button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Button
                                onClick={analyze}
                                disabled={step === 'analyzing'}
                                size="lg"
                                className="w-full"
                            >
                                {step === 'analyzing' ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
                                ) : strategy ? (
                                    <><RefreshCw className="h-4 w-4" /> Re-analyze</>
                                ) : (
                                    <><Brain className="h-4 w-4" /> Analyze image</>
                                )}
                            </Button>
                        </aside>

                        {/* Pipeline */}
                        <main className="space-y-4 lg:col-span-8 lg:space-y-5">
                            {step === 'pick' && !strategy && <PickHint />}

                            {step === 'analyzing' && (
                                <LoadingCard
                                    title="Analyzing image…"
                                    subtitle="Vision LLM identifies the product, audience, and best creative angle."
                                />
                            )}

                            {strategy && step !== 'analyzing' && (
                                <StrategyCard
                                    strategy={strategy}
                                    generating={step === 'generating-image'}
                                    hasImage={!!imageUrl}
                                    onGenerate={generateImage}
                                />
                            )}

                            {step === 'generating-image' && (
                                <LoadingCard title="Generating image…" subtitle="Compositing product reference with the chosen prompt." />
                            )}

                            {imageUrl && (step === 'image-review' || step === 'generating-video' || step === 'done') && (
                                <ImageReviewCard
                                    url={imageUrl}
                                    aspectRatio={strategy?.format.aspect_ratio || '9:16'}
                                    onRegenerate={generateImage}
                                    onApprove={generateVideo}
                                    videoStarted={step === 'generating-video' || step === 'done'}
                                />
                            )}

                            {step === 'generating-video' && (
                                <LoadingCard title="Rendering 8-second video…" subtitle="Image-to-video can take 1–3 minutes." long />
                            )}

                            {videoUrl && step === 'done' && (
                                <VideoCard
                                    url={videoUrl}
                                    aspectRatio={strategy?.format.aspect_ratio || '9:16'}
                                    onRegenerate={generateVideo}
                                />
                            )}
                        </main>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

// ============================================================
// Sub-components
// ============================================================
function StepPill({ index, current, label, icon: Icon }: { index: number; current: number; label: string; icon: any }) {
    const done = current > index;
    const active = current === index;
    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                done
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : active
                        ? 'bg-primary text-primary-foreground shadow-soft'
                        : 'bg-muted text-muted-foreground',
            )}
        >
            {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            <span>{label}</span>
        </div>
    );
}

function Connector({ active }: { active: boolean }) {
    return <div className={cn('h-px w-6 sm:flex-1', active ? 'bg-emerald-300' : 'bg-border')} />;
}

function PickHint() {
    return (
        <Card className="grid min-h-[300px] place-items-center p-8 text-center sm:min-h-[400px] sm:p-12">
            <div>
                <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-accent/10">
                    <Sparkles className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-display text-xl font-semibold sm:text-2xl">Pick a product + image to start.</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    The AI strategist inspects the image, picks an angle and format, then generates an ad image and (after you approve) a short video.
                </p>
            </div>
        </Card>
    );
}

function LoadingCard({ title, subtitle, long }: { title: string; subtitle: string; long?: boolean }) {
    return (
        <Card className="flex items-start gap-5 p-6 sm:p-8">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/10">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
            <div className="flex-1">
                <div className="font-semibold">{title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
                {long && (
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full animate-pulse bg-accent" style={{ width: '60%' }} />
                    </div>
                )}
            </div>
        </Card>
    );
}

function StrategyCard({
    strategy, generating, hasImage, onGenerate,
}: { strategy: Strategy; generating: boolean; hasImage: boolean; onGenerate: () => void }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm">Strategy</CardTitle>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Step 2 of 5</span>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-6 pt-6">
                <Pane label="Product">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                        <div className="text-lg font-semibold">{strategy.product.name}</div>
                        <div className="text-xs text-muted-foreground">{strategy.product.category}</div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{strategy.product.description}</p>
                    {strategy.product.key_features?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {strategy.product.key_features.map((f) => (
                                <Badge key={f} variant="muted" className="font-normal">
                                    {f}
                                </Badge>
                            ))}
                        </div>
                    )}
                </Pane>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Pane label="Audience">
                        <div className="text-sm font-medium">{strategy.audience.primary}</div>
                        <p className="mt-1 text-xs text-muted-foreground">{strategy.audience.psychographics}</p>
                        {strategy.audience.pain_points?.length > 0 && (
                            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                {strategy.audience.pain_points.map((p) => <li key={p}>· {p}</li>)}
                            </ul>
                        )}
                    </Pane>
                    <Pane label="Angle">
                        <Badge variant="accent" className="uppercase tracking-wide">
                            {strategy.strategy.angle}
                        </Badge>
                        <p className="mt-2 text-xs text-muted-foreground">{strategy.strategy.rationale}</p>
                    </Pane>
                    <Pane label="Format">
                        <div className="flex items-center gap-2">
                            <Badge variant="accent">{strategy.format.type.replace(/_/g, ' ')}</Badge>
                            <Badge variant="muted" className="font-mono">{strategy.format.aspect_ratio}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{strategy.format.rationale}</p>
                    </Pane>
                    <Pane label="Hook + CTA">
                        <div className="font-serif text-base italic text-foreground/80">"{strategy.hook}"</div>
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Megaphone className="h-3.5 w-3.5" /> {strategy.cta}
                        </div>
                    </Pane>
                </div>

                <details className="group">
                    <summary className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                        View raw image &amp; video prompts
                    </summary>
                    <div className="mt-3 space-y-3">
                        <div>
                            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Image prompt</div>
                            <pre className="whitespace-pre-wrap rounded-lg border bg-muted p-3 text-xs leading-relaxed">
                                {strategy.image_prompt}
                            </pre>
                        </div>
                        <div>
                            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Video prompt</div>
                            <pre className="whitespace-pre-wrap rounded-lg border bg-muted p-3 text-xs leading-relaxed">
                                {strategy.video_prompt}
                            </pre>
                        </div>
                    </div>
                </details>
            </CardContent>
            <Separator />
            <div className="flex flex-col items-stretch gap-3 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="text-xs text-muted-foreground">Happy with this direction?</div>
                <Button
                    onClick={onGenerate}
                    disabled={generating}
                    variant={hasImage ? 'outline' : 'default'}
                >
                    {generating ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                    ) : hasImage ? (
                        <><RefreshCw className="h-4 w-4" /> Regenerate image</>
                    ) : (
                        <><Sparkles className="h-4 w-4" /> Generate image</>
                    )}
                </Button>
            </div>
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

function ImageReviewCard({
    url, aspectRatio, onRegenerate, onApprove, videoStarted,
}: { url: string; aspectRatio: string; onRegenerate: () => void; onApprove: () => void; videoStarted: boolean }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm">Image · review &amp; approve</CardTitle>
                    <Badge variant="muted" className="font-mono">{aspectRatio}</Badge>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Step 3–4 of 5</span>
            </CardHeader>
            <Separator />
            <CardContent className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-[280px_1fr]">
                <div
                    className="overflow-hidden rounded-xl border bg-muted"
                    style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold">Does this image work?</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Approve to kick off image-to-video, or regenerate.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={onRegenerate}>
                            <RefreshCw className="h-4 w-4" /> Regenerate
                        </Button>
                        <Button asChild variant="outline">
                            <a href={url} download="approved-image.png">
                                <Download className="h-4 w-4" /> Download
                            </a>
                        </Button>
                        <Button
                            onClick={onApprove}
                            disabled={videoStarted}
                            variant={videoStarted ? 'secondary' : 'success'}
                        >
                            {videoStarted ? (
                                <><CheckCircle2 className="h-4 w-4" /> Approved · generating video</>
                            ) : (
                                <><Check className="h-4 w-4" /> Approve &amp; generate video</>
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function VideoCard({ url, aspectRatio, onRegenerate }: { url: string; aspectRatio: string; onRegenerate: () => void }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm">Video · ready</CardTitle>
                    <Badge variant="success">DONE</Badge>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Step 5 of 5</span>
            </CardHeader>
            <Separator />
            <CardContent className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-[280px_1fr]">
                <div
                    className="overflow-hidden rounded-xl border bg-black"
                    style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                >
                    <video src={url} controls playsInline className="h-full w-full object-cover" />
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold">Your clip is ready.</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Download it, post it, or re-render.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild>
                            <a href={url} download="scene.mp4">
                                <Download className="h-4 w-4" /> Download MP4
                            </a>
                        </Button>
                        <Button variant="outline" onClick={onRegenerate}>
                            <RefreshCw className="h-4 w-4" /> Regenerate video
                        </Button>
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
