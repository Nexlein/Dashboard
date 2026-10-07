import { getErrorMessage, notice, translateNotice, type LocalizedNotice } from '@/i18n/errors';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from 'shared';
import { changeEmail, requestEmailChange, updateProfile } from '@/lib/auth';
import { CURRENT_USER_KEY } from '@/features/auth/hooks/useCurrentUser';

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
    const { t } = useTranslation('account');
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
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
    const { t } = useTranslation(['account', 'common']);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    // The new address waiting for its emailed code.
    const [pendingEmail, setPendingEmail] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState<unknown>('');
    const [success, setSuccess] = useState<LocalizedNotice | null>(null);

    const queryClient = useQueryClient();

    function saved(updatedUser: User, message: LocalizedNotice) {
        onUserUpdated(updatedUser);
        queryClient.setQueryData(CURRENT_USER_KEY, updatedUser);
        setSuccess(message);
        setTimeout(() => onOpenChange(false), 1500);
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            const updatedUser = name !== (user?.name ?? '') ? await updateProfile({ name }) : null;
            const newEmail = email.trim().toLowerCase();
            const emailChanged = newEmail !== user?.email;
            // The address changes only once the code sent to it is entered.
            if (emailChanged) await requestEmailChange(newEmail);
            return { updatedUser, pending: emailChanged ? newEmail : null };
        },
        onMutate: () => {
            setError('');
            setSuccess(null);
        },
        onSuccess: ({ updatedUser, pending }) => {
            if (updatedUser) onUserUpdated(updatedUser);
            if (updatedUser) queryClient.setQueryData(CURRENT_USER_KEY, updatedUser);
            if (pending) {
                setPendingEmail(pending);
                return;
            }
            saved(updatedUser ?? user!, notice('account:profileUpdated'));
        },
        onError: (err: Error) => setError(err),
    });

    const confirmMutation = useMutation({
        mutationFn: () => changeEmail(pendingEmail!, code.trim()),
        onMutate: () => setError(''),
        onSuccess: (updatedUser) => saved(updatedUser, notice('account:emailUpdated')),
        onError: (err: Error) => setError(err),
    });

    if (pendingEmail) {
        return (
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    confirmMutation.mutate();
                }}
                className="space-y-4"
            >
                <p className="text-sm text-muted-foreground" role="status">
                    {t('account:emailCodeSent', { email: pendingEmail })}
                </p>
                <div className="space-y-2">
                    <Label htmlFor="email-code">{t('account:code')}</Label>
                    <Input
                        id="email-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        required
                    />
                </div>
                {Boolean(error) && (
                    <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
                )}
                {success && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                        {translateNotice(success)}
                    </p>
                )}
                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={confirmMutation.isPending || code.length !== 6}>
                        {confirmMutation.isPending
                            ? t('account:checking')
                            : t('account:confirmEmail')}
                    </Button>
                </div>
            </form>
        );
    }

    const loading = saveMutation.isPending;

    function handleSubmit(e: React.SubmitEvent) {
        e.preventDefault();
        saveMutation.mutate();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="displayName">{t('account:displayName')}</Label>
                <Input
                    id="displayName"
                    maxLength={50}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">{t('account:emailAddress')}</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-describedby="email-help"
                    required
                />
                <p id="email-help" className="text-xs text-muted-foreground">
                    {t('account:emailHint')}
                </p>
            </div>
            {Boolean(error) && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
            {success && (
                <p className="text-sm text-green-600 dark:text-green-400">
                    {translateNotice(success)}
                </p>
            )}
            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                    {loading ? t('common:saving') : t('common:saveChanges')}
                </Button>
            </div>
        </form>
    );
}
