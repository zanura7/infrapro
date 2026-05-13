import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Package, Sparkles, TrendingUp } from 'lucide-react';

type Job = {
    id: number;
    kind: string;
    status: string;
    created_at: string;
    cost: string | number;
    product?: { id: number; name: string };
};

type Props = {
    stats: { products: number; content: number; spend: number };
    recent_jobs: Job[];
};

export default function Dashboard({ stats, recent_jobs }: Props) {
    return (
        <AuthenticatedLayout header="Dashboard" activeKey="dashboard">
            <Head title="Dashboard" />

            <section className="bg-ink-950 text-white relative overflow-hidden">
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
                        backgroundSize: '56px 56px',
                    }}
                />
                <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />
                <div className="relative px-8 pt-10 pb-12">
                    <div className="text-[12px] tracking-[0.22em] text-brand-400 font-semibold mb-3">
                        01 · OVERVIEW
                    </div>
                    <h1 className="font-display text-4xl md:text-5xl font-semibold leading-[1.05] max-w-3xl">
                        One product — <span className="text-brand-400">every channel.</span>
                    </h1>
                    <p className="text-white/60 mt-3 max-w-xl text-sm">
                        Performance snapshot, recent activity, and what needs attention today.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 max-w-4xl">
                        <KpiCard label="PRODUCTS" value={stats.products} tone="brand" />
                        <KpiCard label="CONTENT JOBS" value={stats.content} tone="brand" />
                        <KpiCard label="SPEND · MONTH" value={`RM ${stats.spend.toFixed(2)}`} tone="brand" />
                        <KpiCard label="TARGET ROAS" value="2" suffix="×" tone="flame" />
                    </div>
                </div>
            </section>

            <div className="px-8 py-8 grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-ink-200 shadow-soft p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="font-display text-xl font-semibold">Recent activity</h3>
                            <p className="text-xs text-ink-900/50 mt-0.5">Last 10 AI jobs</p>
                        </div>
                    </div>

                    {recent_jobs.length === 0 ? (
                        <div className="py-10 text-center text-ink-900/40">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 text-ink-200" />
                            <p className="text-sm">No activity yet. Start with a product.</p>
                            <Link
                                href={route('products.create')}
                                className="inline-flex mt-3 px-3 py-1.5 text-xs font-medium rounded-md bg-ink-900 text-white hover:bg-ink-950"
                            >
                                + Add product
                            </Link>
                        </div>
                    ) : (
                        <ul className="space-y-1">
                            {recent_jobs.map((job) => (
                                <li key={job.id} className="flex items-center gap-4 py-3 border-b border-ink-100 last:border-0">
                                    <div className="w-9 h-9 rounded-lg bg-brand-50 grid place-items-center text-brand-600 shrink-0">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm">
                                            <span className="font-medium">{job.product?.name || 'Unknown product'}</span>
                                            {' · '}
                                            <span className="capitalize text-ink-900/70">{job.kind}</span>
                                        </div>
                                        <div className="text-[11px] text-ink-900/50">
                                            {new Date(job.created_at).toLocaleString()} · cost RM {Number(job.cost).toFixed(2)}
                                        </div>
                                    </div>
                                    <StatusPill status={job.status} />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-xl border border-ink-200 shadow-soft p-6">
                        <h3 className="font-display text-xl font-semibold mb-4">Quick actions</h3>
                        <div className="space-y-2">
                            <QuickAction
                                href={route('studio.index')}
                                icon={Sparkles}
                                title="Generate new content"
                                subtitle="Image · Video"
                                tone="brand"
                            />
                            <QuickAction
                                href={route('products.create')}
                                icon={Package}
                                title="Add product"
                                subtitle="Name, USP, brand voice"
                                tone="brand"
                            />
                            <QuickAction
                                href="#"
                                icon={TrendingUp}
                                title="Boost winner (Phase 3)"
                                subtitle="Top creative → paid ads"
                                tone="flame"
                                disabled
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function KpiCard({
    label, value, suffix = '', tone = 'brand',
}: { label: string; value: string | number; suffix?: string; tone?: 'brand' | 'flame' }) {
    const accent = tone === 'flame' ? 'text-flame-400' : 'text-brand-400';
    return (
        <div className="bg-white/[0.04] backdrop-blur ring-1 ring-white/10 rounded-xl p-4">
            <div className={`text-[10px] tracking-widest ${accent}`}>{label}</div>
            <div className="font-display text-3xl mt-1">
                {value}
                {suffix && <span className={accent}>{suffix}</span>}
            </div>
        </div>
    );
}

function QuickAction({
    href, icon: Icon, title, subtitle, tone, disabled,
}: { href: string; icon: any; title: string; subtitle: string; tone: 'brand' | 'flame'; disabled?: boolean }) {
    const bg = tone === 'flame' ? 'bg-flame-50 text-flame-600' : 'bg-brand-50 text-brand-600';
    if (disabled) {
        return (
            <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-ink-200 opacity-60 cursor-not-allowed">
                <div className={`w-9 h-9 rounded-md grid place-items-center ${bg}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-[11px] text-ink-900/50">{subtitle}</div>
                </div>
            </div>
        );
    }
    return (
        <Link
            href={href}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-ink-200 hover:border-brand-500 hover:bg-brand-50/50 transition text-left group"
        >
            <div className={`w-9 h-9 rounded-md grid place-items-center ${bg}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
                <div className="text-sm font-medium">{title}</div>
                <div className="text-[11px] text-ink-900/50">{subtitle}</div>
            </div>
            <ArrowRight className="w-4 h-4 text-ink-900/30" />
        </Link>
    );
}

function StatusPill({ status }: { status: string }) {
    const styles: Record<string, string> = {
        succeeded: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        running: 'bg-brand-50 text-brand-700 ring-brand-200',
        queued: 'bg-ink-100 text-ink-900 ring-ink-200',
        failed: 'bg-flame-50 text-flame-700 ring-flame-200',
        cancelled: 'bg-ink-100 text-ink-900/60 ring-ink-200',
    };
    return (
        <span className={`text-[11px] px-2 py-0.5 rounded-full ring-1 capitalize ${styles[status] || styles.queued}`}>
            {status}
        </span>
    );
}
