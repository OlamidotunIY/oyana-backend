import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  NotificationAudience,
  NotificationCategory,
  UserType,
} from '../graphql';

type NotificationContent = {
  category: NotificationCategory;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

type NotificationInput = NotificationContent & {
  recipientProfileId: string;
  audience: NotificationAudience;
};

type NotificationAudienceCount = {
  audience: NotificationAudience;
  unreadCount: number;
  totalCount: number;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createNotification(input: NotificationInput): Promise<void> {
    await this.createManyNotifications([input]);
  }

  async createManyNotifications(inputs: NotificationInput[]): Promise<void> {
    const normalized = inputs
      .map((input) => this.normalizeInput(input))
      .filter((input): input is NotificationInput => Boolean(input));

    if (normalized.length === 0) {
      return;
    }

    try {
      await this.prisma.notification.createMany({
        data: normalized.map((item) => ({
          recipientProfileId: item.recipientProfileId,
          audience: item.audience,
          category: item.category,
          title: item.title,
          body: item.body,
          entityType: item.entityType ?? null,
          entityId: item.entityId ?? null,
          metadata: item.metadata ?? undefined,
        })),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist notifications: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async notifyAdmins(content: NotificationContent): Promise<void> {
    const adminProfiles = await this.prisma.profile.findMany({
      where: {
        roles: {
          has: UserType.ADMIN,
        },
      },
      select: {
        id: true,
      },
    });

    await this.createManyNotifications(
      adminProfiles.map((adminProfile) => ({
        recipientProfileId: adminProfile.id,
        audience: NotificationAudience.ADMIN,
        ...content,
      })),
    );
  }

  async notifyCustomer(
    customerProfileId: string,
    content: NotificationContent,
  ): Promise<void> {
    await this.createNotification({
      recipientProfileId: customerProfileId,
      audience: NotificationAudience.CUSTOMER,
      ...content,
    });
  }

  async notifyProviderTeam(
    providerId: string,
    content: NotificationContent,
  ): Promise<void> {
    const provider = await this.prisma.provider.findUnique({
      where: {
        id: providerId,
      },
      select: {
        profileId: true,
        members: {
          where: {
            status: 'active',
          },
          select: {
            profileId: true,
          },
        },
      },
    });

    if (!provider) {
      return;
    }

    const recipientIds = new Set<string>();
    if (provider.profileId) {
      recipientIds.add(provider.profileId);
    }

    for (const member of provider.members) {
      recipientIds.add(member.profileId);
    }

    await this.createManyNotifications(
      Array.from(recipientIds).map((profileId) => ({
        recipientProfileId: profileId,
        audience: NotificationAudience.PROVIDER,
        ...content,
      })),
    );
  }

  async summarizeByAudience(): Promise<NotificationAudienceCount[]> {
    const unreadRows = await this.prisma.notification.groupBy({
      by: ['audience'],
      where: {
        isRead: false,
      },
      _count: {
        _all: true,
      },
    });

    const totalRows = await this.prisma.notification.groupBy({
      by: ['audience'],
      _count: {
        _all: true,
      },
    });

    const unreadMap = new Map<NotificationAudience, number>();
    for (const row of unreadRows) {
      unreadMap.set(row.audience as NotificationAudience, row._count._all);
    }

    const totalMap = new Map<NotificationAudience, number>();
    for (const row of totalRows) {
      totalMap.set(row.audience as NotificationAudience, row._count._all);
    }

    const audiences: NotificationAudience[] = [
      NotificationAudience.CUSTOMER,
      NotificationAudience.PROVIDER,
      NotificationAudience.ADMIN,
    ];

    return audiences.map((audience) => ({
      audience,
      unreadCount: unreadMap.get(audience) ?? 0,
      totalCount: totalMap.get(audience) ?? 0,
    }));
  }

  private normalizeInput(input: NotificationInput): NotificationInput | null {
    const title = input.title.trim();
    const body = input.body.trim();
    const recipientProfileId = input.recipientProfileId.trim();

    if (!recipientProfileId || !title || !body) {
      return null;
    }

    return {
      ...input,
      recipientProfileId,
      title,
      body,
      entityType: input.entityType?.trim() || undefined,
      entityId: input.entityId?.trim() || undefined,
    };
  }
}
