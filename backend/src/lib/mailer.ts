import nodemailer from 'nodemailer';
import { config } from '../config';

async function createTransporter() {
  let auth = { user: config.ethereal.user, pass: config.ethereal.pass };
  
  if (!config.ethereal.user || !config.ethereal.pass) {
    const testAccount = await nodemailer.createTestAccount();
    auth = { user: testAccount.user, pass: testAccount.pass };
  }

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth,
  });
}

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

export async function getMailer(): Promise<nodemailer.Transporter> {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }
  return transporterPromise;
}

export interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const mailer = await getMailer();
    const info = await mailer.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
