import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = configService.get<string>(
      'SMTP_FROM',
      'Oyana <noreply@oyana.com>',
    );

    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: configService.get<number>('SMTP_PORT', 587),
      secure: configService.get<number>('SMTP_PORT', 587) === 465,
      auth: {
        user: configService.get<string>('SMTP_USER'),
        pass: configService.get<string>('SMTP_PASS'),
      },
    });
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
