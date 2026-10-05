import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, User, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    sendWidgetChatMessage,
    type ChatMessage,
    type DashboardWidget,
} from '@/features/widgets/lib/widgets';
import { OllamaLogo } from '@/features/widgets/catalog/OllamaLogo';
import { CHAT_HISTORY_PREFIX } from '@/lib/auth';

export function ChatbotWidget({ widget }: { widget: DashboardWidget }) {
    const { id } = widget;
    const storageKey = `${CHAT_HISTORY_PREFIX}${id}`;

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved
                ? JSON.parse(saved)
                : [{ role: 'assistant', content: 'Hello! How can I help you today?' }];
        } catch {
            return [{ role: 'assistant', content: 'Hello! How can I help you today?' }];
        }
    });

    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(messages));
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, storageKey]);

    const chatMutation = useMutation({
        mutationFn: (payloadMessages: ChatMessage[]) => sendWidgetChatMessage(id, payloadMessages),
        onSuccess: (data) => {
            setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        },
        onError: (err: Error) => {
            setError(err.message);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Error: Could not get a response.' },
            ]);
        },
    });

    const loading = chatMutation.isPending;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg: ChatMessage = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setError(null);

        // Sliding window
        const MAX_CHARS = 12000;
        let charCount = 0;
        const payloadMessages: ChatMessage[] = [];
        for (let i = newMessages.length - 1; i >= 0; i--) {
            charCount += newMessages[i].content.length;
            if (charCount > MAX_CHARS && payloadMessages.length > 0) break;
            payloadMessages.unshift(newMessages[i]);
        }

        chatMutation.mutate(payloadMessages);
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden" data-testid="chatbot-widget">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-3 text-sm ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        <div
                            className={`flex items-center justify-center h-8 w-8 shrink-0 rounded-full ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                        >
                            {msg.role === 'user' ? (
                                <User className="size-4" />
                            ) : (
                                <OllamaLogo className="size-5 fill-current" />
                            )}
                        </div>
                        <div
                            className={`flex flex-col max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                className={`rounded-xl px-3 py-2 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                            >
                                <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3 text-sm flex-row">
                        <div className="flex items-center justify-center h-8 w-8 shrink-0 rounded-full bg-muted">
                            <OllamaLogo className="size-5 fill-current animate-pulse" />
                        </div>
                        <div className="flex flex-col max-w-[75%] items-start">
                            <div className="rounded-xl px-3 py-2 bg-muted">
                                <Loader2 className="size-4 animate-spin" />
                            </div>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="text-xs text-destructive text-center p-2 bg-destructive/10 rounded-md mt-2">
                        {error}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form
                onSubmit={handleSubmit}
                className="p-3 border-t bg-background flex items-center gap-2"
            >
                <Button
                    type="button"
                    variant="outline"
                    className="size-10 shrink-0"
                    disabled={loading || messages.length <= 1}
                    onClick={() => {
                        setMessages([
                            { role: 'assistant', content: 'Hello! How can I help you today?' },
                        ]);
                        setError(null);
                    }}
                    title="Clear Chat"
                >
                    <Trash2 className="size-4 text-muted-foreground" />
                    <span className="sr-only">Clear Chat</span>
                </Button>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    disabled={loading}
                    className="flex-1 h-10"
                />
                <Button
                    type="submit"
                    className="size-10 shrink-0"
                    disabled={!input.trim() || loading}
                >
                    <Send className="size-4" />
                    <span className="sr-only">Send</span>
                </Button>
            </form>
        </div>
    );
}
