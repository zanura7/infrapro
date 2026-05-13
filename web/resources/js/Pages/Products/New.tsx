import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, Plus, Sparkles, X } from 'lucide-react';

export default function ProductNew() {
    const form = useForm({
        name: '',
        sku: '',
        category: '',
        price: '',
        currency: 'MYR',
        description: '',
        usp: ['', '', ''] as string[],
        target_audience: '',
        pain_point: '',
        brand_voice: {
            tone: [] as string[],
            formality: 50,
            dos: '',
            donts: '',
            samples: '',
        },
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form.data,
            usp: form.data.usp.filter((u) => u.trim() !== ''),
            brand_voice: {
                tone: form.data.brand_voice.tone,
                formality: form.data.brand_voice.formality,
                dos: form.data.brand_voice.dos.split('\n').map((s) => s.trim()).filter(Boolean),
                donts: form.data.brand_voice.donts.split('\n').map((s) => s.trim()).filter(Boolean),
                samples: form.data.brand_voice.samples.split('\n\n').map((s) => s.trim()).filter(Boolean),
            },
        };
        router.post(route('products.store'), payload);
    };

    const toggleTone = (t: string) => {
        const cur = form.data.brand_voice.tone;
        form.setData('brand_voice', {
            ...form.data.brand_voice,
            tone: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t].slice(0, 3),
        });
    };

    const TONES = ['Warm', 'Caring', 'Trustworthy', 'Bold', 'Playful', 'Authoritative', 'Minimal'];

    return (
        <AuthenticatedLayout header="New Product" activeKey="products">
            <Head title="New Product" />

            <form onSubmit={submit} className="px-8 py-8">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <Link
                            href={route('products.index')}
                            className="text-[11px] text-ink-900/50 hover:text-ink-900 inline-flex items-center gap-1 mb-2"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Product Hub
                        </Link>
                        <div className="text-[11px] tracking-[0.2em] text-brand-600 font-semibold mb-2">
                            NEW PRODUCT
                        </div>
                        <h1 className="font-display text-4xl font-semibold">Add a product.</h1>
                        <p className="text-ink-900/60 mt-1 text-sm">
                            The more detail you give, the smarter the AI suggestions get.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('products.index')}
                            className="px-3 py-2 text-xs rounded-md border border-ink-200 hover:bg-ink-100"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="px-3 py-2 text-xs font-medium rounded-md bg-ink-900 text-white hover:bg-ink-950 inline-flex items-center gap-2 disabled:opacity-50"
                        >
                            <Check className="w-3.5 h-3.5" /> Create product
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        <Section step={1} title="Basics">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <Label>Product name <span className="text-flame-600">*</span></Label>
                                    <Input value={form.data.name} onChange={(v) => form.setData('name', v)} />
                                    <Err msg={form.errors.name} />
                                </div>
                                <div>
                                    <Label>SKU</Label>
                                    <Input value={form.data.sku} onChange={(v) => form.setData('sku', v)} placeholder="auto" />
                                </div>
                                <div>
                                    <Label>Category</Label>
                                    <Input value={form.data.category} onChange={(v) => form.setData('category', v)} placeholder="e.g. Personal Care · Skincare" />
                                </div>
                                <div>
                                    <Label>Price</Label>
                                    <Input type="number" value={form.data.price} onChange={(v) => form.setData('price', v)} placeholder="0.00" />
                                </div>
                                <div>
                                    <Label>Currency</Label>
                                    <Input value={form.data.currency} onChange={(v) => form.setData('currency', v)} />
                                </div>
                                <div className="col-span-3">
                                    <Label>Description</Label>
                                    <Textarea rows={3} value={form.data.description} onChange={(v) => form.setData('description', v)} />
                                </div>
                            </div>
                        </Section>

                        <Section step={2} title="Positioning">
                            <Label>USP <span className="text-ink-900/40 font-normal">— 3 short bullets</span></Label>
                            <div className="space-y-2">
                                {form.data.usp.map((u, i) => (
                                    <Input
                                        key={i}
                                        value={u}
                                        onChange={(v) => {
                                            const next = [...form.data.usp];
                                            next[i] = v;
                                            form.setData('usp', next);
                                        }}
                                        placeholder={`Bullet ${i + 1}`}
                                    />
                                ))}
                                <button
                                    type="button"
                                    onClick={() => form.setData('usp', [...form.data.usp, ''])}
                                    className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Add another
                                </button>
                            </div>

                            <div className="mt-5">
                                <Label>Target audience</Label>
                                <Input
                                    value={form.data.target_audience}
                                    onChange={(v) => form.setData('target_audience', v)}
                                    placeholder="e.g. Women 25–45 · urban · sensitive skin"
                                />
                            </div>

                            <div className="mt-5">
                                <Label>Pain point</Label>
                                <Textarea
                                    rows={2}
                                    value={form.data.pain_point}
                                    onChange={(v) => form.setData('pain_point', v)}
                                />
                            </div>
                        </Section>

                        <Section step={3} title="Brand voice" optional>
                            <Label>Tone (pick up to 3)</Label>
                            <div className="flex flex-wrap gap-2">
                                {TONES.map((t) => {
                                    const on = form.data.brand_voice.tone.includes(t);
                                    return (
                                        <button
                                            type="button"
                                            key={t}
                                            onClick={() => toggleTone(t)}
                                            className={`px-3 py-1.5 rounded-full text-xs transition ${
                                                on
                                                    ? 'border-2 border-brand-500 bg-brand-50/30 text-brand-700'
                                                    : 'border border-ink-200 hover:border-brand-500'
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-5">
                                <Label>Don'ts <span className="text-ink-900/40 font-normal">— one per line</span></Label>
                                <Textarea
                                    rows={3}
                                    value={form.data.brand_voice.donts}
                                    onChange={(v) => form.setData('brand_voice', { ...form.data.brand_voice, donts: v })}
                                />
                            </div>

                            <div className="mt-5">
                                <Label>Sample copy <span className="text-ink-900/40 font-normal">— separate by blank line</span></Label>
                                <Textarea
                                    rows={4}
                                    value={form.data.brand_voice.samples}
                                    onChange={(v) => form.setData('brand_voice', { ...form.data.brand_voice, samples: v })}
                                />
                            </div>
                        </Section>
                    </div>

                    <aside className="col-span-12 lg:col-span-4 space-y-4">
                        <div className="bg-ink-900 text-white rounded-2xl p-6 relative overflow-hidden sticky top-20">
                            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-brand-500/15 blur-3xl" />
                            <div className="relative">
                                <div className="text-[10px] tracking-widest text-brand-400 font-semibold mb-3">QUICK TIP</div>
                                <h4 className="font-display text-xl">Better input = better AI output.</h4>
                                <p className="text-sm text-white/60 mt-2 leading-relaxed">
                                    Even rough notes for USP and target audience help — you can refine later, but the
                                    AI strategist uses these to pick angle and format.
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}

function Section({
    step, title, optional, children,
}: { step: number; title: string; optional?: boolean; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-soft p-6">
            <div className="flex items-center gap-2 mb-5">
                <span className="w-6 h-6 rounded-full bg-brand-500 text-white grid place-items-center text-[10px] font-semibold">
                    {step}
                </span>
                <h3 className="font-display text-lg font-semibold">{title}</h3>
                {optional && <span className="text-[11px] text-ink-900/40">— optional</span>}
            </div>
            {children}
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <label className="block text-xs font-medium text-ink-900/70 mb-1.5">{children}</label>;
}

function Input({
    value, onChange, placeholder, type = 'text',
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 text-sm rounded-md bg-white border border-ink-200 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
        />
    );
}

function Textarea({
    rows = 3, value, onChange,
}: { rows?: number; value: string; onChange: (v: string) => void }) {
    return (
        <textarea
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-md bg-white border border-ink-200 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition resize-none"
        />
    );
}

function Err({ msg }: { msg?: string }) {
    if (!msg) return null;
    return (
        <p className="mt-1 text-[11px] text-flame-700 inline-flex items-center gap-1">
            <X className="w-3 h-3" /> {msg}
        </p>
    );
}
