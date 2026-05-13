import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowRight, Brain, Check, CheckCircle2, ChevronRight, Download,
    Image as ImageIcon, Loader2, Megaphone, Package, RefreshCw, RotateCcw,
    Sparkles, Target, Upload, Video, X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

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
        if (!productId) {
            setError('Select a product first.');
            return;
        }
        if (!assetId && !uploadedFile && !selectedProduct?.assets.length) {
            setError('Upload an image or pick a product asset.');
            return;
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

            <div className="px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="text-[11px] tracking-[0.2em] text-brand-600 font-semibold mb-2">
                            MODULE 02 · GENERATION
                        </div>
                        <h1 className="font-display text-4xl font-semibold">AI Content Studio</h1>
                        <p className="text-ink-900/60 mt-1 text-sm max-w-2xl">
                            Not a generator. <em className="font-serif">A strategist.</em> Image → strategy → image → video. Approve at each step.
                        </p>
                    </div>
                    {(strategy || imageUrl || videoUrl) && (
                        <button
                            onClick={reset}
                            className="text-sm text-ink-900/60 hover:text-ink-900 inline-flex items-center gap-1.5"
                        >
                            <RotateCcw className="w-4 h-4" /> Start over
                        </button>
                    )}
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-3 text-sm mb-8">
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

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-flame-50 border border-flame-200 text-flame-700 text-sm flex items-start gap-2">
                        <X className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="flex-1 whitespace-pre-wrap">{error}</div>
                        <button onClick={() => setError(null)} className="text-flame-500 hover:text-flame-700 text-xs">
                            Dismiss
                        </button>
                    </div>
                )}

                {products.length === 0 ? (
                    <NoProducts />
                ) : (
                    <div className="grid grid-cols-12 gap-6">
                        {/* Inputs */}
                        <aside className="col-span-12 lg:col-span-4 space-y-5">
                            <Card title="Product" icon={Package}>
                                <select
                                    value={productId || ''}
                                    onChange={(e) => {
                                        setProductId(Number(e.target.value));
                                        setAssetId(null);
                                        reset();
                                    }}
                                    className="w-full px-3 py-2.5 text-sm rounded-md bg-white border border-ink-200"
                                >
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>

                                <div className="mt-3 text-[11px] text-ink-900/50">
                                    {selectedProduct?.category}
                                    {selectedProduct?.price && ` · ${selectedProduct.currency} ${selectedProduct.price}`}
                                </div>
                            </Card>

                            <Card title="Reference Image" icon={ImageIcon}>
                                {selectedProduct?.assets && selectedProduct.assets.length > 0 && !uploadedFile && (
                                    <div className="mb-3">
                                        <div className="text-[11px] text-ink-900/50 mb-2">Use existing asset:</div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {selectedProduct.assets.map((a) => (
                                                <button
                                                    key={a.id}
                                                    type="button"
                                                    onClick={() => setAssetId(a.id === assetId ? null : a.id)}
                                                    className={`aspect-square rounded-lg overflow-hidden border-2 ${
                                                        assetId === a.id ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-ink-200'
                                                    }`}
                                                >
                                                    <img src={a.url} alt="" className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="text-[11px] text-ink-900/50 mb-2">Or upload new:</div>
                                <div
                                    onClick={() => fileRef.current?.click()}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const f = e.dataTransfer.files?.[0];
                                        if (f && f.type.startsWith('image/')) onFile(f);
                                    }}
                                    className="border-2 border-dashed border-ink-200 rounded-lg p-4 text-center hover:border-brand-500 hover:bg-brand-50/30 transition cursor-pointer"
                                >
                                    {uploadedPreview ? (
                                        <img src={uploadedPreview} alt="" className="max-h-32 mx-auto" />
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6 text-ink-900/30 mx-auto mb-1" />
                                            <div className="text-xs text-ink-900/70">Drop image here</div>
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
                            </Card>

                            <Card title="Language" icon={Target}>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {([
                                        { id: 'indonesian', label: '🇮🇩 ID' },
                                        { id: 'malay', label: '🇲🇾 MY' },
                                        { id: 'english', label: '🇬🇧 EN' },
                                    ] as const).map((l) => (
                                        <button
                                            key={l.id}
                                            type="button"
                                            onClick={() => setLanguage(l.id)}
                                            className={`px-2 py-2 rounded-md text-sm font-medium transition ${
                                                language === l.id
                                                    ? 'bg-ink-900 text-white'
                                                    : 'bg-ink-50 text-ink-900/70 hover:bg-ink-100'
                                            }`}
                                        >
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            <button
                                onClick={analyze}
                                disabled={step === 'analyzing'}
                                className="w-full py-3 rounded-xl font-semibold text-sm bg-ink-900 text-white hover:bg-ink-950 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                            >
                                {step === 'analyzing' ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
                                ) : strategy ? (
                                    <><RefreshCw className="w-4 h-4" /> Re-analyze</>
                                ) : (
                                    <><Brain className="w-4 h-4" /> Analyze image</>
                                )}
                            </button>
                        </aside>

                        {/* Pipeline */}
                        <main className="col-span-12 lg:col-span-8 space-y-5">
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
                                    isRegenerating={false}
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
    const cls = done
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
        : active
            ? 'bg-ink-900 text-white shadow-sm'
            : 'bg-ink-100 text-ink-900/50';
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${cls}`}>
            {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
            <span>{label}</span>
        </div>
    );
}

function Connector({ active }: { active: boolean }) {
    return <div className={`h-px flex-1 ${active ? 'bg-emerald-300' : 'bg-ink-200'}`} />;
}

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl shadow-soft border border-ink-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-ink-100 flex items-center gap-2">
                <Icon className="w-4 h-4 text-brand-600" />
                <h2 className="text-sm font-semibold">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function PickHint() {
    return (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-soft p-12 text-center min-h-[400px] grid place-items-center">
            <div>
                <div className="w-16 h-16 bg-brand-50 rounded-2xl mx-auto mb-5 grid place-items-center">
                    <Sparkles className="w-8 h-8 text-brand-400" />
                </div>
                <h3 className="font-display text-2xl font-semibold">Pick a product + image to start.</h3>
                <p className="text-sm text-ink-900/60 mt-2 max-w-md mx-auto">
                    The AI strategist inspects the image, picks an angle and format, then generates an ad image and (after you approve) a short video.
                </p>
            </div>
        </div>
    );
}

function LoadingCard({ title, subtitle, long }: { title: string; subtitle: string; long?: boolean }) {
    return (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-soft p-8 flex items-start gap-5">
            <div className="w-12 h-12 rounded-full bg-brand-50 grid place-items-center shrink-0">
                <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
            </div>
            <div className="flex-1">
                <div className="font-semibold">{title}</div>
                <div className="text-sm text-ink-900/60 mt-1">{subtitle}</div>
                {long && (
                    <div className="mt-4 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 animate-pulse" style={{ width: '60%' }} />
                    </div>
                )}
            </div>
        </div>
    );
}

function StrategyCard({
    strategy, generating, hasImage, onGenerate,
}: { strategy: Strategy; generating: boolean; hasImage: boolean; onGenerate: () => void }) {
    return (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-soft overflow-hidden">
            <div className="px-5 py-3.5 border-b border-ink-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-brand-600" />
                    <h2 className="text-sm font-semibold">Strategy</h2>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-ink-900/40">Step 2 of 5</span>
            </div>

            <div className="p-6 space-y-6">
                <Pane label="Product">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                        <div className="text-lg font-semibold">{strategy.product.name}</div>
                        <div className="text-xs text-ink-900/50">{strategy.product.category}</div>
                    </div>
                    <p className="text-sm text-ink-900/60 mt-1">{strategy.product.description}</p>
                    {strategy.product.key_features?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {strategy.product.key_features.map((f) => (
                                <span key={f} className="px-2 py-0.5 text-[11px] rounded-full bg-ink-100 text-ink-900/70">
                                    {f}
                                </span>
                            ))}
                        </div>
                    )}
                </Pane>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Pane label="Audience">
                        <div className="text-sm font-medium">{strategy.audience.primary}</div>
                        <p className="text-xs text-ink-900/50 mt-1">{strategy.audience.psychographics}</p>
                        {strategy.audience.pain_points?.length > 0 && (
                            <ul className="mt-2 space-y-1 text-xs text-ink-900/60">
                                {strategy.audience.pain_points.map((p) => <li key={p}>· {p}</li>)}
                            </ul>
                        )}
                    </Pane>
                    <Pane label="Angle">
                        <div className="inline-block px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 text-[11px] font-semibold uppercase tracking-wide">
                            {strategy.strategy.angle}
                        </div>
                        <p className="text-xs text-ink-900/60 mt-2">{strategy.strategy.rationale}</p>
                    </Pane>
                    <Pane label="Format">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 text-[11px] font-semibold">
                                {strategy.format.type.replace(/_/g, ' ')}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-ink-100 text-ink-900/70 text-[10px] font-mono">
                                {strategy.format.aspect_ratio}
                            </span>
                        </div>
                        <p className="text-xs text-ink-900/60 mt-2">{strategy.format.rationale}</p>
                    </Pane>
                    <Pane label="Hook + CTA">
                        <div className="font-serif italic text-base text-ink-900/80">"{strategy.hook}"</div>
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-900/60">
                            <Megaphone className="w-3.5 h-3.5" /> {strategy.cta}
                        </div>
                    </Pane>
                </div>

                <details className="group">
                    <summary className="cursor-pointer text-xs text-ink-900/50 hover:text-ink-900 flex items-center gap-1">
                        <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
                        View raw image &amp; video prompts
                    </summary>
                    <div className="mt-3 space-y-3">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-ink-900/40 mb-1">Image prompt</div>
                            <pre className="text-xs bg-ink-50 border border-ink-200 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed">
                                {strategy.image_prompt}
                            </pre>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-ink-900/40 mb-1">Video prompt</div>
                            <pre className="text-xs bg-ink-50 border border-ink-200 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed">
                                {strategy.video_prompt}
                            </pre>
                        </div>
                    </div>
                </details>
            </div>

            <div className="px-6 py-4 border-t border-ink-100 bg-ink-50/60 flex items-center justify-between">
                <div className="text-xs text-ink-900/50">Happy with this direction?</div>
                <button
                    onClick={onGenerate}
                    disabled={generating}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
                        generating
                            ? 'bg-ink-200 text-ink-900/50 cursor-not-allowed'
                            : hasImage
                                ? 'bg-white border border-ink-300 text-ink-900 hover:bg-ink-100'
                                : 'bg-ink-900 text-white hover:bg-ink-950 shadow-soft'
                    }`}
                >
                    {generating ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                    ) : hasImage ? (
                        <><RefreshCw className="w-4 h-4" /> Regenerate image</>
                    ) : (
                        <><Sparkles className="w-4 h-4" /> Generate image</>
                    )}
                </button>
            </div>
        </div>
    );
}

function Pane({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-[10px] uppercase tracking-widest text-brand-600 font-semibold mb-2">{label}</div>
            {children}
        </div>
    );
}

function ImageReviewCard({
    url, aspectRatio, onRegenerate, onApprove, isRegenerating, videoStarted,
}: { url: string; aspectRatio: string; onRegenerate: () => void; onApprove: () => void; isRegenerating: boolean; videoStarted: boolean }) {
    return (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-soft overflow-hidden">
            <div className="px-5 py-3.5 border-b border-ink-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-brand-600" />
                    <h2 className="text-sm font-semibold">Image · review &amp; approve</h2>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-900/70 font-mono">{aspectRatio}</span>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-ink-900/40">Step 3–4 of 5</span>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
                <div className="bg-ink-100 rounded-xl overflow-hidden border border-ink-200" style={{ aspectRatio: aspectRatio.replace(':', '/') }}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold">Does this image work?</h3>
                        <p className="text-sm text-ink-900/60 mt-1">
                            Approve to kick off image-to-video, or regenerate.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onRegenerate}
                            disabled={isRegenerating}
                            className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 bg-white border border-ink-300 text-ink-900 hover:bg-ink-100"
                        >
                            <RefreshCw className="w-4 h-4" /> Regenerate
                        </button>
                        <a
                            href={url}
                            download="approved-image.png"
                            className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 bg-white border border-ink-300 text-ink-900 hover:bg-ink-100"
                        >
                            <Download className="w-4 h-4" /> Download
                        </a>
                        <button
                            onClick={onApprove}
                            disabled={videoStarted}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                                videoStarted
                                    ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow'
                            }`}
                        >
                            {videoStarted ? (
                                <><CheckCircle2 className="w-4 h-4" /> Approved · generating video</>
                            ) : (
                                <><Check className="w-4 h-4" /> Approve &amp; generate video</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VideoCard({ url, aspectRatio, onRegenerate }: { url: string; aspectRatio: string; onRegenerate: () => void }) {
    return (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-soft overflow-hidden">
            <div className="px-5 py-3.5 border-b border-ink-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-brand-600" />
                    <h2 className="text-sm font-semibold">Video · ready</h2>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">DONE</span>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-ink-900/40">Step 5 of 5</span>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
                <div className="bg-black rounded-xl overflow-hidden border border-ink-200" style={{ aspectRatio: aspectRatio.replace(':', '/') }}>
                    <video src={url} controls playsInline className="w-full h-full object-cover" />
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold">Your clip is ready.</h3>
                        <p className="text-sm text-ink-900/60 mt-1">Download it, post it, or re-render.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <a
                            href={url}
                            download="scene.mp4"
                            className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 bg-ink-900 text-white hover:bg-ink-950 shadow-soft"
                        >
                            <Download className="w-4 h-4" /> Download MP4
                        </a>
                        <button
                            onClick={onRegenerate}
                            className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 bg-white border border-ink-300 text-ink-900 hover:bg-ink-100"
                        >
                            <RefreshCw className="w-4 h-4" /> Regenerate video
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NoProducts() {
    return (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-soft p-12 text-center">
            <Package className="w-12 h-12 text-ink-900/30 mx-auto mb-3" />
            <h3 className="font-display text-xl font-semibold">Add a product first.</h3>
            <p className="text-sm text-ink-900/60 mt-2 max-w-md mx-auto">
                The Studio needs a product as the source of truth. Create one and upload an image to it.
            </p>
            <Link
                href={route('products.create')}
                className="mt-5 inline-flex px-5 py-2.5 text-sm font-medium rounded-md bg-ink-900 text-white hover:bg-ink-950 items-center gap-2"
            >
                <ArrowRight className="w-4 h-4" /> Add product
            </Link>
        </div>
    );
}
