import { Link, router, usePage } from '@inertiajs/react';
import {
    Bell, CalendarDays, Image as ImageIcon, LayoutDashboard, LogOut, Megaphone, Menu, Package, Plug, Search,
    Send, Settings2, Sparkles, Users,
} from 'lucide-react';
import { PropsWithChildren, ReactNode, useState } from 'react';
import { Sheet, SheetContent } from '@/Components/ui/sheet';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { cn } from '@/lib/utils';

type NavKey = 'dashboard' | 'products' | 'studio' | 'poster' | 'schedule' | 'posting' | 'ads' | 'team' | 'integrations' | 'settings';
type Props = PropsWithChildren<{ header?: ReactNode; activeKey?: NavKey }>;

const NAV_PRIMARY: { key: NavKey; href: string; label: string; icon: any; badge?: string; disabled?: boolean }[] = [
    { key: 'dashboard', href: route('dashboard'),      label: 'Dashboard',         icon: LayoutDashboard },
    { key: 'products',  href: route('products.index'), label: 'Product Hub',       icon: Package },
    { key: 'studio',    href: route('studio.index'),   label: 'AI Studio · Video', icon: Sparkles },
    { key: 'poster',    href: route('poster.index'),   label: 'Image Poster',      icon: ImageIcon },
    { key: 'schedule',  href: route('schedule.index'), label: 'Calendar',          icon: CalendarDays },
    { key: 'posting',   href: '#',                     label: 'Auto Posting',      icon: Send,      badge: 'P2', disabled: true },
    { key: 'ads',       href: '#',                     label: 'Ads Integration',   icon: Megaphone, badge: 'P3', disabled: true },
];

const NAV_WORKSPACE: { key: NavKey; href: string; label: string; icon: any; disabled?: boolean }[] = [
    { key: 'team',         href: '#',                     label: 'Team',         icon: Users,     disabled: true },
    { key: 'integrations', href: '#',                     label: 'Integrations', icon: Plug,      disabled: true },
    { key: 'settings',     href: route('settings.index'), label: 'Settings',     icon: Settings2 },
];

export default function Authenticated({ header, activeKey, children }: Props) {
    const { props } = usePage<any>();
    const user = props.auth?.user;
    const [mobileOpen, setMobileOpen] = useState(false);

    const SidebarBody = ({ onNavigate }: { onNavigate?: () => void }) => {
        const isActive = (key: NavKey, href: string) => {
            if (activeKey) return activeKey === key;
            const loc = props.ziggy?.location || '';
            return href !== '#' && loc.includes(href);
        };

        const Item = ({ item }: { item: typeof NAV_PRIMARY[number] }) => {
            const active = isActive(item.key, item.href);
            const inner = (
                <>
                    <item.icon className={cn('h-4 w-4', active ? 'text-accent' : 'text-white/60', item.disabled && 'text-white/30')} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                        <span className="text-[10px] font-mono text-white/30">{item.badge}</span>
                    )}
                </>
            );
            const base = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm';
            const cls = active ? 'bg-white/10 text-white' : item.disabled ? 'text-white/30 cursor-not-allowed' : 'text-white/80 hover:bg-white/5 hover:text-white';

            if (item.disabled) return <div className={cn(base, cls)}>{inner}</div>;
            return (
                <Link href={item.href} onClick={onNavigate} className={cn(base, cls)}>
                    {inner}
                </Link>
            );
        };

        return (
            <div className="flex h-full flex-col bg-ink-950 text-white">
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 ring-1 ring-accent/30">
                        <div className="h-3 w-3 rounded-full bg-accent" />
                    </div>
                    <div>
                        <div className="text-[11px] font-semibold tracking-[0.18em] text-accent">PROJEK</div>
                        <div className="font-display text-base font-semibold leading-none">Infra</div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                    {NAV_PRIMARY.map((item) => <Item key={item.key} item={item} />)}
                    <div className="px-3 pb-2 pt-6 text-[11px] uppercase tracking-[0.18em] text-white/30">Workspace</div>
                    {NAV_WORKSPACE.map((item) => <Item key={item.key} item={item} />)}
                </nav>

                {/* User */}
                <div className="border-t border-white/5 p-3">
                    <div className="flex items-center gap-3 px-2">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-to-br from-accent to-flame-500 text-[11px] font-semibold text-ink-900">
                                {(user?.name || '?').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 leading-tight">
                            <div className="truncate text-sm font-medium">{user?.name}</div>
                            <div className="truncate text-[11px] text-white/40">{user?.email}</div>
                        </div>
                        <button
                            onClick={() => router.post(route('logout'))}
                            title="Sign out"
                            className="p-1 text-white/40 transition hover:text-white"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-ink-50">
            {/* Desktop sidebar */}
            <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
                <SidebarBody />
            </aside>

            {/* Mobile sidebar (Sheet) */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-72 border-r-0 p-0 bg-ink-950 text-white">
                    <SidebarBody onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
            </Sheet>

            {/* Main column */}
            <div className="lg:pl-64">
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-200 bg-ink-50/80 px-4 backdrop-blur sm:px-6 lg:px-8">
                    {/* Mobile hamburger — controlled Sheet, no SheetTrigger needed */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="flex min-w-0 items-center gap-2 text-sm text-ink-900/60">
                        <span className="hidden sm:inline-flex rounded bg-ink-200/60 px-1.5 py-0.5 font-mono text-[11px] tracking-widest">
                            v0.1
                        </span>
                        <span className="hidden sm:inline">·</span>
                        <span className="truncate">{header || 'Projek Infra'}</span>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-900/40" />
                            <Input
                                placeholder="Search…"
                                className="h-9 w-56 pl-9 lg:w-64"
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search">
                            <Search className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Notifications">
                            <Bell className="h-4 w-4" />
                        </Button>

                        {/* User menu (mobile + desktop fallback) */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="User menu">
                                    <Avatar className="h-7 w-7">
                                        <AvatarFallback className="bg-gradient-to-br from-accent to-flame-500 text-[10px] font-semibold text-ink-900">
                                            {(user?.name || '?').slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="font-medium">{user?.name}</div>
                                    <div className="text-xs text-muted-foreground">{user?.email}</div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={route('profile.edit')}>
                                        <Settings2 className="h-4 w-4" /> Settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.post(route('logout'))}>
                                    <LogOut className="h-4 w-4" /> Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main>{children}</main>
            </div>
        </div>
    );
}
