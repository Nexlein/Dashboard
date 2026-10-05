import { fetchClient } from '@/lib/apiClient';

/** Names of the models installed on the Ollama server. */
export async function fetchOllamaModels(): Promise<string[]> {
    const data: { models?: { name: string }[] } = await fetchClient('/chatbot/models');
    return data.models?.map((m) => m.name) ?? [];
}

export async function pullOllamaModel(model: string) {
    await fetchClient('/chatbot/pull', { method: 'POST', body: JSON.stringify({ model }) });
    return model;
}

/**
 * Whether an installed Ollama model is `modelId`: same name, or same name with a tag when
 * `modelId` has none ("llama3" matches "llama3:latest" and "llama3:8b", not "llama3.2:1b").
 */
export function isSameModel(installed: string, modelId: string) {
    return installed === modelId || (!modelId.includes(':') && installed.startsWith(`${modelId}:`));
}
