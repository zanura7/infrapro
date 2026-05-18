import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowRight, Check, Download, Image as ImageIcon, ImagePlus,
    Loader2, Package, RefreshCw, Sparkles, Upload, X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { cn } from '@/lib/utils';

type Asset = { id: number; type: string; url: string };
type Product = {
    id: number; slug: string; name: string;
    category: string | null; price: string | null; currency: string;
    assets: Asset[];
};

type TemplateField = {
    key: string;
    token: string;
    label: string;
    required?: boolean;
    placeholder?: string;
};
type Template = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    prompt_template: string;
    negative_prompt: string | null;
    fields: TemplateField[];
    default_aspect_ratio: string;
    default_size: string;
};

type GenState = {
    job_id?: number;
    url?: string;
    loading?: boolean;
    error?: string;
};

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000;

function extractErr(e: any, fallback: string): string {
    const d = e?.response?.data;
    if (d?.errors && typeof d.errors === 'object') {
        const lines = Object.values(d.errors).flat() as string[];
        if (lines.length) return lines.join('\n');
    }
    if (d?.error) return String(d.error);
    if (d?.message) return String(d.message);
    return e?.message || fallback;
}

async function waitForJob(jobId: number, isBatch = false): Promise<{ status: string; output: any; error: any }> {
    const startTime = Date.now();
    while (true) {
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
            return { status: 'failed', output: null, error: 'Job timed out after 120s' };
        }
        try {
            if (isBatch) {
                const { data } = await axios.get(route('poster.batch', { id: jobId }));
                if (data.status === 'succeeded' || data.status === 'partial') {
                    // Collect all succeeded children URLs
                    const urls = (data.children || [])
                        .filter((c: any) => c.status === 'succeeded')
                        .map((c: any) => c.output?.url);
                    return { status: data.status, output: { url: urls[0], urls, batch_id: jobId }, error: null };
                }
                if (data.children?.every((c: any) => c.status === 'failed')) {
                    return { status: 'failed', output: null, error: 'All poster sizes failed.' };
                }
            } else {
                const { data } = await axios.get(route('poster.job', { id: jobId }));
                if (data.status === 'succeeded' || data.status === 'failed') return data;
            }
        } catch (e: any) {
            // Ignore temporary network errors during polling
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
}

export default function PosterIndex({ products, templates }: { products: Product[]; templates: Template[] }) {
    const [productId, setProductId] = useState<number | null>(products[0]?.id ?? null);
    const [templateSlug, setTemplateSlug] = useState<string | null>(templates[0]?.slug ?? null);
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [assetId, setAssetId] = useState<number | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
    const [genState, setGenState] = useState<GenState>({});
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

    // Reset field values whenever template changes
    useEffect(() => {
        if (!selectedTemplate) { setFieldValues({}); return; }
        const fresh: Record<string, string> = {};
        for (const f of selectedTemplate.fields) {
            fresh[f.key] = '';
        }
        setFieldValues(fresh);
    }, [selectedTemplate?.slug]);

    useEffect(() => {
        return () => { cancelledRef.current = true; };
    }, []);

    const onFile = (f: File) => {
        setUploadedFile(f);
        const r = new FileReader();
        r.onloadend = () => setUploadedPreview(r.result as string);
        r.readAsDataURL(f);
        setAssetId(null);
    };

    const generate = async () => {
        if (!productId) { setError('Select a product first.'); return; }
        if (!selectedTemplate) { setError('Pick a poster style first.'); return; }

        // Validate required fields
        const missing: string[] = [];
        for (const f of selectedTemplate.fields) {
            if (f.required && !(fieldValues[f.key] || '').trim()) {
                missing.push(f.label);
            }
        }
        if (missing.length) { setError(`Fill in: ${missing.join(', ')}`); return; }
        setError(null);
        setGenState({ loading: true, error: undefined, url: undefined });
        cancelledRef.current = false;
        try {
            const fd = new FormData();
            fd.append('product_id', String(productId));
            fd.append('template_slug', selectedTemplate.slug);
            for (const [k, v] of Object.entries(fieldValues)) {
                fd.append(`fields[${k}]`, v);
            }
            if (assetId) fd.append('asset_id', String(assetId));
            if (uploadedFile) fd.append('image', uploadedFile);

            const { data } = await axios.post(route('poster.generate'), fd);
            
            const isBatch = !!data.batch_id;
            const targetId = isBatch ? data.batch_id : data.job_id;
            
            setGenState({ job_id: targetId, loading: true });
            
            const result = await waitForJob(targetId, isBatch);
            if (cancelledRef.current) return;
            if (result.status === 'succeeded' || result.status === 'partial') {
                setGenState({ url: result.output?.url, loading: false });
            } else {
                setGenState({ loading: false, error: typeof result.error === 'string' ? result.error : result.error?.message || 'Poster generation failed.' });
            }
        } catch (e: any) {
            setGenState({ loading: false, error: extractErr(e, 'Poster dispatch failed.') });
        }
    };

    return (
        <AuthenticatedLayout header="Image Poster" activeKey="poster">
            <Head title="Image Poster" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <div className="mb-6">
                    <div className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-accent">
                        MODULE 03 · POSTER
                    </div>
                    <h1 className="font-display text-3xl font-semibold sm:text-4xl">Image Poster</h1>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        Single-image promotional banners for Instagram &amp; ad placements. Pick a style, fill the copy, generate.
                    </p>
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
                                    <CardTitle className="text-sm">Reference image (optional)</CardTitle>
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

                                    <Label className="mb-2 block text-[11px] text-muted-foreground">Or upload new (helps lock product look):</Label>
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
                                    <Sparkles className="h-4 w-4 text-accent" />
                                    <CardTitle className="text-sm">Poster style</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {templates.length === 0 && (
                                        <p className="text-xs text-muted-foreground">No poster templates available.</p>
                                    )}
                                    {templates.map((t) => (
                                        <button
                                            key={t.slug}
                                            type="button"
                                            onClick={() => setTemplateSlug(t.slug)}
                                            className={cn(
                                                'w-full rounded-lg border p-3 text-left transition',
                                                templateSlug === t.slug
                                                    ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                                                    : 'border-border hover:border-accent/40',
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="text-sm font-medium">{t.name}</div>
                                                {templateSlug === t.slug && <Check className="h-4 w-4 shrink-0 text-accent" />}
                                            </div>
                                            {t.description && (
                                                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{t.description}</p>
                                            )}
                                        </button>
                                    ))}
                                </CardContent>
                            </Card>

                            {selectedTemplate && (
                                <Card>
                                    <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                                        <ImagePlus className="h-4 w-4 text-accent" />
                                        <CardTitle className="text-sm">Copy</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {selectedTemplate.fields.map((f) => (
                                            <div key={f.key} className="space-y-1.5">
                                                <Label htmlFor={`f-${f.key}`} className="text-xs">
                                                    {f.label}
                                                    {f.required && <span className="text-destructive"> *</span>}
                                                </Label>
                                                {f.key === 'subheadline' ? (
                                                    <Textarea
                                                        id={`f-${f.key}`}
                                                        rows={2}
                                                        placeholder={f.placeholder || ''}
                                                        value={fieldValues[f.key] || ''}
                                                        onChange={(e) => setFieldValues((s) => ({ ...s, [f.key]: e.target.value }))}
                                                    />
                                                ) : (
                                                    <Input
                                                        id={`f-${f.key}`}
                                                        placeholder={f.placeholder || ''}
                                                        value={fieldValues[f.key] || ''}
                                                        onChange={(e) => setFieldValues((s) => ({ ...s, [f.key]: e.target.value }))}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            <Button onClick={generate} disabled={genState.loading} size="lg" className="w-full">
                                {genState.loading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                                ) : genState.url ? (
                                    <><RefreshCw className="h-4 w-4" /> Regenerate poster</>
                                ) : (
                                    <><Sparkles className="h-4 w-4" /> Generate poster</>
                                )}
                            </Button>
                        </aside>

                        {/* Output */}
                        <main className="lg:col-span-8">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4 text-accent" />
                                        <CardTitle className="text-sm">Poster output</CardTitle>
                                    </div>
                                    {selectedTemplate && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="accent" className="capitalize">{selectedTemplate.name}</Badge>
                                            <Badge variant="muted" className="font-mono">{selectedTemplate.default_size}</Badge>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className="mx-auto grid w-full max-w-md place-items-center overflow-hidden rounded-xl border bg-muted"
                                        style={{ aspectRatio: (selectedTemplate?.default_aspect_ratio || '4:5').replace(':', '/') }}
                                    >
                                        {genState.loading ? (
                                            <div className="text-center">
                                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                                                <div className="mt-2 text-xs text-muted-foreground">Rendering poster…<br />~30–90 seconds</div>
                                            </div>
                                        ) : genState.url ? (
                                            <img src={genState.url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="text-center text-sm text-muted-foreground">
                                                <Sparkles className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                                Fill the copy + click Generate
                                            </div>
                                        )}
                                    </div>
                                    {genState.error && (
                                        <div className="mx-auto mt-3 max-w-md rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                                            {genState.error}
                                        </div>
                                    )}
                                    {genState.url && (
                                        <div className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2">
                                            <Button asChild>
                                                <a href={genState.url} download="poster.png">
                                                    <Download className="h-4 w-4" /> Download
                                                </a>
                                            </Button>
                                            <Button variant="outline" onClick={generate}>
                                                <RefreshCw className="h-4 w-4" /> Regenerate
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </main>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function NoProducts() {
    return (
        <Card className="p-12 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="font-display text-xl font-semibold">Add a product first.</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Posters reference a product as the source of truth. Create one and you'll see it listed here.
            </p>
            <Button asChild className="mt-5">
                <Link href={route('products.create')}>
                    <ArrowRight className="h-4 w-4" /> Add product
                </Link>
            </Button>
        </Card>
    );
}
