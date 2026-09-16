import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { WidgetConfigurator } from '@/components/WidgetConfigurator';

export default function Navbar() {
    const { theme, setTheme } = useStore();

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    return (
        <nav className="flex items-center justify-between p-4 bg-card border-b border-border shadow-sm">
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <Sun className="h-4 w-4 text-muted-foreground" />
                    <Switch
                        checked={theme === 'dark'}
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                    <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
                <WidgetConfigurator />
            </div>
        </nav>
    );
}
