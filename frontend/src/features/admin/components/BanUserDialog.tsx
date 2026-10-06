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
    { value: '1', label: '1 jour' },
    { value: '7', label: '7 jours' },
    { value: '30', label: '30 jours' },
    { value: 'permanent', label: 'Jusqu’à levée du bannissement' },
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
    const [reason, setReason] = useState('');
    const [duration, setDuration] = useState('7');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setBusy(true);
        try {
            await onBan(reason, duration === 'permanent' ? undefined : Number(duration));
        } catch (banError) {
            setError(banError instanceof Error ? banError.message : 'Le bannissement a échoué.');
            setBusy(false);
        }
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>Bannir {user.name || user.email}</DialogTitle>
                        <DialogDescription>
                            L’utilisateur est déconnecté de tous ses appareils et ne peut plus se
                            connecter pendant la durée choisie.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="ban-reason">Motif (facultatif, visible par l’équipe)</Label>
                        <Input
                            id="ban-reason"
                            value={reason}
                            maxLength={200}
                            placeholder="ex. spam"
                            onChange={(event) => setReason(event.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="ban-duration">Durée</Label>
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
                    {error && (
                        <p className="text-sm text-destructive" role="alert">
                            {error}
                        </p>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Annuler
                        </Button>
                        <Button type="submit" variant="destructive" disabled={busy}>
                            {busy ? 'Bannissement…' : 'Bannir'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
