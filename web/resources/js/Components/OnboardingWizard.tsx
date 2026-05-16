import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    ArrowRight,
    Check,
    Image as ImageIcon,
    PartyPopper,
    Rocket,
    Sparkles,
    Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';

type StepKey = 'welcome' | 'product' | 'asset' | 'generate' | 'done';

type StepDef = {
    key: StepKey;
    label: string;
};

const STEPS: StepDef[] = [
    { key: 'welcome', label: 'Welcome' },
    { key: 'product', label: 'Create product' },
    { key: 'asset', label: 'Upload asset' },
    { key: 'generate', label: 'Generate content' },
    { key: 'done', label: 'All set' },
];

export default function OnboardingWizard() {
    const [stepIndex, setStepIndex] = useState(0);
    const current = STEPS[stepIndex];

    const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    const back = () => setStepIndex((i) => Math.max(i - 1, 0));

    return (
        <div className="bg-background">
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

                <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
                    <div className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-accent">
                        00 · GET STARTED
                    </div>
                    <h1 className="max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
                        Welcome to <span className="text-accent">InfraPro.</span>
                    </h1>
                    <p className="mt-3 max-w-xl text-sm text-white/60">
                        A quick 4-step setup so the AI has enough context to start working for you.
                    </p>

                    <StepIndicator stepIndex={stepIndex} />
                </div>
            </section>

            {/* Body */}
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <Badge variant="accent" className="mb-2">
                                    Step {stepIndex + 1} of {STEPS.length}
                                </Badge>
                                <CardTitle className="font-display text-2xl">{current.label}</CardTitle>
                            </div>
                            {stepIndex > 0 && stepIndex < STEPS.length - 1 && (
                                <Button variant="outline" size="sm" onClick={back}>
                                    Back
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {current.key === 'welcome' && <WelcomeStep onNext={next} />}
                        {current.key === 'product' && <ProductStep onSkip={next} />}
                        {current.key === 'asset' && <AssetStep onSkip={next} />}
                        {current.key === 'generate' && <GenerateStep onSkip={next} />}
                        {current.key === 'done' && <DoneStep />}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StepIndicator({ stepIndex }: { stepIndex: number }) {
    return (
        <ol className="mt-8 flex flex-wrap items-center gap-2 sm:gap-3">
            {STEPS.map((s, i) => {
                const isDone = i < stepIndex;
                const isCurrent = i === stepIndex;
                return (
                    <li key={s.key} className="flex items-center gap-2">
                        <div
                            className={cn(
                                'grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ring-1 transition',
                                isDone && 'bg-accent text-ink-950 ring-accent',
                                isCurrent && 'bg-white text-ink-950 ring-white',
                                !isDone && !isCurrent && 'bg-white/5 text-white/60 ring-white/15',
                            )}
                        >
                            {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </div>
                        <span
                            className={cn(
                                'hidden text-[11px] uppercase tracking-widest sm:inline',
                                isCurrent ? 'text-white' : 'text-white/50',
                            )}
                        >
                            {s.label}
                        </span>
                        {i < STEPS.length - 1 && (
                            <span className="hidden h-px w-6 bg-white/15 sm:inline-block" />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
    return (
        <div className="grid gap-6 sm:grid-cols-[auto,1fr] sm:items-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Rocket className="h-8 w-8" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">
                    Let's set up your first product. InfraPro turns one product into content for every
                    channel — posters, social, video — so the more you tell it about your product, the
                    sharper the output.
                </p>
                <ul className="mt-4 grid gap-2 text-sm">
                    <Bullet>Add your first product (name, USP, audience).</Bullet>
                    <Bullet>Upload an image or logo.</Bullet>
                    <Bullet>Generate your first poster.</Bullet>
                </ul>
                <div className="mt-6">
                    <Button onClick={onNext}>
                        Get started <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ProductStep({ onSkip }: { onSkip: () => void }) {
    return (
        <div className="grid gap-6 sm:grid-cols-[auto,1fr] sm:items-start">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Package className="h-8 w-8" />
            </div>
            <div>
                <h3 className="font-display text-lg font-semibold">Create your first product.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    You'll capture the basics — name, category, USP, target audience, brand voice. This
                    powers every AI suggestion later.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                    <Button asChild>
                        <Link href={route('products.create')}>
                            Open product form <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={onSkip}>
                        Skip for now
                    </Button>
                </div>
            </div>
        </div>
    );
}

function AssetStep({ onSkip }: { onSkip: () => void }) {
    return (
        <div className="grid gap-6 sm:grid-cols-[auto,1fr] sm:items-start">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
                <ImageIcon className="h-8 w-8" />
            </div>
            <div className="w-full">
                <h3 className="font-display text-lg font-semibold">Upload a product image or logo.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    The AI uses your real images as a visual reference. Open the Product Hub and drop a
                    file into any product.
                </p>

                <div className="mt-5 rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-8 text-center">
                    <ImageIcon className="mx-auto mb-2 h-8 w-8 text-ink-900/30" />
                    <p className="text-xs text-muted-foreground">
                        Drag-and-drop zone lives on each product's page.
                    </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                    <Button asChild>
                        <Link href={route('products.index')}>
                            Open Product Hub <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={onSkip}>
                        Skip
                    </Button>
                </div>
            </div>
        </div>
    );
}

function GenerateStep({ onSkip }: { onSkip: () => void }) {
    return (
        <div className="grid gap-6 sm:grid-cols-[auto,1fr] sm:items-start">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Sparkles className="h-8 w-8" />
            </div>
            <div>
                <h3 className="font-display text-lg font-semibold">Generate your first content.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Try a poster in three sizes (square, story, landscape) or open AI Studio for image
                    and video generation.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                    <Button asChild>
                        <Link href={route('poster.index')}>
                            Try the Poster generator <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={route('studio.index')}>Open AI Studio</Link>
                    </Button>
                    <Button variant="ghost" onClick={onSkip}>
                        Finish
                    </Button>
                </div>
            </div>
        </div>
    );
}

function DoneStep() {
    const [confetti, setConfetti] = useState<
        { left: string; delay: string; color: string; duration: string }[]
    >([]);

    useEffect(() => {
        const colors = ['#3b82f6', '#f97316', '#6366f1', '#a3e635', '#f43f5e', '#facc15'];
        const pieces = Array.from({ length: 28 }).map(() => ({
            left: `${Math.random() * 100}%`,
            delay: `${(Math.random() * 0.8).toFixed(2)}s`,
            duration: `${(0.6 + Math.random() * 0.8).toFixed(2)}s`,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));
        setConfetti(pieces);
    }, []);

    return (
        <div className="relative overflow-hidden text-center">
            <style>{`
                @keyframes confetti-fall {
                    0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
                }
            `}</style>
            <div className="pointer-events-none absolute inset-0">
                {confetti.map((p, i) => (
                    <span
                        key={i}
                        className="absolute top-0 h-2 w-2 rounded-sm"
                        style={{
                            left: p.left,
                            backgroundColor: p.color,
                            animation: `confetti-fall ${p.duration} ${p.delay} ease-in forwards`,
                        }}
                    />
                ))}
            </div>

            <div className="relative py-6">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
                    <PartyPopper className="h-8 w-8" />
                </div>
                <h3 className="font-display text-2xl font-semibold">You're all set.</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Head to the dashboard for stat cards, recent activity and quick actions whenever you
                    need them.
                </p>
                <div className="mt-6 flex justify-center gap-2">
                    <Button asChild>
                        <Link href={route('dashboard')}>
                            Open dashboard <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Bullet({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2 text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{children}</span>
        </li>
    );
}
