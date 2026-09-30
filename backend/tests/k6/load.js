import http from 'k6/http';
import { check, group, sleep } from 'k6';

// K6_BASE_URL env var allows CI to override the target
const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8080';

export const options = {
    stages: [
        { duration: '10s', target: 50 }, // Ramp up
        { duration: '30s', target: 50 }, // Sustained load
        { duration: '10s', target: 0 }, // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(99)<500'], // 99% of requests below 500ms
        http_req_failed: ['rate<0.01'], // Less than 1% errors
    },
};

export default function () {
    group('Public endpoints', () => {
        const health = http.get(`${BASE_URL}/health`);
        check(health, { 'health 200': (r) => r.status === 200 });

        const about = http.get(`${BASE_URL}/about.json`);
        check(about, {
            'about 200': (r) => r.status === 200,
            'about has client': (r) => JSON.parse(r.body).client !== undefined,
        });
    });

    group('Auth endpoints', () => {
        // Test login with bad credentials — should return 401 reliably under load
        const login = http.post(
            `${BASE_URL}/auth/login`,
            JSON.stringify({ email: 'nonexistent@example.com', password: 'wrongpassword' }),
            { headers: { 'Content-Type': 'application/json' } },
        );
        check(login, { 'login 401 on bad creds': (r) => r.status === 401 });
    });

    sleep(1);
}
