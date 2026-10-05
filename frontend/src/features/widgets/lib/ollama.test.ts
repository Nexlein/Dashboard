import { describe, expect, it } from 'vitest';
import { isSameModel } from './ollama';

describe('isSameModel', () => {
    it.each([
        ['llama3', 'llama3', true],
        ['llama3:latest', 'llama3', true],
        ['llama3:8b', 'llama3', true],
        ['llama3.2:1b', 'llama3', false],
        ['llama3.2:1b', 'llama3.2:1b', true],
        ['llama3.2:3b', 'llama3.2:1b', false],
        ['qwen2:1.5b', 'qwen2', true],
        ['qwen2.5:7b', 'qwen2', false],
    ])('%s is %s: %s', (installed, modelId, expected) => {
        expect(isSameModel(installed, modelId)).toBe(expected);
    });
});
