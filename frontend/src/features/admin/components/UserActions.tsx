import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
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
    useTranslation();
    const label = user.name || user.email;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={i18n.t('admin:actionsFor', { name: label })}
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
                        {i18n.t('admin:demote')}
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => onAction('promote')}>
                        <ShieldCheck />
                        {i18n.t('admin:promote')}
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onAction('signOut')}>
                    <LogOut />
                    {i18n.t('admin:signOutEverywhere')}
                </DropdownMenuItem>
                {user.banned ? (
                    <DropdownMenuItem onClick={() => onAction('unban')}>
                        <Undo2 />
                        {i18n.t('admin:unban')}
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => onAction('ban')}>
                        <Ban />
                        {i18n.t('admin:banAction')}
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onAction('remove')}>
                    <Trash2 />
                    {i18n.t('admin:remove')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
