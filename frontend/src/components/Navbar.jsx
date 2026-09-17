import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, LogOut, Moon, Sun, UserRound } from 'lucide-react';
import { WidgetConfigurator } from '@/components/WidgetConfigurator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar({ user, onLogout }) {
    const { theme, setTheme } = useStore();
    const accountLabel = user?.displayName || user?.email || 'Compte';
    const initial = accountLabel.charAt(0).toUpperCase();

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        return () => {
            // Public pages must not inherit the previous user's visual preference.
            document.documentElement.classList.remove('dark');
        };
    }, [theme]);

    return (
        <nav className="flex items-center justify-between gap-4 border-b border-border bg-card p-4 shadow-sm">
            <h1 className="hidden text-xl font-bold text-foreground sm:block">Dashboard</h1>
            <div className="flex min-w-0 items-center gap-3">
                <WidgetConfigurator />

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant="outline"
                                className="h-11 min-w-0 gap-2 rounded-xl px-2.5 sm:px-3"
                                aria-label={`Ouvrir le menu du compte ${accountLabel}`}
                            />
                        }
                    >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                            {user ? initial : <UserRound className="size-4" />}
                        </span>
                        <span className="max-w-28 truncate sm:max-w-40">{accountLabel}</span>
                        <ChevronDown className="size-4 text-muted-foreground" />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" sideOffset={8} className="w-60 p-2">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="px-2 py-2">
                                <span className="block truncate text-sm font-medium text-foreground">
                                    {accountLabel}
                                </span>
                                {user?.displayName && (
                                    <span className="mt-0.5 block truncate font-normal">
                                        {user.email}
                                    </span>
                                )}
                            </DropdownMenuLabel>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="px-2 pt-2">Thème</DropdownMenuLabel>
                            <DropdownMenuItem
                                className="min-h-9 px-2"
                                onClick={() => setTheme('light')}
                            >
                                <Sun />
                                Thème clair
                                {theme === 'light' && <Check className="ml-auto" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="min-h-9 px-2"
                                onClick={() => setTheme('dark')}
                            >
                                <Moon />
                                Thème sombre
                                {theme === 'dark' && <Check className="ml-auto" />}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            className="min-h-9 px-2"
                            onClick={onLogout}
                        >
                            <LogOut />
                            Se déconnecter
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    );
}
