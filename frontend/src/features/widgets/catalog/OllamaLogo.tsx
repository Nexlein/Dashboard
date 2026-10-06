export function OllamaLogo({ className }: { className?: string }) {
    return (
        <img
            src="/logos/ollama.png"
            alt="Ollama"
            className={className}
            style={{ objectFit: 'contain' }}
        />
    );
}
