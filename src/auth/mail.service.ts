import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;

  constructor(private readonly configService: ConfigService) {
    this.from = configService.get<string>(
      'SMTP_FROM',
      'Oyana <noreply@oyana.com>',
    );
    this.host = configService.get<string>('SMTP_HOST', 'smtp.gmail.com');

    const configuredPort = Number.parseInt(
      configService.get<string>('SMTP_PORT', '587'),
      10,
    );
    this.port = Number.isFinite(configuredPort) ? configuredPort : 587;

    const configuredSecure = configService.get<string>('SMTP_SECURE');
    this.secure =
      configuredSecure != null
        ? configuredSecure.trim().toLowerCase() === 'true'
        : this.port === 465;

    this.transporter = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      requireTLS: !this.secure,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      auth: {
        user: configService.get<string>('SMTP_USER'),
        pass: configService.get<string>('SMTP_PASS'),
      },
      tls: {
        servername: this.host,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log(
        `SMTP transport verified for ${this.host}:${this.port} (secure=${this.secure})`,
      );
    } catch (error) {
      this.logger.error(
        `SMTP transport verification failed for ${this.host}:${this.port} (secure=${this.secure}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendOtpEmail(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
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
    await this.transporter.sendMail({
      from: this.from,
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
}
