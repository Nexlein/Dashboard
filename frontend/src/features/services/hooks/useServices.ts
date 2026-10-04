import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchServices, connectService, disconnectService, getOAuthUrl } from '../lib/services';

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

export function useOAuthUrl() {
    return useMutation({
        mutationFn: (serviceName: string) => getOAuthUrl(serviceName),
    });
}
