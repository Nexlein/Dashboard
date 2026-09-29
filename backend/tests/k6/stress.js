import http from 'k6/http';
import { check, sleep } from 'k6';

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
    const res = http.get('http://localhost:8080/about.json');
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
}
