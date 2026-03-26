import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Expo,
  type ExpoPushMessage,
  type ExpoPushTicket,
} from 'expo-server-sdk';
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

type PushDeviceRecord = {
  id: string;
  expoPushToken: string;
  profileId: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo: Expo;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    const accessToken = configService.get<string>('EXPO_ACCESS_TOKEN');
    this.expo = new Expo(accessToken ? { accessToken } : undefined);
  }

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

      await this.dispatchPushNotifications(normalized);
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

  private async dispatchPushNotifications(
    inputs: NotificationInput[],
  ): Promise<void> {
    const recipientProfileIds = Array.from(
      new Set(inputs.map((input) => input.recipientProfileId)),
    );

    if (recipientProfileIds.length === 0) {
      return;
    }

    const devices = await this.prisma.pushDevice.findMany({
      where: {
        profileId: { in: recipientProfileIds },
        isActive: true,
        profile: {
          notificationsEnabled: true,
          pushPermissionGranted: true,
        },
      },
      select: {
        id: true,
        profileId: true,
        expoPushToken: true,
      },
    });

    if (devices.length === 0) {
      return;
    }

    const devicesByProfileId = new Map<string, PushDeviceRecord[]>();
    for (const device of devices) {
      if (!Expo.isExpoPushToken(device.expoPushToken)) {
        continue;
      }

      const profileDevices = devicesByProfileId.get(device.profileId) ?? [];
      profileDevices.push(device);
      devicesByProfileId.set(device.profileId, profileDevices);
    }

    const messages: ExpoPushMessage[] = [];
    const tokenToDeviceId = new Map<string, string>();

    for (const input of inputs) {
      const profileDevices = devicesByProfileId.get(input.recipientProfileId);
      if (!profileDevices?.length) {
        continue;
      }

      for (const device of profileDevices) {
        tokenToDeviceId.set(device.expoPushToken, device.id);
        messages.push({
          to: device.expoPushToken,
          title: input.title,
          body: input.body,
          sound: 'default',
          channelId: this.resolveChannelId(input.category),
          data: this.buildPushData(input),
        });
      }
    }

    if (messages.length === 0) {
      return;
    }

    const invalidDeviceIds = new Set<string>();
    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      const chunkMessages = chunk as ExpoPushMessage[];

      try {
        const tickets =
          await this.expo.sendPushNotificationsAsync(chunkMessages);

        for (let index = 0; index < chunkMessages.length; index += 1) {
          const ticket = tickets[index];
          const rawToken = chunkMessages[index]?.to;
          const token = typeof rawToken === 'string' ? rawToken : rawToken?.[0];
          const deviceId = token ? tokenToDeviceId.get(token) : undefined;

          if (
            deviceId &&
            ticket?.status === 'error' &&
            ticket.details?.error === 'DeviceNotRegistered'
          ) {
            invalidDeviceIds.add(deviceId);
          }

          if (ticket?.status === 'error') {
            this.logger.warn(
              `Expo push send failed for token ${token}: ${
                ticket.message ?? ticket.details?.error ?? 'unknown error'
              }`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to send Expo push notifications: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    if (invalidDeviceIds.size > 0) {
      await this.prisma.pushDevice.updateMany({
        where: {
          id: { in: Array.from(invalidDeviceIds) },
        },
        data: {
          isActive: false,
        },
      });
    }
  }

  private resolveChannelId(category: NotificationCategory): string {
    switch (category) {
      case NotificationCategory.SHIPMENT:
        return 'shipment-updates';
      case NotificationCategory.DISPATCH:
        return 'dispatch-updates';
      case NotificationCategory.SUPPORT:
        return 'support-updates';
      case NotificationCategory.DISPUTE:
        return 'dispute-updates';
      default:
        return 'general-updates';
    }
  }

  private buildPushData(
    input: NotificationInput,
  ): Record<string, unknown> | undefined {
    const data: Record<string, unknown> = {
      audience: input.audience,
      category: input.category,
    };

    if (input.entityType) {
      data.entityType = input.entityType;
    }

    if (input.entityId) {
      data.entityId = input.entityId;
    }

    if (
      input.metadata &&
      typeof input.metadata === 'object' &&
      !Array.isArray(input.metadata)
    ) {
      data.metadata = input.metadata as Record<string, unknown>;
    }

    return Object.keys(data).length > 0 ? data : undefined;
  }
}
