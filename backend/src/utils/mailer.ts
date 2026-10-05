import nodemailer from 'nodemailer';
import env from './env.ts';

export type Mail = { to: string; subject: string; text: string; html: string };

const transport = env.SMTP_HOST
    ? nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      })
    : null;

/** Sends an email through SMTP; without SMTP_HOST (development only), prints it instead. */
export async function sendMail(mail: Mail): Promise<void> {
    if (!transport) {
        console.warn(`[mail] SMTP_HOST is not set, email not sent. To: ${mail.to}\n${mail.text}`);
        return;
    }
    await transport.sendMail({ from: env.MAIL_FROM, ...mail });
}
