import { readFileSync } from 'node:fs';

// Docker-only defaults: local development keeps its existing console-mail behavior.
export function dockerEnvironment(source) {
    const environment = { ...source };
    if (!environment.BETTER_AUTH_SECRET) {
        environment.BETTER_AUTH_SECRET = readFileSync(
            environment.AUTH_SECRET_FILE ?? '/run/dashboard/auth-secret',
            'utf8',
        ).trim();
    }
    if (!environment.SMTP_HOST) {
        Object.assign(environment, {
            SMTP_HOST: 'mailpit',
            SMTP_PORT: '1025',
            SMTP_SECURE: 'false',
            SMTP_USER: '',
            SMTP_PASSWORD: '',
            MAIL_FROM: 'Dashboard <no-reply@dashboard.local>',
        });
    }
    return environment;
}
