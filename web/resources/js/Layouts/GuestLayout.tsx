import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-50 px-4 py-12">
            {/* Subtle background grid */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(34,211,238,0.08),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_120%,rgba(249,115,22,0.06),transparent_55%)]" />

            <Link href="/" className="relative mb-8 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-950 ring-1 ring-accent/30">
                    <div className="h-3.5 w-3.5 rounded-full bg-accent" />
                </div>
                <div className="text-left">
                    <div className="text-[11px] font-semibold tracking-[0.18em] text-accent">PROJEK</div>
                    <div className="font-display text-lg font-semibold leading-none">Infra</div>
                </div>
            </Link>

            <div className="relative w-full max-w-md">{children}</div>

            <div className="relative mt-8 text-center text-xs text-muted-foreground">
                AI content infrastructure for affiliate marketing
            </div>
        </div>
    );
}
