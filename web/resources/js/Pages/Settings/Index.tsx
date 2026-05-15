import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Bell, Key, User as UserIcon } from 'lucide-react';
import { FormEventHandler } from 'react';
import { Button } from '@/Components/ui/button';
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
                </Tabs>
            </div>
        </AuthenticatedLayout>
    );
}
