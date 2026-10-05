import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchOllamaModels, isSameModel, pullOllamaModel } from '@/features/widgets/lib/ollama';
import type { CustomConfigProps } from '@/features/widgets/lib/types';

const RECOMMENDED_MODELS = [
    { id: 'llama3.2:1b', name: 'Llama 3.2 (1B) - Very Fast' },
    { id: 'qwen2:1.5b', name: 'Qwen 2 (1.5B) - Smart & Light' },
    { id: 'llama3', name: 'Llama 3 (8B) - Powerful' },
];

export function OllamaModelManager({ selectedModel, onSelectModel }: CustomConfigProps) {
    const [pulling, setPulling] = useState<string | false>(false);
    const [error, setError] = useState<string | null>(null);

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

    // sync error state
    if (queryError && !error) setError(queryError.message);

    const pullMutation = useMutation({
        mutationFn: pullOllamaModel,
        onMutate: (modelId: string) => {
            setPulling(modelId);
            setError(null);
        },
        onSuccess: (modelId: string) => {
            queryClient.invalidateQueries({ queryKey: ['ollamaModels'] });
            onSelectModel(modelId);
            const input = document.getElementById('customModelInput') as HTMLInputElement | null;
            if (input) input.value = '';
        },
        onError: (err: Error) => setError(err.message),
        onSettled: () => setPulling(false),
    });

    const pullModel = (modelId: string) => pullMutation.mutate(modelId);

    return (
        <div className="space-y-3 mt-4 border rounded-md p-3 bg-muted/20">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold">Recommended Models</h4>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        void fetchModels();
                    }}
                    disabled={loading || !!pulling}
                    className="h-6 w-6"
                >
                    <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
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
                                                <Check className="mr-1 size-3" /> Selected
                                            </>
                                        ) : (
                                            'Select'
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
                                                Pulling...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-1 size-3" /> Install
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
                                            <Check className="mr-1 size-3" /> Selected
                                        </>
                                    ) : (
                                        'Select'
                                    )}
                                </Button>
                            </div>
                        );
                    })}
            </div>

            <div className="pt-3 mt-3 border-t flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Custom model tag (e.g. mistral)"
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    id="customModelInput"
                />
                <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs shrink-0"
                    disabled={!!pulling}
                    onClick={() => {
                        const input = document.getElementById(
                            'customModelInput',
                        ) as HTMLInputElement | null;
                        const val = input?.value.trim();
                        if (val) pullModel(val);
                    }}
                >
                    {pulling ? <Loader2 className="size-3 animate-spin" /> : 'Pull'}
                </Button>
            </div>
        </div>
    );
}
