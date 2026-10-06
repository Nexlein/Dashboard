import { getErrorMessage } from '@/i18n/errors';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchOllamaModels, isSameModel, pullOllamaModel } from '@/features/widgets/lib/ollama';
import type { CustomConfigProps } from '@/features/widgets/lib/types';

const RECOMMENDED_MODELS = [
    {
        id: 'llama3.2:1b',
        get name() {
            return i18n.t('chatbot:fastModel');
        },
    },
    {
        id: 'qwen2:1.5b',
        get name() {
            return i18n.t('chatbot:lightModel');
        },
    },
    {
        id: 'llama3',
        get name() {
            return i18n.t('chatbot:powerfulModel');
        },
    },
];

export function OllamaModelManager({ selectedModel, onSelectModel }: CustomConfigProps) {
    useTranslation();
    const [customModel, setCustomModel] = useState('');
    const queryClient = useQueryClient();

    const {
        data: installedModels = [],
        isLoading: loading,
        error: queryError,
        refetch: fetchModels,
    } = useQuery({
        queryKey: ['ollamaModels'],
        queryFn: fetchOllamaModels,
    });

    const pullMutation = useMutation({
        mutationFn: pullOllamaModel,
        onSuccess: (modelId) => {
            queryClient.invalidateQueries({ queryKey: ['ollamaModels'] });
            onSelectModel(modelId);
            setCustomModel('');
        },
    });

    const pullModel = (modelId: string) => pullMutation.mutate(modelId);
    const pulling = pullMutation.isPending ? pullMutation.variables : false;
    // A new pull clears the previous pull error; a successful refetch clears the list error.
    const error = pullMutation.error ?? queryError ?? null;

    return (
        <div className="space-y-3 mt-4 border rounded-md p-3 bg-muted/20">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold">{i18n.t('chatbot:recommended')}</h4>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={i18n.t('chatbot:refreshModels')}
                    onClick={() => {
                        void fetchModels();
                    }}
                    disabled={loading || !!pulling}
                    className="h-6 w-6"
                >
                    <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            {error && <p className="text-xs text-destructive">{getErrorMessage(error)}</p>}
            <div className="space-y-2">
                {RECOMMENDED_MODELS.map((m) => {
                    const isInstalled = installedModels.some((installed) =>
                        isSameModel(installed, m.id),
                    );
                    const isPulling = pulling === m.id;
                    const isSelected = selectedModel === m.id || selectedModel === `${m.id}:latest`;

                    return (
                        <div
                            key={m.id}
                            className="flex items-center justify-between text-sm p-2 rounded border bg-background"
                        >
                            <span className="font-medium">{m.name}</span>
                            <div className="flex items-center gap-2">
                                {isInstalled ? (
                                    <Button
                                        type="button"
                                        variant={isSelected ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => onSelectModel(m.id)}
                                    >
                                        {isSelected ? (
                                            <>
                                                <Check className="mr-1 size-3" />
                                                {i18n.t('chatbot:selected')}
                                            </>
                                        ) : (
                                            i18n.t('chatbot:select')
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="h-7 text-xs"
                                        disabled={isPulling}
                                        onClick={() => pullModel(m.id)}
                                    >
                                        {isPulling ? (
                                            <>
                                                <Loader2 className="mr-1 size-3 animate-spin" />{' '}
                                                {i18n.t('chatbot:pulling')}
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-1 size-3" />
                                                {i18n.t('chatbot:install')}
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {installedModels
                    .filter(
                        (installed) =>
                            !RECOMMENDED_MODELS.some((m) => isSameModel(installed, m.id)),
                    )
                    .map((installed) => {
                        const isSelected =
                            selectedModel === installed || selectedModel === `${installed}:latest`;
                        return (
                            <div
                                key={installed}
                                className="flex items-center justify-between text-sm p-2 rounded border bg-background"
                            >
                                <span className="font-medium text-muted-foreground">
                                    {installed}
                                </span>
                                <Button
                                    type="button"
                                    variant={isSelected ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => onSelectModel(installed)}
                                >
                                    {isSelected ? (
                                        <>
                                            <Check className="mr-1 size-3" />
                                            {i18n.t('chatbot:selected')}
                                        </>
                                    ) : (
                                        i18n.t('chatbot:select')
                                    )}
                                </Button>
                            </div>
                        );
                    })}
            </div>

            <div className="pt-3 mt-3 border-t flex items-center gap-2">
                <input
                    type="text"
                    aria-label={i18n.t('chatbot:customTag')}
                    placeholder={i18n.t('chatbot:customTagPlaceholder')}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    value={customModel}
                    onChange={(event) => setCustomModel(event.target.value)}
                />
                <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs shrink-0"
                    disabled={!!pulling}
                    onClick={() => {
                        const tag = customModel.trim();
                        if (tag) pullModel(tag);
                    }}
                >
                    {pulling ? <Loader2 className="size-3 animate-spin" /> : i18n.t('chatbot:pull')}
                </Button>
            </div>
        </div>
    );
}
