import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@/i18n/errors';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

function ErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
    const { t } = useTranslation('common');
    return (
        <div className="flex flex-col items-center justify-center p-4 text-center h-full w-full bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="size-8 mb-2" />
            <h2 className="font-semibold text-lg">{t('errorTitle')}</h2>
            <p className="text-sm opacity-80 mt-1">{getErrorMessage(error)}</p>
            <button
                className="mt-4 text-xs underline underline-offset-4 hover:opacity-80"
                onClick={onRetry}
            >
                {t('retry')}
            </button>
        </div>
    );
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorFallback
                    error={this.state.error}
                    onRetry={() => this.setState({ hasError: false, error: null })}
                />
            );
        }

        return this.props.children;
    }
}
