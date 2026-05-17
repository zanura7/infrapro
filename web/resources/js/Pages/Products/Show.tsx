import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, ChevronDown, ChevronUp, Hash, History, Image as ImageIcon, Lightbulb, Loader2, MessageCircle, RefreshCw, RotateCcw, Sparkles, Target, Upload, Users, Video, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

type Asset = {
    id: number;
    type: 'image' | 'video' | 'logo' | 'brand_kit' | 'document';
    url: string;
    thumbnail_url: string | null;
    mime: string;
    size: number;
    tag: string | null;
    created_at: string;
};

type Version = {
    id: number;
    version: number;
    change_summary: string | null;
    snapshot: Record<string, unknown> | null;
    created_at: string;
    user?: { id: number; name: string };
};

type Job = {
    id: number;
    kind: string;
    status: string;
    output: { url?: string } | null;
    created_at: string;
};

type Product = {
    id: number;
    slug: string;
    name: string;
    sku: string | null;
    category: string | null;
    price: string | null;
    currency: string;
    description: string | null;
    usp: string[] | null;
    target_audience: string | null;
    pain_point: string | null;
    brand_voice: any;
    strategy: any;
    current_version: number;
    assets: Asset[];
    versions: Version[];
    content_jobs: Job[];
};

type Props = { product: Product };

export default function ProductShow({ product }: Props) {
    const [tab, setTab] = useState<'master' | 'assets' | 'voice' | 'strategy' | 'versions' | 'content'>('master');
    const fileRef = useRef<HTMLInputElement>(null);
    const upload = useForm<{ files: File[]; tag: string }>({ files: [], tag: '' });

    const onFiles = (files: FileList | null) => {
        if (!files) return;
        upload.transform((data) => ({ ...data, files: Array.from(files) }));
        upload.post(route('product-assets.store', product.slug), {
            forceFormData: true,
            onSuccess: () => upload.reset(),
        });
    };

    return (
        <AuthenticatedLayout header={product.name} activeKey="products">
            <Head title={product.name} />

            {/* Hero strip */}
            <div className="bg-ink-950 text-white px-8 py-6 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-brand-500/15 blur-3xl" />
                <div className="relative flex items-end justify-between">
                    <div>
                        <Link
                            href={route('products.index')}
                            className="text-[11px] text-white/40 hover:text-white inline-flex items-center gap-1 mb-3"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Product Hub
                        </Link>
                        <div className="text-[11px] tracking-widest text-brand-400">PRODUCT</div>
                        <h1 className="font-display text-3xl font-semibold">{product.name}</h1>
                        <div className="text-xs text-white/50 mt-1">
                            {product.category || 'Uncategorised'}
                            {product.price && ` · ${product.currency} ${product.price}`}
                            {' · '}{product.assets.length} assets · {product.content_jobs.length} jobs
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-3 py-2 text-xs font-medium rounded-md bg-white/10 ring-1 ring-white/10 inline-flex items-center gap-2">
                            <History className="w-3.5 h-3.5" /> v{product.current_version}
                        </span>
                        <Link
                            href={route('studio.index')}
                            className="px-3 py-2 text-xs font-medium rounded-md bg-brand-500 hover:bg-brand-600 text-white inline-flex items-center gap-2"
                        >
                            <Sparkles className="w-3.5 h-3.5" /> Generate content
                        </Link>
                    </div>
                </div>

                <div className="relative flex gap-1 mt-8 -mb-6 text-sm">
                    {(['master', 'assets', 'voice', 'strategy', 'versions', 'content'] as const).map((t) => {
                        const labels: Record<typeof t, string> = {
                            master: 'Master Info',
                            assets: 'Asset Library',
                            voice: 'Brand Voice',
                            strategy: 'AI Strategy',
                            versions: 'Versions',
                            content: 'Linked Content',
                        };
                        const counts: Record<typeof t, number | undefined> = {
                            master: undefined,
                            assets: product.assets.length,
                            voice: undefined,
                            strategy: undefined,
                            versions: product.versions.length,
                            content: product.content_jobs.length,
                        };
                        const active = tab === t;
                        return (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-4 py-2.5 rounded-t-lg ${
                                    active
                                        ? 'bg-ink-50 text-ink-900 font-medium'
                                        : 'text-white/60 hover:text-white'
                                }`}
                            >
                                {labels[t]}
                                {counts[t] !== undefined && (
                                    <span className={`ml-1.5 text-[10px] font-mono ${active ? 'text-ink-900/40' : 'text-white/40'}`}>
                                        {counts[t]}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-8 py-8">
                {tab === 'master' && <MasterPane product={product} />}
                {tab === 'assets' && (
                    <AssetsPane
                        product={product}
                        onUploadClick={() => fileRef.current?.click()}
                        uploading={upload.processing}
                    />
                )}
                {tab === 'voice' && <VoicePane product={product} />}
                {tab === 'strategy' && <StrategyPane product={product} />}
                {tab === 'versions' && <VersionsPane versions={product.versions} productSlug={product.slug} />}
                {tab === 'content' && <ContentPane jobs={product.content_jobs} />}

                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => onFiles(e.target.files)}
                />
            </div>
        </AuthenticatedLayout>
    );
}

function MasterPane({ product }: { product: Product }) {
    return (
        <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-ink-200 shadow-soft p-6">
                <h3 className="font-display text-xl font-semibold mb-5">Product master</h3>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                    <Field label="NAME">{product.name}</Field>
                    <Field label="SKU">{product.sku || '—'}</Field>
                    <Field label="CATEGORY">{product.category || '—'}</Field>
                    <Field label="PRICE">{product.price ? `${product.currency} ${product.price}` : '—'}</Field>
                    {product.description && (
                        <div className="col-span-2">
                            <dt className="text-[10px] tracking-widest text-brand-600 mb-1">DESCRIPTION</dt>
                            <dd className="text-ink-900/80 leading-relaxed">{product.description}</dd>
                        </div>
                    )}
                    {product.usp && product.usp.length > 0 && (
                        <div className="col-span-2">
                            <dt className="text-[10px] tracking-widest text-brand-600 mb-1">USP</dt>
                            <dd className="flex flex-wrap gap-1.5">
                                {product.usp.map((u) => (
                                    <span key={u} className="px-2 py-0.5 text-xs rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                                        {u}
                                    </span>
                                ))}
                            </dd>
                        </div>
                    )}
                    {product.target_audience && (
                        <div className="col-span-2">
                            <dt className="text-[10px] tracking-widest text-brand-600 mb-1">TARGET AUDIENCE</dt>
                            <dd>{product.target_audience}</dd>
                        </div>
                    )}
                    {product.pain_point && (
                        <div className="col-span-2">
                            <dt className="text-[10px] tracking-widest text-brand-600 mb-1">PAIN POINT</dt>
                            <dd>{product.pain_point}</dd>
                        </div>
                    )}
                </dl>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-[10px] tracking-widest text-brand-600 mb-1">{label}</dt>
            <dd>{children}</dd>
        </div>
    );
}

function AssetsPane({
    product, onUploadClick, uploading,
}: { product: Product; onUploadClick: () => void; uploading: boolean }) {
    type Filter = 'all' | 'image' | 'video';
    const [filter, setFilter] = useState<Filter>('all');
    const [lightbox, setLightbox] = useState<Asset | null>(null);

    const visible = product.assets.filter((a) => {
        if (filter === 'all') return true;
        return a.type === filter;
    });

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-display text-xl font-semibold">Asset library</h3>
                    <p className="text-xs text-ink-900/50">{product.assets.length} files</p>
                </div>
                <button
                    onClick={onUploadClick}
                    disabled={uploading}
                    className="px-3 py-2 text-xs font-medium rounded-md bg-ink-900 text-white hover:bg-ink-950 inline-flex items-center gap-2 disabled:opacity-50"
                >
                    <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Upload'}
                </button>
            </div>

            {/* Filter buttons */}
            {product.assets.length > 0 && (
                <div className="flex gap-2 mb-5">
                    {(['all', 'image', 'video'] as Filter[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 text-xs font-medium rounded-full border transition ${
                                filter === f
                                    ? 'bg-ink-900 text-white border-ink-900'
                                    : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'
                            }`}
                        >
                            {f === 'all' ? 'All' : f === 'image' ? 'Images' : 'Videos'}
                            <span className="ml-1.5 text-[10px] opacity-60">
                                {f === 'all'
                                    ? product.assets.length
                                    : product.assets.filter((a) => a.type === f).length}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {product.assets.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-ink-200 p-12 text-center">
                    <Upload className="w-10 h-10 text-ink-900/30 mx-auto mb-3" />
                    <p className="text-sm text-ink-900/70">No assets yet</p>
                    <p className="text-[11px] text-ink-900/40 mt-1">Upload images or videos to use as reference for AI</p>
                </div>
            ) : visible.length === 0 ? (
                <p className="text-sm text-ink-900/40 py-8 text-center">No {filter}s in this library.</p>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {visible.map((a) => (
                        <div
                            key={a.id}
                            className="aspect-square rounded-lg overflow-hidden border border-ink-200 bg-ink-100 relative group cursor-pointer"
                            onClick={() => setLightbox(a)}
                        >
                            {/* Thumbnail */}
                            {a.type === 'image' ? (
                                <img src={a.thumbnail_url || a.url} alt="" className="w-full h-full object-cover" />
                            ) : a.type === 'video' ? (
                                <div className="w-full h-full grid place-items-center text-ink-900/60">
                                    <Video className="w-8 h-8" />
                                </div>
                            ) : (
                                <div className="w-full h-full grid place-items-center text-ink-900/60">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                            )}

                            {/* Type badge */}
                            <span className="absolute top-1 left-1 text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-black/60 text-white">
                                {a.type.toUpperCase()}
                            </span>

                            {/* Delete (stop propagation so click doesn't open lightbox) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Delete this asset?')) {
                                        router.delete(route('product-assets.destroy', [product.slug, a.id]));
                                    }
                                }}
                                className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setLightbox(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/80 hover:text-white"
                        onClick={() => setLightbox(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div
                        className="max-w-5xl max-h-[90vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {lightbox.type === 'image' ? (
                            <img
                                src={lightbox.url}
                                alt=""
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            />
                        ) : lightbox.type === 'video' ? (
                            <video
                                src={lightbox.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                            />
                        ) : null}
                        <div className="mt-3 text-center text-white/60 text-xs">
                            {lightbox.mime} · {(lightbox.size / 1024).toFixed(0)} KB
                            {lightbox.tag && ` · ${lightbox.tag}`}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function VoicePane({ product }: { product: Product }) {
    const v = product.brand_voice;
    if (!v) {
        return (
            <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center text-ink-900/50">
                No brand voice configured yet.
            </div>
        );
    }
    return (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-soft p-6 max-w-3xl">
            <h3 className="font-display text-xl font-semibold mb-5">Brand voice</h3>

            {v.tone && v.tone.length > 0 && (
                <div className="mb-5">
                    <div className="text-[10px] tracking-widest text-brand-600 mb-2">TONE</div>
                    <div className="flex flex-wrap gap-1.5">
                        {v.tone.map((t: string) => (
                            <span key={t} className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 text-xs">
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {v.dos && v.dos.length > 0 && (
                <div className="mb-5">
                    <div className="text-[10px] tracking-widest text-brand-600 mb-2">DO'S</div>
                    <ul className="text-sm space-y-1.5">
                        {v.dos.map((d: string) => <li key={d}>· {d}</li>)}
                    </ul>
                </div>
            )}

            {v.donts && v.donts.length > 0 && (
                <div className="mb-5">
                    <div className="text-[10px] tracking-widest text-flame-600 mb-2">DON'TS</div>
                    <ul className="text-sm space-y-1.5">
                        {v.donts.map((d: string) => <li key={d}>· {d}</li>)}
                    </ul>
                </div>
            )}

            {v.samples && v.samples.length > 0 && (
                <div>
                    <div className="text-[10px] tracking-widest text-brand-600 mb-2">SAMPLE COPY</div>
                    {v.samples.map((s: string, i: number) => (
                        <blockquote key={i} className="font-serif italic text-base text-ink-900/80 border-l-2 border-brand-500 pl-4 leading-relaxed mb-3">
                            {s}
                        </blockquote>
                    ))}
                </div>
            )}
        </div>
    );
}

function VersionsPane({ versions, productSlug }: { versions: Version[]; productSlug: string }) {
    const [diffPair, setDiffPair] = useState<[number, number] | null>(null);
    const [restoring, setRestoring] = useState(false);

    const leftVersion = diffPair ? versions.find((v) => v.id === diffPair[0]) : null;
    const rightVersion = diffPair ? versions.find((v) => v.id === diffPair[1]) : null;

    const handleRestore = (version: Version) => {
        if (!confirm(`Restore product to version ${version.version}? This creates a new version.`)) return;
        setRestoring(true);
        router.put(
            route('product-versions.restore', [productSlug, version.id]),
            {},
            { onFinish: () => setRestoring(false) },
        );
    };

    return (
        <div className="space-y-6">
            {/* Version list */}
            <div className="bg-white rounded-2xl border border-ink-200 shadow-soft overflow-hidden">
                <ul className="divide-y divide-ink-100">
                    {versions.map((v, idx) => (
                        <li key={v.id} className="px-6 py-4 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-ink-100 grid place-items-center text-xs font-mono">
                                v{v.version}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium">{v.change_summary || 'No description'}</div>
                                <div className="text-[11px] text-ink-900/50">
                                    by {v.user?.name || 'system'} · {new Date(v.created_at).toLocaleString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Compare with previous version */}
                                {idx < versions.length - 1 && (
                                    <button
                                        onClick={() => setDiffPair([versions[idx + 1].id, v.id])}
                                        className="text-[11px] px-2.5 py-1 rounded-md border border-ink-200 hover:border-ink-400 text-ink-600 transition"
                                    >
                                        Diff
                                    </button>
                                )}
                                {/* Restore */}
                                {idx > 0 && (
                                    <button
                                        onClick={() => handleRestore(v)}
                                        disabled={restoring}
                                        className="text-[11px] px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 inline-flex items-center gap-1 transition disabled:opacity-50"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Restore
                                    </button>
                                )}
                                {idx === 0 && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                                        Current
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Diff viewer */}
            {leftVersion && rightVersion && (
                <SnapshotDiff
                    left={leftVersion}
                    right={rightVersion}
                    onClose={() => setDiffPair(null)}
                />
            )}
        </div>
    );
}

function SnapshotDiff({
    left,
    right,
    onClose,
}: {
    left: Version;
    right: Version;
    onClose: () => void;
}) {
    const lSnap = left.snapshot ?? {};
    const rSnap = right.snapshot ?? {};
    const allKeys = Array.from(new Set([...Object.keys(lSnap), ...Object.keys(rSnap)])).sort();

    const serialize = (val: unknown): string => {
        if (val === null || val === undefined) return '—';
        if (typeof val === 'object') return JSON.stringify(val, null, 2);
        return String(val);
    };

    return (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
                <h4 className="font-display font-semibold text-sm">
                    Comparing v{left.version} → v{right.version}
                </h4>
                <button onClick={onClose} className="text-ink-400 hover:text-ink-700">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left bg-ink-50">
                            <th className="px-4 py-2 font-medium text-ink-500 w-1/5">Field</th>
                            <th className="px-4 py-2 font-medium text-ink-500 w-2/5">v{left.version}</th>
                            <th className="px-4 py-2 font-medium text-ink-500 w-2/5">v{right.version}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                        {allKeys.map((key) => {
                            const lVal = serialize(lSnap[key]);
                            const rVal = serialize(rSnap[key]);
                            const changed = lVal !== rVal;
                            return (
                                <tr key={key} className={changed ? 'bg-amber-50/50' : ''}>
                                    <td className="px-4 py-2 font-mono text-ink-500">{key}</td>
                                    <td className={`px-4 py-2 whitespace-pre-wrap break-words ${changed ? 'text-red-700' : 'text-ink-700'}`}>
                                        {lVal}
                                    </td>
                                    <td className={`px-4 py-2 whitespace-pre-wrap break-words ${changed ? 'text-emerald-700' : 'text-ink-700'}`}>
                                        {rVal}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ContentPane({ jobs }: { jobs: Job[] }) {
    if (jobs.length === 0) {
        return (
            <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center text-ink-900/50">
                No content generated for this product yet.
            </div>
        );
    }
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {jobs.map((j) => (
                <div key={j.id} className="bg-white rounded-xl border border-ink-200 overflow-hidden">
                    {j.output?.url && j.kind === 'poster' && (
                        <img src={j.output.url} alt="" className="w-full aspect-[4/5] object-cover" />
                    )}
                    {j.output?.url && j.kind === 'video' && (
                        <video src={j.output.url} controls className="w-full aspect-[4/5] object-cover" />
                    )}
                    <div className="p-3">
                        <div className="text-sm font-medium capitalize">{j.kind}</div>
                        <div className="text-[11px] text-ink-900/50">
                            {j.status} · {new Date(j.created_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function StrategyPane({ product }: { product: Product }) {
    const [generating, setGenerating] = useState(false);
    const [strategy, setStrategy] = useState<any>(product.strategy);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch(route('products.strategy.generate', product.slug), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            const data = await res.json();
            if (data.success) {
                setStrategy(data.strategy);
                router.reload({ only: ['product'] });
            } else {
                alert('Failed to generate strategy: ' + data.error);
            }
        } catch (e) {
            alert('Failed to generate strategy.');
        } finally {
            setGenerating(false);
        }
    };

    if (!strategy && !generating) {
        return (
            <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center">
                <Sparkles className="w-10 h-10 text-brand-300 mx-auto mb-4" />
                <h3 className="font-display text-lg font-medium text-ink-900 mb-2">No AI Strategy Yet</h3>
                <p className="text-ink-500 text-sm mb-6 max-w-sm mx-auto">
                    Generate a content strategy including value prop, personas, and hashtags based on your product details.
                </p>
                <button
                    onClick={handleGenerate}
                    className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
                >
                    <Sparkles className="w-4 h-4" /> Generate Strategy
                </button>
            </div>
        );
    }

    if (generating) {
        return (
            <div className="bg-white border border-ink-200 rounded-2xl p-16 text-center">
                <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-4" />
                <h3 className="font-display text-lg font-medium text-ink-900 mb-1">Generating Strategy...</h3>
                <p className="text-ink-500 text-sm">Our AI is analyzing your product and building a custom content plan.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-semibold">AI Content Strategy</h3>
                <button
                    onClick={handleGenerate}
                    className="px-3 py-2 text-xs font-medium rounded-md bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 inline-flex items-center gap-2"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Value Prop & Tone */}
                <div className="col-span-12 md:col-span-8 space-y-6">
                    <div className="bg-white rounded-2xl border border-ink-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 text-[10px] tracking-widest text-brand-600 mb-3">
                            <Target className="w-4 h-4" /> CORE VALUE PROPOSITION
                        </div>
                        <p className="text-lg font-medium text-ink-900 leading-snug">{strategy.value_proposition}</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-ink-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 text-[10px] tracking-widest text-brand-600 mb-4">
                            <Lightbulb className="w-4 h-4" /> KEY SELLING POINTS
                        </div>
                        <ul className="space-y-3">
                            {strategy.selling_points?.map((pt: string, idx: number) => (
                                <li key={idx} className="flex gap-3 text-sm text-ink-800">
                                    <span className="shrink-0 w-5 h-5 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-medium mt-0.5">{idx + 1}</span>
                                    <span>{pt}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="col-span-12 md:col-span-4 space-y-6">
                    <div className="bg-white rounded-2xl border border-ink-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 text-[10px] tracking-widest text-brand-600 mb-3">
                            <MessageCircle className="w-4 h-4" /> TONE OF VOICE
                        </div>
                        <p className="text-sm text-ink-800 capitalize">{strategy.tone_of_voice}</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-ink-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 text-[10px] tracking-widest text-brand-600 mb-3">
                            <Hash className="w-4 h-4" /> HASHTAGS
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {strategy.hashtags?.map((tag: string) => (
                                <span key={tag} className="px-2 py-1 text-xs rounded-md bg-ink-50 text-ink-600 border border-ink-100">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Personas */}
                <div className="col-span-12 bg-white rounded-2xl border border-ink-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-[10px] tracking-widest text-brand-600 mb-4">
                        <Users className="w-4 h-4" /> TARGET PERSONAS
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {strategy.personas?.map((p: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl bg-ink-50/50 border border-ink-100">
                                <h4 className="font-medium text-ink-900 mb-2">{p.name}</h4>
                                <p className="text-sm text-ink-600">{p.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
