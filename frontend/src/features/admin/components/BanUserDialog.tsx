import { getErrorMessage } from '@/i18n/errors';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AdminUser } from '../lib/admin';

const DURATIONS = [
    {
        value: '1',
        get label() {
            return i18n.t('admin:oneDay');
        },
    },
    {
        value: '7',
        get label() {
            return i18n.t('admin:sevenDays');
        },
    },
    {
        value: '30',
        get label() {
            return i18n.t('admin:thirtyDays');
        },
    },
    {
        value: 'permanent',
        get label() {
            return i18n.t('admin:permanentBan');
        },
    },
];

/** Asks for the reason and the length of a ban. Mounted only while a user is being banned. */
export function BanUserDialog({
    user,
    onCancel,
    onBan,
}: {
    user: AdminUser;
    onCancel: () => void;
    onBan: (reason: string, expiresInDays?: number) => Promise<void>;
}) {
    useTranslation();
    const [reason, setReason] = useState('');
    const [duration, setDuration] = useState('7');
    const [error, setError] = useState<unknown>('');
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setBusy(true);
        try {
            await onBan(reason, duration === 'permanent' ? undefined : Number(duration));
        } catch (banError) {
            setError(banError);
            setBusy(false);
        }
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>
                            {i18n.t('admin:banTitle', { name: user.name || user.email })}
                        </DialogTitle>
                        <DialogDescription>{i18n.t('admin:banHint')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="ban-reason">{i18n.t('admin:reason')}</Label>
                        <Input
                            id="ban-reason"
                            value={reason}
                            maxLength={200}
                            placeholder={i18n.t('admin:reasonPlaceholder')}
                            onChange={(event) => setReason(event.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="ban-duration">{i18n.t('admin:duration')}</Label>
                        <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger id="ban-duration">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DURATIONS.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {Boolean(error) && (
                        <p className="text-sm text-destructive" role="alert">
                            {getErrorMessage(error)}
                        </p>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onCancel}>
                            {i18n.t('common:cancel')}
                        </Button>
                        <Button type="submit" variant="destructive" disabled={busy}>
                            {busy ? i18n.t('admin:banning') : i18n.t('admin:ban')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
