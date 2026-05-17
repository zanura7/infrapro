import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ChevronLeft, ChevronRight, Clock, Share2, Camera,
    Plus, Smartphone, Video as VideoIcon, Trash2, Calendar as CalendarIcon,
    AlertCircle, CheckCircle2
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
    isSameDay, addDays, isPast, parseISO, startOfDay
} from 'date-fns';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import {
    Sheet, SheetContent,
    SheetHeader, SheetTitle, SheetTrigger
} from '@/Components/ui/sheet';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Input } from '@/Components/ui/input';
import { cn } from '@/lib/utils';

interface ScheduledPost {
    id: number;
    platform: 'tiktok' | 'instagram' | 'facebook';
    caption: string;
    media_url: string | null;
    scheduled_at: string;
    status: 'pending' | 'publishing' | 'published' | 'failed';
}

interface Props {
    connectedPlatforms: string[];
    scheduledPosts: ScheduledPost[];
    socialAccounts: Array<{
        id: number;
        platform: string;
        account_name: string;
    }>;
}

const PLATFORMS = [
    { id: 'tiktok', label: 'TikTok', icon: Smartphone, color: 'bg-black text-white' },
    { id: 'instagram', label: 'Instagram', icon: Camera, color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white' },
    { id: 'facebook', label: 'Facebook', icon: Share2, color: 'bg-blue-600 text-white' },
];

type ScheduleForm = {
    platforms: string[];
    caption: string;
    media_url: string;
    scheduled_at: string;
};

export default function ScheduleIndex({ connectedPlatforms, scheduledPosts, socialAccounts }: Props) {
    const [currentDate, setCurrentDate] = useState(new Date());
    void socialAccounts;
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm<ScheduleForm>({
        platforms: [] as string[],
        caption: '',
        media_url: '',
        scheduled_at: format(addDays(new Date(), 1), "yyyy-MM-dd'T'12:00"),
    });

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = useMemo(() => {
        if (viewMode === 'month') {
            return eachDayOfInterval({ start: startDate, end: endDate });
        } else {
            const weekStart = startOfWeek(currentDate);
            const weekEnd = endOfWeek(currentDate);
            return eachDayOfInterval({ start: weekStart, end: weekEnd });
        }
    }, [currentDate, viewMode, startDate, endDate]);

    const nextPeriod = () => {
        if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
        else setCurrentDate(addDays(currentDate, 7));
    };

    const prevPeriod = () => {
        if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
        else setCurrentDate(addDays(currentDate, -7));
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('schedule.store'), {
            onSuccess: () => {
                setIsCreateOpen(false);
                reset();
            },
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to cancel this scheduled post?')) {
            router.delete(route('schedule.destroy', id), {
                onSuccess: () => setSelectedPost(null),
            });
        }
    };

    const getPostsForDay = (day: Date) => {
        return scheduledPosts.filter(p => isSameDay(parseISO(p.scheduled_at), day));
    };

    return (
        <AuthenticatedLayout header="Content Calendar" activeKey="schedule">
            <Head title="Calendar" />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-white border rounded-lg p-1 shadow-sm">
                            <Button variant="ghost" size="icon" onClick={prevPeriod} className="h-8 w-8">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-4 font-semibold text-sm min-w-[120px] text-center">
                                {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Week of' MMM d")}
                            </span>
                            <Button variant="ghost" size="icon" onClick={nextPeriod} className="h-8 w-8">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex bg-ink-100 rounded-lg p-1">
                            <Button 
                                variant={viewMode === 'month' ? 'default' : 'ghost'} 
                                size="sm" 
                                className="h-7 text-xs px-3"
                                onClick={() => setViewMode('month')}
                            >
                                Month
                            </Button>
                            <Button 
                                variant={viewMode === 'week' ? 'default' : 'ghost'} 
                                size="sm" 
                                className="h-7 text-xs px-3"
                                onClick={() => setViewMode('week')}
                            >
                                Week
                            </Button>
                        </div>
                    </div>

                    <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <SheetTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> Schedule Post
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-xl overflow-y-auto">
                            <SheetHeader>
                                <SheetTitle>Schedule New Post</SheetTitle>
                                <div className="text-sm text-ink-500">
                                    Select platforms and set a time for your content to go live.
                                </div>
                            </SheetHeader>

                            <form onSubmit={handleCreateSubmit} className="space-y-6 py-6">
                                <div className="space-y-3">
                                    <Label>Target Platforms</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {PLATFORMS.map((platform) => {
                                            const isConnected = connectedPlatforms.includes(platform.id);
                                            return (
                                                <div 
                                                    key={platform.id}
                                                    className={cn(
                                                        "relative flex flex-col items-center justify-center p-4 border rounded-xl transition-all",
                                                        data.platforms.includes(platform.id) ? "border-accent bg-accent/5 ring-1 ring-accent" : "hover:bg-ink-50",
                                                        !isConnected && "opacity-50 grayscale cursor-not-allowed"
                                                    )}
                                                    onClick={() => {
                                                        if (!isConnected) return;
                                                        const next = data.platforms.includes(platform.id)
                                                            ? data.platforms.filter(p => p !== platform.id)
                                                            : [...data.platforms, platform.id];
                                                        setData('platforms', next);
                                                    }}
                                                >
                                                    <platform.icon className="h-6 w-6 mb-2" />
                                                    <span className="text-xs font-medium">{platform.label}</span>
                                                    {!isConnected && (
                                                        <span className="absolute top-1 right-1 text-[8px] uppercase text-red-500 font-bold">Offline</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {errors.platforms && <p className="text-xs text-red-500">{errors.platforms}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="caption">Caption</Label>
                                    <Textarea 
                                        id="caption"
                                        placeholder="Write your post content here..."
                                        rows={4}
                                        value={data.caption}
                                        onChange={e => setData('caption', e.target.value)}
                                    />
                                    {errors.caption && <p className="text-xs text-red-500">{errors.caption}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="scheduled_at">Schedule Time</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                                        <Input 
                                            id="scheduled_at"
                                            type="datetime-local"
                                            className="pl-10"
                                            value={data.scheduled_at}
                                            onChange={e => setData('scheduled_at', e.target.value)}
                                        />
                                    </div>
                                    <p className="text-[11px] text-ink-500">
                                        💡 TikTok best times: 7-9am, 12-3pm, 7-11pm
                                    </p>
                                    {errors.scheduled_at && <p className="text-xs text-red-500">{errors.scheduled_at}</p>}
                                </div>

                                <div className="p-4 bg-ink-50 rounded-xl border border-ink-100">
                                    <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                                        <Smartphone className="h-3 w-3" /> Mobile Preview
                                    </h4>
                                    <div className="aspect-[4/5] bg-ink-200 rounded-lg overflow-hidden flex items-center justify-center text-ink-400 text-xs">
                                        [ No Media Selected ]
                                    </div>
                                    <div className="mt-2 text-[11px] line-clamp-2 text-ink-600 italic">
                                        {data.caption || "No caption written..."}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="submit" className="w-full" disabled={processing}>
                                        Schedule Content
                                    </Button>
                                </div>
                            </form>
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <div className="grid grid-cols-7 border-b bg-ink-50/50">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-ink-400">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 grid-rows-5 h-[600px] sm:h-[700px]">
                        {calendarDays.map((day: Date) => {
                            const dayPosts = getPostsForDay(day);
                            const isToday = isSameDay(day, new Date());
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <div 
                                    key={day.toISOString()}
                                    className={cn(
                                        "border-r border-b p-2 overflow-y-auto transition-colors",
                                        !isCurrentMonth && viewMode === 'month' && "bg-ink-50/30 text-ink-300",
                                        isToday && "bg-accent/5"
                                    )}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={cn(
                                            "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                                            isToday ? "bg-accent text-white" : "text-ink-600"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {dayPosts.map((post) => {
                                            const platform = PLATFORMS.find(p => p.id === post.platform);
                                            return (
                                                <div 
                                                    key={post.id}
                                                    onClick={() => setSelectedPost(post)}
                                                    className={cn(
                                                        "text-[10px] px-1.5 py-1 rounded cursor-pointer truncate flex items-center gap-1 hover:brightness-95 active:scale-[0.98] transition-all",
                                                        platform?.color || "bg-ink-100"
                                                    )}
                                                >
                                                    {platform && <platform.icon className="h-3 w-3 flex-shrink-0" />}
                                                    <span>{format(parseISO(post.scheduled_at), 'HH:mm')}</span>
                                                    <span className="opacity-80">·</span>
                                                    <span className="truncate">{post.caption}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Sheet open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
                <SheetContent side="right">
                    {selectedPost && (
                        <div className="space-y-6">
                                <SheetHeader>
                                <div className="flex items-center gap-2 mb-2">
                                    {(() => {
                                        const p = PLATFORMS.find(x => x.id === selectedPost.platform);
                                        return p && (
                                            <Badge className={cn("gap-1", p.color)}>
                                                <p.icon className="h-3 w-3" /> {p.label}
                                            </Badge>
                                        );
                                    })()}
                                    <Badge variant={
                                        selectedPost.status === 'published' ? 'default' :
                                        selectedPost.status === 'failed' ? 'destructive' : 'outline'
                                    }>
                                        {selectedPost.status}
                                    </Badge>
                                </div>
                                <SheetTitle>Post Details</SheetTitle>
                                <div className="text-sm text-ink-500 flex items-center gap-2">
                                    <Clock className="h-3 w-3" /> {format(parseISO(selectedPost.scheduled_at), 'MMMM d, yyyy @ HH:mm')}
                                </div>
                            </SheetHeader>

                            <div className="space-y-4">
                                <div className="p-4 bg-ink-50 rounded-xl text-sm leading-relaxed whitespace-pre-wrap">
                                    {selectedPost.caption}
                                </div>
                                
                                {selectedPost.media_url && (
                                    <div className="aspect-video bg-ink-100 rounded-xl flex items-center justify-center overflow-hidden border">
                                        <img src={selectedPost.media_url} className="w-full h-full object-cover" alt="Post content" />
                                    </div>
                                )}

                                <div className="pt-6 border-t flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={() => setSelectedPost(null)}>
                                        Close
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDelete(selectedPost.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </AuthenticatedLayout>
    );
}
