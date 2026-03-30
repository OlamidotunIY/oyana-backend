import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../mail.service';
import { AuthEmailOtpRequestedEvent } from './auth-email-otp-requested.event';
import { UserSignedUpEvent } from './user-signed-up.event';

@Injectable()
export class AuthEventsListener {
  private readonly logger = new Logger(AuthEventsListener.name);

  constructor(private readonly mailService: MailService) {}

  @OnEvent('auth.email-otp.requested')
  async handleAuthEmailOtpRequested(event: AuthEmailOtpRequestedEvent) {
    try {
      if (event.mode === 'password_reset') {
        await this.mailService.sendPasswordResetEmail(event.email, event.code);
      } else {
        await this.mailService.sendOtpEmail(event.email, event.code);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send auth email for ${event.email} (${event.mode}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @OnEvent('user.signed-up')
  async handleUserSignedUp(event: UserSignedUpEvent) {
    this.logger.log(
      `Handled user signup event for ${event.email} (${event.role ?? 'pending_driver'})`,
    );
  }
}
