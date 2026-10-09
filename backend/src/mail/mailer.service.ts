import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

// Outgoing email, through the SMTP server in SMTP_URL (e.g.
// "smtps://user:pass@smtp.example.com:465"), from MAIL_FROM. Without
// SMTP_URL nothing is sent: send() logs the message and returns false, and
// callers show what they would have sent (the invitation link) instead.
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transport: Transporter | null | undefined;

  private transporter() {
    if (this.transport === undefined) {
      const url = process.env.SMTP_URL;
      this.transport = url ? nodemailer.createTransport(url) : null;
    }
    return this.transport;
  }

  // Whether outgoing email is set up (SMTP_URL).
  get configured() {
    return this.transporter() !== null;
  }

  // True when the message was handed to the SMTP server.
  async send(message: {
    to: string;
    subject: string;
    text: string;
    attachments?: { filename: string; content: Buffer; contentType: string }[];
  }): Promise<boolean> {
    const transport = this.transporter();
    if (!transport) {
      this.logger.warn(`Not sent (SMTP_URL is not set): "${message.subject}" to ${message.to}`);
      return false;
    }
    try {
      await transport.sendMail({ from: process.env.MAIL_FROM ?? 'DCMS <no-reply@couteret.fr>', ...message });
      return true;
    } catch (e) {
      this.logger.error(`Could not send "${message.subject}" to ${message.to}: ${(e as Error).message}`);
      return false;
    }
  }
}
