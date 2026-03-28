import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY');
    this.from = this.configService.getOrThrow<string>('RESEND_FROM');
    this.resend = new Resend(apiKey);
  }

  onModuleInit(): void {
    this.logger.log(`Resend mail service configured with from ${this.from}`);
  }

  async sendOtpEmail(to: string, code: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Your Oyana verification code',
      text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1a1a2e">Your verification code</h2>
          <p style="font-size:36px;letter-spacing:8px;font-weight:bold;color:#4f46e5">${code}</p>
          <p style="color:#6b7280">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, code: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Reset your Oyana password',
      text: `Your password reset code is: ${code}\n\nThis code expires in 10 minutes. If you did not request a password reset, please ignore this email.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1a1a2e">Reset your password</h2>
          <p>Use the code below to reset your Oyana password:</p>
          <p style="font-size:36px;letter-spacing:8px;font-weight:bold;color:#4f46e5">${code}</p>
          <p style="color:#6b7280">This code expires in <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  }

  private async sendEmail(input: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const response = await this.resend.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    if (response.error) {
      throw new Error(response.error.message || 'Resend email delivery failed');
    }

    this.logger.log(
      `Sent email to ${input.to} via Resend (${response.data?.id ?? 'no-message-id'})`,
    );
  }
}
