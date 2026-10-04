import { fetchClient } from '../../../lib/apiClient';

/** Names of the models installed on the Ollama server. */
export async function fetchOllamaModels(): Promise<string[]> {
    const data: { models?: { name: string }[] } = await fetchClient('/chatbot/models');
    return data.models?.map((m) => m.name) ?? [];
}

export async function pullOllamaModel(model: string) {
    await fetchClient('/chatbot/pull', { method: 'POST', body: JSON.stringify({ model }) });
    return model;
}
