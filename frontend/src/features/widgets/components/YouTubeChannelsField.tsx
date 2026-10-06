import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { youtubeChannels } from 'shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function YouTubeChannelsField({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    useTranslation();
    const selected = value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState(false);
    const add = () => {
        const channels = youtubeChannels([...selected, draft].join('\n'));
        if (!channels || !draft.trim()) {
            setError(true);
            return;
        }
        onChange(channels.join('\n'));
        setDraft('');
        setError(false);
    };
    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
                <Label htmlFor={id}>{label}</Label>
                <span className="text-xs text-muted-foreground">{selected.length}/5</span>
            </div>
            <div className="flex flex-wrap gap-1.5" aria-label={i18n.t('widgets:selectedChannels')}>
                {selected.map((channel) => (
                    <span
                        key={channel}
                        className="inline-flex max-w-full items-center gap-1 rounded-full bg-red-500/10 py-1 pl-2.5 pr-1 text-xs font-medium"
                    >
                        <span className="truncate">{channel}</span>
                        <button
                            type="button"
                            aria-label={i18n.t('widgets:removeCoin', { name: channel })}
                            className="shrink-0 cursor-pointer rounded-full p-1 hover:bg-red-500/20"
                            onClick={() => {
                                onChange(selected.filter((item) => item !== channel).join('\n'));
                                setError(false);
                            }}
                        >
                            <X className="size-3" aria-hidden="true" />
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <Input
                    id={id}
                    value={draft}
                    placeholder="https://www.youtube.com/@channel"
                    disabled={selected.length >= 5}
                    aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
                    aria-invalid={!!error}
                    onChange={(event) => {
                        setDraft(event.target.value);
                        setError(false);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            add();
                        }
                    }}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={i18n.t('widgets:addChannel')}
                    disabled={!draft.trim() || selected.length >= 5}
                    onClick={add}
                >
                    <Plus className="size-4" />
                </Button>
            </div>
            <p id={`${id}-help`} className="text-xs text-muted-foreground">
                {i18n.t('widgets:channelHint')}
            </p>
            {error && (
                <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
                    {i18n.t('widgets:channelInvalid')}
                </p>
            )}
        </div>
    );
}
