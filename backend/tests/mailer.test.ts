import { describe, it, expect, vi, beforeEach } from 'vitest';

const transport = vi.hoisted(() => ({ sendMail: vi.fn(async () => ({})) }));
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => transport) } }));

const MAIL = { to: 'ada@example.com', subject: 'Hi', text: 'Code: 123456', html: '<p>Hi</p>' };

/** mailer.ts reads its configuration when it loads. */
async function loadMailer(env: Record<string, string | undefined>) {
    vi.resetModules();
    Object.assign(process.env, env);
    for (const [key, value] of Object.entries(env))
        if (value === undefined) delete process.env[key];
    return import('../src/utils/mailer.ts');
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('sendMail', () => {
    it('sends through SMTP when it is configured', async () => {
        const nodemailer = (await import('nodemailer')).default;
        const { sendMail } = await loadMailer({
            SMTP_HOST: 'smtp.example.com',
            SMTP_PORT: '465',
            SMTP_SECURE: 'true',
            SMTP_USER: 'mailer',
            SMTP_PASSWORD: 'secret',
            MAIL_FROM: 'Dashboard <no-reply@example.com>',
        });

        await sendMail(MAIL);

        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            host: 'smtp.example.com',
            port: 465,
            secure: true,
            auth: { user: 'mailer', pass: 'secret' },
        });
        expect(transport.sendMail).toHaveBeenCalledWith({
            from: 'Dashboard <no-reply@example.com>',
            ...MAIL,
        });
    });

    it('sends from the SMTP account when MAIL_FROM is not set (Gmail)', async () => {
        const { sendMail } = await loadMailer({
            SMTP_HOST: 'smtp.gmail.com',
            SMTP_USER: 'dashboard.team@gmail.com',
            SMTP_PASSWORD: 'app-password',
            MAIL_FROM: undefined,
        });

        await sendMail(MAIL);

        expect(transport.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({ from: 'Dashboard <dashboard.team@gmail.com>' }),
        );
    });

    it('prints the email instead when SMTP is not configured (development)', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { sendMail } = await loadMailer({ SMTP_HOST: undefined });

        await sendMail(MAIL);

        expect(transport.sendMail).not.toHaveBeenCalled();
        expect(warn.mock.calls[0][0]).toContain('Code: 123456');
    });
});

describe('sendOtpEmail', () => {
    it.each([
        ['email-verification', 'code de vérification'],
        ['forget-password', 'mot de passe'],
        ['change-email', 'nouvelle adresse'],
    ] as const)('writes the %s email with its code', async (purpose, subject) => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        await loadMailer({ SMTP_HOST: 'smtp.example.com' });
        const { sendOtpEmail } = await import('../src/utils/otpEmails.ts');

        await sendOtpEmail('ada@example.com', '482913', purpose);

        const mail = (transport.sendMail.mock.calls[0] as unknown as [typeof MAIL])[0];
        expect(mail.to).toBe('ada@example.com');
        expect(mail.subject).toContain(subject);
        expect(mail.text).toContain('482913');
        expect(mail.html).toContain('482913');
    });
});
