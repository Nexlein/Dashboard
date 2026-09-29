import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '5s', target: 50 }, // ramp up to 50 users
        { duration: '15s', target: 50 }, // stay at 50 users
        { duration: '5s', target: 0 }, // ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
        http_req_failed: ['rate<0.01'], // less than 1% errors
    },
};

export default function () {
    const res = http.get('http://localhost:8080/health');
    check(res, {
        'status is 200': (r) => r.status === 200,
    });

    const resAbout = http.get('http://localhost:8080/about.json');
    check(resAbout, {
        'status is 200': (r) => r.status === 200,
    });

    sleep(1);
}
