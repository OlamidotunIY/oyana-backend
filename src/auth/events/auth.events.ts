import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../mail.service';
import { AuthEmailOtpRequestedEvent } from './auth-email-otp-requested.event';
import { UserSignedUpEvent } from './user-signed-up.event';
import { PrismaService } from '../../database/prisma.service';
import { UserType } from '../../graphql/enums';

@Injectable()
export class AuthEventsListener {
  private readonly logger = new Logger(AuthEventsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

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
    const normalizedRoles = Array.from(new Set(event.roles));
    const isBusinessSignup = normalizedRoles.includes(UserType.BUSINESS);

    this.logger.log(
      `Handling user signup event for ${event.email} (${normalizedRoles.join(',')})`,
    );

    if (!isBusinessSignup) {
      return;
    }

    try {
      if (!event.businessName) {
        this.logger.warn(
          `Business name not provided for business signup: ${event.userId}`,
        );
        return;
      }

      const provider = await this.prisma.provider.create({
        data: {
          businessName: event.businessName,
          profileId: event.userId,
          status: 'pending',
        },
      });

      // Create provider member relationship
      await this.prisma.providerMember.create({
        data: {
          providerId: provider.id,
          profileId: event.userId,
          role: 'owner',
          status: 'active',
        },
      });

      this.logger.log(
        `Provider account created for user ${event.userId}: ${provider.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling user signup event for ${event.userId}:`,
        error,
      );
      throw error;
    }
  }
}
