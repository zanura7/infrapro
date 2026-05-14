import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Package, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';

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

            {/* Hero */}
            <section className="relative overflow-hidden bg-ink-950 text-white">
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
                        backgroundSize: '56px 56px',
                    }}
                />
                <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
                    <div className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-accent sm:text-[12px]">
                        01 · OVERVIEW
                    </div>
                    <h1 className="max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
                        One product — <span className="text-accent">every channel.</span>
                    </h1>
                    <p className="mt-3 max-w-xl text-sm text-white/60">
                        Performance snapshot, recent activity, and what needs attention today.
                    </p>

                    <div className="mt-6 grid max-w-4xl grid-cols-2 gap-3 sm:mt-8 md:grid-cols-4">
                        <KpiCard label="PRODUCTS" value={stats.products} tone="brand" />
                        <KpiCard label="CONTENT JOBS" value={stats.content} tone="brand" />
                        <KpiCard label="SPEND · MONTH" value={`RM ${stats.spend.toFixed(2)}`} tone="brand" />
                        <KpiCard label="TARGET ROAS" value="2" suffix="×" tone="flame" />
                    </div>
                </div>
            </section>

            {/* Body */}
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <Card className="lg:col-span-8">
                        <CardHeader>
                            <CardTitle className="font-display text-xl">Recent activity</CardTitle>
                            <p className="text-xs text-muted-foreground">Last 10 AI jobs</p>
                        </CardHeader>
                        <CardContent>
                            {recent_jobs.length === 0 ? (
                                <div className="py-10 text-center text-muted-foreground">
                                    <Sparkles className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                    <p className="text-sm">No activity yet. Start with a product.</p>
                                    <Button asChild size="sm" className="mt-3">
                                        <Link href={route('products.create')}>+ Add product</Link>
                                    </Button>
                                </div>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {recent_jobs.map((job) => (
                                        <li key={job.id} className="flex items-center gap-3 py-3 sm:gap-4">
                                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                                                <Sparkles className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm">
                                                    <span className="font-medium">{job.product?.name || 'Unknown product'}</span>
                                                    <span className="text-muted-foreground"> · </span>
                                                    <span className="capitalize text-muted-foreground">{job.kind}</span>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {new Date(job.created_at).toLocaleString()} · cost RM {Number(job.cost).toFixed(2)}
                                                </div>
                                            </div>
                                            <StatusPill status={job.status} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle className="font-display text-xl">Quick actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
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
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function KpiCard({
    label, value, suffix = '', tone = 'brand',
}: { label: string; value: string | number; suffix?: string; tone?: 'brand' | 'flame' }) {
    const accent = tone === 'flame' ? 'text-flame-400' : 'text-accent';
    return (
        <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10 backdrop-blur sm:p-4">
            <div className={cn('text-[10px] tracking-widest', accent)}>{label}</div>
            <div className="mt-1 font-display text-2xl sm:text-3xl">
                {value}
                {suffix && <span className={accent}>{suffix}</span>}
            </div>
        </div>
    );
}

function QuickAction({
    href, icon: Icon, title, subtitle, tone, disabled,
}: { href: string; icon: any; title: string; subtitle: string; tone: 'brand' | 'flame'; disabled?: boolean }) {
    const bg = tone === 'flame' ? 'bg-flame-50 text-flame-600' : 'bg-accent/10 text-accent';
    const body = (
        <>
            <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-md', bg)}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{title}</div>
                <div className="text-[11px] text-muted-foreground">{subtitle}</div>
            </div>
            {!disabled && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </>
    );

    if (disabled) {
        return (
            <div className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border p-3 opacity-60">
                {body}
            </div>
        );
    }
    return (
        <Link
            href={href}
            className="group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-accent hover:bg-accent/5"
        >
            {body}
        </Link>
    );
}

function StatusPill({ status }: { status: string }) {
    const map: Record<string, 'success' | 'accent' | 'muted' | 'destructive'> = {
        succeeded: 'success',
        running: 'accent',
        queued: 'muted',
        failed: 'destructive',
        cancelled: 'muted',
    };
    return (
        <Badge variant={map[status] || 'muted'} className="capitalize">
            {status}
        </Badge>
    );
}
