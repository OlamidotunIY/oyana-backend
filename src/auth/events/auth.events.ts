import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserSignedUpEvent } from './user-signed-up.event';
import { PrismaService } from '../../database/prisma.service';
import { UserType } from '../../graphql/enums';

@Injectable()
export class AuthEventsListener {
  private readonly logger = new Logger(AuthEventsListener.name);

  constructor(private readonly prisma: PrismaService) {}

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
