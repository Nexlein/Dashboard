import http from 'k6/http';
import { check, sleep } from 'k6';

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
    const res = http.get('http://localhost:8080/health');
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
}
