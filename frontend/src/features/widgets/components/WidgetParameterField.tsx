import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { WidgetParamDefinition } from '@/features/widgets/lib/types';
import { useServices } from '@/features/services/hooks/useServices';

type FieldProps = {
    param: WidgetParamDefinition;
    value: string;
    onChange: (value: string) => void;
};

function selectedValues(value: string) {
    return typeof value === 'string'
        ? value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
        : [];
}

const MAX_SELECTED_COINS = 8;

function normalizeCoinId(value: string) {
    return value.trim().toLowerCase().replaceAll(' ', '-');
}

function CoinMultiSelectField({ param, value, onChange }: FieldProps) {
    const selected = selectedValues(value);
    const [draft, setDraft] = useState('');

    const addCoins = (values: string[]) => {
        const additions = values
            .map(normalizeCoinId)
            .filter((coin) => coin && /^[a-z0-9-]+$/.test(coin));
        const next = [...new Set([...selected, ...additions])].slice(0, MAX_SELECTED_COINS);
        onChange(next.join(','));
        setDraft('');
    };

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
                <Label>{param.label}</Label>
                <span className="text-xs text-muted-foreground">
                    {selected.length}/{MAX_SELECTED_COINS} selected
                </span>
            </div>
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5" aria-label="Selected cryptocurrencies">
                    {selected.map((coin) => (
                        <span
                            key={coin}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-primary"
                        >
                            {coin}
                            <button
                                type="button"
                                className="rounded-full p-0.5 hover:bg-primary/15"
                                aria-label={`Remove ${coin}`}
                                onClick={() =>
                                    onChange(selected.filter((item) => item !== coin).join(','))
                                }
                            >
                                <X className="size-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <form
                className="flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    addCoins(draft.split(','));
                }}
            >
                <Input
                    aria-label="CoinGecko coin ID"
                    placeholder={param.placeholder}
                    value={draft}
                    disabled={selected.length >= MAX_SELECTED_COINS}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === ',') {
                            event.preventDefault();
                            addCoins(draft.split(','));
                        }
                    }}
                />
                <Button
                    type="submit"
                    size="icon"
                    variant="outline"
                    aria-label="Add cryptocurrency"
                    disabled={!draft.trim() || selected.length >= MAX_SELECTED_COINS}
                >
                    <Plus className="size-4" />
                </Button>
            </form>
            <div className="flex flex-wrap gap-1.5" aria-label="Popular cryptocurrencies">
                {(param.options ?? [])
                    .filter((option) => !selected.includes(option.value))
                    .slice(0, 6)
                    .map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                            disabled={selected.length >= MAX_SELECTED_COINS}
                            onClick={() => addCoins([option.value])}
                        >
                            + {option.label}
                        </button>
                    ))}
            </div>
            <p className="text-xs text-muted-foreground">
                Enter any CoinGecko coin ID. Press Enter or comma to add it.
            </p>
        </div>
    );
}

/** Which connected account (e.g. which GitHub account) the widget reads from. */
function AccountField({ param, value, onChange }: FieldProps) {
    const { data: services } = useServices();
    const service = services?.find((item) => item.name === param.service);
    const accounts = service?.accounts ?? [];
    const onlyAccount = accounts.length === 1 ? String(accounts[0].id) : null;

    // With a single connected account there is nothing to choose.
    useEffect(() => {
        if (onlyAccount && !value) onChange(onlyAccount);
    }, [onlyAccount, value, onChange]);

    if (services && accounts.length === 0) {
        return (
            <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground" role="status">
                Connect a {service?.displayName ?? param.service} account in{' '}
                <Link to="/services" className="font-medium text-foreground underline">
                    Services
                </Link>{' '}
                first.
            </p>
        );
    }

    return (
        <div className="grid gap-2">
            <Label htmlFor={param.id}>{param.label}</Label>
            <Select value={value || ''} onValueChange={(next) => onChange(String(next ?? ''))}>
                <SelectTrigger id={param.id}>
                    <SelectValue placeholder="Choose an account" />
                </SelectTrigger>
                <SelectContent>
                    {accounts.map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                            {account.login ?? `Account #${account.id} (no longer accessible)`}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export function WidgetParameterField({ param, value, onChange }: FieldProps) {
    if (param.type === 'hidden') return null;

    if (param.type === 'account') {
        return <AccountField param={param} value={value} onChange={onChange} />;
    }

    if (param.type === 'coin-multiselect') {
        return <CoinMultiSelectField param={param} value={value} onChange={onChange} />;
    }

    if (param.type === 'select') {
        return (
            <div className="grid gap-2">
                <Label htmlFor={param.id}>{param.label}</Label>
                <Select value={value || ''} onValueChange={onChange}>
                    <SelectTrigger id={param.id}>
                        <SelectValue placeholder={param.placeholder || 'Select an option'} />
                    </SelectTrigger>
                    <SelectContent>
                        {(param.options ?? []).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    return (
        <div className="grid gap-2">
            <Label htmlFor={param.id}>{param.label}</Label>
            <Input
                id={param.id}
                type={param.type}
                placeholder={param.placeholder}
                value={value || ''}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}
