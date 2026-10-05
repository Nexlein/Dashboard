import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { storeAuthToken } from '@/lib/auth';

/**
 * Landing route after GitHub login. The backend puts the JWT in the URL fragment
 * (`#token=...`), which browsers never send to a server; navigating away with `replace`
 * also drops it from the history.
 */
export default function OAuthCallbackPage() {
    const navigate = useNavigate();
    const { hash } = useLocation();

    useEffect(() => {
        const token = new URLSearchParams(hash.slice(1)).get('token');
        if (token) {
            storeAuthToken(token);
            navigate('/', { replace: true });
        } else {
            navigate('/login', { replace: true });
        }
    }, [hash, navigate]);

    return <div>Connexion en cours...</div>;
}
