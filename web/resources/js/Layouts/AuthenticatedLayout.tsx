import { Link, router, usePage } from '@inertiajs/react';
import {
    Bell, LayoutDashboard, LogOut, Megaphone, Package, Plug, Search,
    Send, Settings2, Sparkles, Users,
} from 'lucide-react';
import { PropsWithChildren, ReactNode } from 'react';

type Props = PropsWithChildren<{ header?: ReactNode; activeKey?: NavKey }>;
type NavKey = 'dashboard' | 'products' | 'studio' | 'posting' | 'ads' | 'team' | 'integrations' | 'settings';

export default function Authenticated({ header, activeKey, children }: Props) {
    const { props } = usePage<any>();
    const user = props.auth?.user;
    const currentRoute: string = props.ziggy?.location || '';

    const isActive = (key: NavKey, route: string): boolean => {
        if (activeKey) return activeKey === key;
        return currentRoute.includes(route);
    };

    const NavItem = ({
        href, label, icon: Icon, badge, navKey, disabled,
    }: { href: string; label: string; icon: any; badge?: string; navKey: NavKey; disabled?: boolean }) => {
        const active = isActive(navKey, href);
        const base = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm';
        const cls = active
            ? 'bg-ink-900 text-white'
            : disabled
                ? 'text-white/30 cursor-not-allowed'
                : 'text-ink-50 hover:bg-white/5';
        if (disabled) {
            return (
                <div className={`${base} ${cls}`}>
                    <Icon className={`w-4 h-4 ${active ? 'text-brand-400' : 'text-white/40'}`} />
                    <span>{label}</span>
                    {badge && <span className="ml-auto text-[10px] font-mono text-white/30">{badge}</span>}
                </div>
            );
        }
        return (
            <Link href={href} className={`${base} ${cls}`}>
                <Icon className={`w-4 h-4 ${active ? 'text-brand-400' : 'text-white/60'}`} />
                <span>{label}</span>
                {badge && <span className="ml-auto text-[10px] font-mono text-white/40">{badge}</span>}
            </Link>
        );
    };

    return (
        <div className="min-h-screen flex bg-ink-50">
            {/* Sidebar */}
            <aside className="w-64 shrink-0 bg-ink-950 text-ink-50 flex flex-col fixed inset-y-0 left-0">
                <div className="px-5 py-5 border-b border-white/5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-500/15 grid place-items-center ring-1 ring-brand-400/30">
                        <div className="w-3 h-3 rounded-full bg-brand-400" />
                    </div>
                    <div>
                        <div className="text-[13px] tracking-[0.18em] text-brand-400 font-semibold">PROJEK</div>
                        <div className="text-base font-display font-semibold leading-none">Infra</div>
                    </div>
                </div>

                <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
                    <NavItem href={route('dashboard')}      navKey="dashboard"     label="Dashboard"        icon={LayoutDashboard} />
                    <NavItem href={route('products.index')} navKey="products"      label="Product Hub"      icon={Package} />
                    <NavItem href={route('studio.index')}   navKey="studio"        label="AI Content Studio" icon={Sparkles} />
                    <NavItem href="#"                       navKey="posting"       label="Auto Posting"     icon={Send}      badge="P2" disabled />
                    <NavItem href="#"                       navKey="ads"           label="Ads Integration"  icon={Megaphone} badge="P3" disabled />

                    <div className="px-3 pt-6 pb-2 text-[11px] uppercase tracking-[0.18em] text-white/30">Workspace</div>

                    <NavItem href="#" navKey="team"          label="Team"          icon={Users} disabled />
                    <NavItem href="#" navKey="integrations"  label="Integrations"  icon={Plug}  disabled />
                    <NavItem href={route('profile.edit')} navKey="settings" label="Settings" icon={Settings2} />
                </nav>

                <div className="p-3 border-t border-white/5">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-flame-500 grid place-items-center text-[11px] font-semibold text-ink-900">
                            {(user?.name || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="leading-tight flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{user?.name}</div>
                            <div className="text-[11px] text-white/40 truncate">{user?.email}</div>
                        </div>
                        <button
                            onClick={() => router.post(route('logout'))}
                            title="Sign out"
                            className="text-white/40 hover:text-white p-1"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 min-w-0 ml-64">
                <header className="h-14 px-8 border-b border-ink-200 bg-ink-50/80 backdrop-blur sticky top-0 z-20 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-ink-900/60">
                        <span className="font-mono text-[11px] tracking-widest px-1.5 py-0.5 rounded bg-ink-200/60">v0.1</span>
                        <span>·</span>
                        <span>{header || 'Projek Infra'}</span>
                    </div>
                    <div className="flex-1" />
                    <div className="relative w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/40" />
                        <input
                            placeholder="Search products, content…"
                            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md bg-white border border-ink-200 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
                        />
                    </div>
                    <button className="relative w-8 h-8 grid place-items-center rounded-md hover:bg-ink-200/60 transition">
                        <Bell className="w-4 h-4" />
                    </button>
                </header>

                {children}
            </main>
        </div>
    );
}
