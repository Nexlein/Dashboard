import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOAuthLinkUrl } from '@/lib/auth';
import {
    fetchServices,
    connectService,
    disconnectAccount,
    disconnectService,
} from '../lib/services';

export function useServices() {
    return useQuery({
        queryKey: ['services'],
        queryFn: fetchServices,
    });
}

export function useConnectService() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ serviceName, apiKey }: { serviceName: string; apiKey: string }) =>
            connectService(serviceName, apiKey),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
    });
}

export function useDisconnectService() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (serviceName: string) => disconnectService(serviceName),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
    });
}

export function useDisconnectAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ serviceName, accountId }: { serviceName: string; accountId: number }) =>
            disconnectAccount(serviceName, accountId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
    });
}

/** Where to send the browser to connect an account of `provider` to `serviceName`. */
export function useOAuthUrl() {
    return useMutation({
        mutationFn: ({ provider, serviceName }: { provider: string; serviceName: string }) =>
            getOAuthLinkUrl(provider, serviceName),
    });
}
