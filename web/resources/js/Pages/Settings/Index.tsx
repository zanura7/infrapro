import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { Bell, Camera, Key, Link2, Share2, User as UserIcon, Video } from 'lucide-react';
import { ComponentType, FormEventHandler } from 'react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';

type Props = {
    user: { id: number; name: string; email: string; role: string };
};

function ProfileTab({ user }: Props) {
    const { data, setData, patch, processing, errors } = useForm({
        name: user.name,
        email: user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <Card className="border-border bg-card">
            <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your name and email address.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="max-w-xl space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email}</p>
                        )}
                    </div>
                    <Button type="submit" disabled={processing}>
                        Save
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function ApiKeysTab() {
    return (
        <Card className="border-border bg-card">
            <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                    Manage API keys for external integrations.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    API key management will be available in a future update.
                </p>
            </CardContent>
        </Card>
    );
}

function NotificationsTab() {
    return (
        <Card className="border-border bg-card">
            <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                    Configure how and when you receive notifications.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Notification preferences will be available in a future update.
                </p>
            </CardContent>
        </Card>
    );
}

type Integration = {
    id: string;
    name: string;
    icon: ComponentType<{ className?: string }>;
    connected: boolean;
};

function IntegrationsTab() {
    const integrations: Integration[] = [
        { id: 'tiktok', name: 'TikTok', icon: Video, connected: false },
        { id: 'instagram', name: 'Instagram', icon: Camera, connected: false },
        { id: 'facebook', name: 'Facebook', icon: Share2, connected: false },
    ];

    const handleConnect = (id: string) => {
        // TODO: Redirect to OAuth flow
        window.location.href = `/integrations/${id}/connect`;
    };

    const handleDisconnect = (id: string) => {
        router.post(`/integrations/${id}/disconnect`);
    };

    return (
        <Card className="border-border bg-card">
            <CardHeader>
                <CardTitle>Social Integrations</CardTitle>
                <CardDescription>
                    Connect your social media accounts to publish content directly.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {integrations.map((integration) => {
                        const Icon = integration.icon;
                        return (
                            <div
                                key={integration.id}
                                className="flex items-center justify-between rounded-lg border border-border p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="h-6 w-6 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">{integration.name}</p>
                                        <div className="mt-1">
                                            {integration.connected ? (
                                                <Badge variant="default" className="bg-green-600">
                                                    Connected
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Not Connected</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    {integration.connected ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDisconnect(integration.id)}
                                        >
                                            Disconnect
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => handleConnect(integration.id)}
                                        >
                                            Connect
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

export default function SettingsIndex({ user }: Props) {
    return (
        <AuthenticatedLayout header="Settings" activeKey="settings">
            <Head title="Settings" />

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="profile" className="gap-2">
                            <UserIcon className="h-4 w-4" />
                            Profile
                        </TabsTrigger>
                        <TabsTrigger value="api-keys" className="gap-2">
                            <Key className="h-4 w-4" />
                            API Keys
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="gap-2">
                            <Bell className="h-4 w-4" />
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger value="integrations" className="gap-2">
                            <Link2 className="h-4 w-4" />
                            Integrations
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <ProfileTab user={user} />
                    </TabsContent>
                    <TabsContent value="api-keys">
                        <ApiKeysTab />
                    </TabsContent>
                    <TabsContent value="notifications">
                        <NotificationsTab />
                    </TabsContent>
                    <TabsContent value="integrations">
                        <IntegrationsTab />
                    </TabsContent>
                </Tabs>
            </div>
        </AuthenticatedLayout>
    );
}
