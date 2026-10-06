import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '@/features/services/hooks/useServices';
import { Loader2, Plus, Search, X } from 'lucide-react';
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
import { searchStocks, type StockSearchResult } from '@/features/services/lib/services';
import type { WidgetParamDefinition } from '@/features/widgets/lib/types';
import { YouTubeChannelsField } from './YouTubeChannelsField';

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

const MAX_SELECTED_ITEMS = 8;

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
        const next = [...new Set([...selected, ...additions])].slice(0, MAX_SELECTED_ITEMS);
        onChange(next.join(','));
        setDraft('');
    };

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
                <Label>{param.label}</Label>
                <span className="text-xs text-muted-foreground">
                    {selected.length}/{MAX_SELECTED_ITEMS} selected
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
                    disabled={selected.length >= MAX_SELECTED_ITEMS}
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
                    disabled={!draft.trim() || selected.length >= MAX_SELECTED_ITEMS}
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
                            disabled={selected.length >= MAX_SELECTED_ITEMS}
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

function StockMultiSelectField({ param, value, onChange }: FieldProps) {
    const maxSelected = param.type === 'stock-select' ? 1 : MAX_SELECTED_ITEMS;
    const selected = selectedValues(value).map((symbol) => symbol.toUpperCase());
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<StockSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState('');

    useEffect(() => {
        const normalizedQuery = query.trim();
        if (normalizedQuery.length < 1) return;

        let active = true;
        const timeout = window.setTimeout(() => {
            setLoading(true);
            setSearchError('');
            searchStocks(normalizedQuery)
                .then((items) => {
                    if (active) setResults(items);
                })
                .catch((error) => {
                    if (active) {
                        setResults([]);
                        setSearchError(
                            error instanceof Error ? error.message : 'Unable to search stocks',
                        );
                    }
                })
                .finally(() => {
                    if (active) setLoading(false);
                });
        }, 350);

        return () => {
            active = false;
            window.clearTimeout(timeout);
        };
    }, [query]);

    const addSymbol = (rawSymbol: string) => {
        const symbol = rawSymbol.trim().toUpperCase();
        if (!symbol || !/^[A-Z0-9.^/-]+$/.test(symbol) || selected.includes(symbol)) {
            return;
        }
        onChange([...selected, symbol].slice(0, maxSelected).join(','));
        setQuery('');
        setResults([]);
    };

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
                <Label>{param.label}</Label>
                <span className="text-xs text-muted-foreground">
                    {selected.length}/{maxSelected} selected
                </span>
            </div>
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5" aria-label="Selected stocks">
                    {selected.map((symbol) => (
                        <span
                            key={symbol}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-semibold text-primary"
                        >
                            {symbol}
                            <button
                                type="button"
                                className="rounded-full p-0.5 hover:bg-primary/15"
                                aria-label={`Remove ${symbol}`}
                                onClick={() =>
                                    onChange(selected.filter((item) => item !== symbol).join(','))
                                }
                            >
                                <X className="size-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <form
                className="relative flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    addSymbol(query);
                }}
            >
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        aria-label="Search stocks"
                        className="pl-9 pr-9"
                        placeholder={param.placeholder}
                        value={query}
                        disabled={selected.length >= maxSelected}
                        autoComplete="off"
                        onChange={(event) => {
                            const nextQuery = event.target.value;
                            setQuery(nextQuery);
                            if (!nextQuery.trim()) {
                                setResults([]);
                                setSearchError('');
                            }
                        }}
                    />
                    {loading && (
                        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                </div>
                <Button
                    type="submit"
                    size="icon"
                    variant="outline"
                    aria-label="Add stock symbol"
                    disabled={!query.trim() || selected.length >= maxSelected}
                >
                    <Plus className="size-4" />
                </Button>
            </form>
            {results.length > 0 && (
                <div
                    className="max-h-44 overflow-y-auto rounded-md border bg-popover p-1"
                    role="listbox"
                    aria-label="Stock search results"
                >
                    {results
                        .filter((result) => !selected.includes(result.symbol))
                        .map((result) => (
                            <button
                                key={`${result.symbol}:${result.exchange}`}
                                type="button"
                                className="flex w-full items-center justify-between gap-3 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => addSymbol(result.symbol)}
                            >
                                <span className="min-w-0">
                                    <span className="font-semibold">{result.symbol}</span>
                                    <span className="ml-2 truncate text-muted-foreground">
                                        {result.name}
                                    </span>
                                </span>
                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                    {result.exchange}
                                </span>
                            </button>
                        ))}
                </div>
            )}
            {searchError && <p className="text-xs text-destructive">{searchError}</p>}
            <div className="flex flex-wrap gap-1.5" aria-label="Popular stocks">
                {(param.options ?? [])
                    .filter((option) => !selected.includes(option.value))
                    .map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                            disabled={selected.length >= maxSelected}
                            onClick={() => addSymbol(option.value)}
                        >
                            + {option.label} ({option.value})
                        </button>
                    ))}
            </div>
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
    const groupName = useId();
    if (param.type === 'youtube-channels')
        return (
            <YouTubeChannelsField
                id={param.id}
                label={param.label}
                value={value}
                onChange={onChange}
            />
        );
    if (param.type === 'hidden') return null;

    if (param.type === 'account') {
        return <AccountField param={param} value={value} onChange={onChange} />;
    }

    if (param.type === 'coin-multiselect') {
        return <CoinMultiSelectField param={param} value={value} onChange={onChange} />;
    }

    if (param.type === 'stock-multiselect' || param.type === 'stock-select') {
        return <StockMultiSelectField param={param} value={value} onChange={onChange} />;
    }

    if (param.type === 'segmented') {
        return (
            <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">{param.label}</legend>
                <div className="grid grid-cols-5 gap-1 rounded-xl border bg-muted/40 p-1">
                    {(param.options ?? []).map((option) => (
                        <label key={option.value} className="cursor-pointer" title={option.label}>
                            <input
                                className="peer sr-only"
                                type="radio"
                                name={groupName}
                                value={option.value}
                                checked={value === option.value}
                                aria-label={option.label}
                                onChange={() => onChange(option.value)}
                            />
                            <span className="flex justify-center rounded-lg px-2 py-2 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground peer-checked:bg-background peer-checked:text-primary peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                                {option.value}
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>
        );
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
