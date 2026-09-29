import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '5s', target: 20 },
        { duration: '5s', target: 400 }, // Sudden spike
        { duration: '15s', target: 400 },
        { duration: '5s', target: 20 },
        { duration: '5s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(99)<3000'], // Expect slow but successful recovery
        http_req_failed: ['rate<0.1'], // 10% errors max on sudden surge
    },
};

export default function () {
    const res = http.get('http://localhost:8080/health');
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
}
