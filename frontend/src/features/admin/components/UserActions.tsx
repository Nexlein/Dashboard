import { Ban, EllipsisVertical, LogOut, ShieldCheck, ShieldOff, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AdminUser } from '../lib/admin';

export type UserAction = 'promote' | 'demote' | 'ban' | 'unban' | 'signOut' | 'remove';

/** The actions menu of one row. */
export function UserActions({
    user,
    disabled,
    onAction,
}: {
    user: AdminUser;
    disabled: boolean;
    onAction: (action: UserAction) => void;
}) {
    const label = user.name || user.email;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions pour ${label}`}
                        disabled={disabled}
                    />
                }
            >
                <EllipsisVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {user.role === 'admin' ? (
                    <DropdownMenuItem onClick={() => onAction('demote')}>
                        <ShieldOff />
                        Retirer le rôle administrateur
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => onAction('promote')}>
                        <ShieldCheck />
                        Nommer administrateur
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onAction('signOut')}>
                    <LogOut />
                    Déconnecter de partout
                </DropdownMenuItem>
                {user.banned ? (
                    <DropdownMenuItem onClick={() => onAction('unban')}>
                        <Undo2 />
                        Lever le bannissement
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => onAction('ban')}>
                        <Ban />
                        Bannir…
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onAction('remove')}>
                    <Trash2 />
                    Supprimer le compte
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
