export function OllamaLogo({ className }: { className?: string }) {
    return (
        <img
            src="https://ollama.com/public/ollama.png"
            alt="Ollama"
            className={className}
            style={{ objectFit: 'contain' }}
        />
    );
}
