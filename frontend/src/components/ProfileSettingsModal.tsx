import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from 'shared';
import { updateProfile } from '@/lib/auth';

type ProfileProps = {
    user: User | null;
    onUserUpdated: (user: User) => void;
    onOpenChange: (open: boolean) => void;
};

export function ProfileSettingsModal({
    open,
    onOpenChange,
    user,
    onUserUpdated,
}: ProfileProps & { open: boolean }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Profile Settings</DialogTitle>
                </DialogHeader>
                {/* DialogContent unmounts when closed: the form starts fresh on each open. */}
                <ProfileForm
                    user={user}
                    onUserUpdated={onUserUpdated}
                    onOpenChange={onOpenChange}
                />
            </DialogContent>
        </Dialog>
    );
}

function ProfileForm({ user, onUserUpdated, onOpenChange }: ProfileProps) {
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const queryClient = useQueryClient();

    const updateProfileMutation = useMutation({
        mutationFn: updateProfile,
        onMutate: () => {
            setError('');
            setSuccess('');
        },
        onSuccess: (updatedUser) => {
            onUserUpdated(updatedUser);
            queryClient.setQueryData(['currentUser'], updatedUser);
            setSuccess('Profile updated successfully');
            setTimeout(() => onOpenChange(false), 1500);
        },
        onError: (err: Error) => setError(err.message),
    });

    const loading = updateProfileMutation.isPending;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        updateProfileMutation.mutate({ displayName, email });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                    id="displayName"
                    maxLength={50}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}
            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}
