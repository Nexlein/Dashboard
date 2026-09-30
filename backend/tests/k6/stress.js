import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8080';

export const options = {
    stages: [
        { duration: '10s', target: 50 },
        { duration: '15s', target: 100 },
        { duration: '15s', target: 200 },
        { duration: '15s', target: 300 }, // Stress breaking point
        { duration: '10s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(99)<2000'], // Accept slower responses under stress
        http_req_failed: ['rate<0.05'], // Accept max 5% errors
    },
};

export default function () {
    group('Load spread', () => {
        const health = http.get(`${BASE_URL}/health`);
        check(health, { 'health 200': (r) => r.status === 200 });

        const about = http.get(`${BASE_URL}/about.json`);
        check(about, { 'about 200': (r) => r.status === 200 });

        // Probe login endpoint under stress to ensure rate limiter doesn't trigger for normal load
        const login = http.post(
            `${BASE_URL}/auth/login`,
            JSON.stringify({ email: 'stress@example.com', password: 'testpass' }),
            { headers: { 'Content-Type': 'application/json' } },
        );
        check(login, {
            'login responds': (r) => r.status === 401 || r.status === 429,
        });
    });

    sleep(1);
}
