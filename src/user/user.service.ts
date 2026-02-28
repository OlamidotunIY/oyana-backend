import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  ActivateRoleInput,
  UpdateProfileInput,
} from '../graphql/dto/core/profile.dto';
import { PreferredLanguage, UserType } from '../graphql/enums';
import { Profile } from '../graphql/types/core';
import { normalizeProfileRoles } from '../auth/utils/roles.util';

type ProfileRecord = {
  id: string;
  email: string;
  roles: Profile['roles'];
  firstName: string | null;
  lastName: string | null;
  phoneE164: string | null;
  phoneVerified: boolean;
  phoneVerifiedAt: Date | null;
  state: Profile['state'];
  referralCode: string | null;
  preferredLanguage: string;
  status: Profile['status'];
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contactForProviders: Array<{ businessName: string }>;
  userAddresses: Array<{ address: string; city: string }>;
};

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  private normalizePreferredLanguage(
    value: string | null | undefined,
  ): Profile['preferredLanguage'] {
    return value === PreferredLanguage.ZH_HANS
      ? PreferredLanguage.ZH_HANS
      : PreferredLanguage.EN;
  }

  private toGraphqlProfile(profile: ProfileRecord): Profile {
    const providerContact = profile.contactForProviders[0] ?? null;
    const latestAddress = profile.userAddresses[0] ?? null;

    return {
      id: profile.id,
      email: profile.email,
      roles: normalizeProfileRoles(profile),
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneE164: profile.phoneE164,
      phoneVerified: profile.phoneVerified,
      phoneVerifiedAt: profile.phoneVerifiedAt,
      state: profile.state,
      referralCode: profile.referralCode,
      preferredLanguage: this.normalizePreferredLanguage(profile.preferredLanguage),
      status: profile.status,
      lastLoginAt: profile.lastLoginAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      businessName: providerContact?.businessName ?? null,
      primaryAddress: latestAddress?.address ?? null,
      city: latestAddress?.city ?? null,
    };
  }

  async getProfileByEmail(email: string): Promise<Profile | null> {
    const profile = await this.prisma.runWithRetry('UserService.getProfileByEmail', () =>
      this.prisma.profile.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          roles: true,
          firstName: true,
          lastName: true,
          phoneE164: true,
          phoneVerified: true,
          phoneVerifiedAt: true,
          state: true,
          referralCode: true,
          preferredLanguage: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          contactForProviders: {
            select: {
              businessName: true,
            },
            take: 1,
          },
          userAddresses: {
            select: {
              address: true,
              city: true,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: 1,
          },
        },
      }),
    );

    if (!profile) {
      return null;
    }

    return this.toGraphqlProfile(profile);
  }

  async findProfileById(profileId: string): Promise<Profile | null> {
    const profile = await this.prisma.runWithRetry('UserService.findProfileById', () =>
      this.prisma.profile.findUnique({
        where: { id: profileId },
        select: {
          id: true,
          email: true,
          roles: true,
          firstName: true,
          lastName: true,
          phoneE164: true,
          phoneVerified: true,
          phoneVerifiedAt: true,
          state: true,
          referralCode: true,
          preferredLanguage: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          contactForProviders: {
            select: {
              businessName: true,
            },
            take: 1,
          },
          userAddresses: {
            select: {
              address: true,
              city: true,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: 1,
          },
        },
      }),
    );

    if (!profile) {
      return null;
    }

    return this.toGraphqlProfile(profile);
  }

  async updateProfile(
    profileId: string,
    input: UpdateProfileInput,
  ): Promise<Profile> {
    const updateData: any = {};

    if (input.firstName !== undefined) {
      updateData.firstName = input.firstName;
    }

    if (input.lastName !== undefined) {
      updateData.lastName = input.lastName;
    }

    // If phoneE164 is provided, update it
    if (input.phoneE164 !== undefined) {
      updateData.phoneE164 = input.phoneE164;
    }

    // If preferredLanguage is provided, update it
    if (input.preferredLanguage !== undefined) {
      updateData.preferredLanguage = input.preferredLanguage;
    }

    // If status is provided, update it
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Use upsert to create profile if it doesn't exist
    const profile = await this.prisma.runWithRetry('UserService.updateProfile', () =>
      this.prisma.profile.upsert({
        where: { id: profileId },
        update: updateData,
        create: {
          id: profileId,
          ...updateData,
        },
        select: {
          id: true,
          email: true,
          roles: true,
          firstName: true,
          lastName: true,
          phoneE164: true,
          phoneVerified: true,
          phoneVerifiedAt: true,
          state: true,
          referralCode: true,
          preferredLanguage: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          contactForProviders: {
            select: {
              businessName: true,
            },
            take: 1,
          },
          userAddresses: {
            select: {
              address: true,
              city: true,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: 1,
          },
        },
      }),
    );

    return this.toGraphqlProfile(profile);
  }

  async activateRole(
    profileId: string,
    input: ActivateRoleInput,
  ): Promise<Profile> {
    if (input.targetRole === UserType.ADMIN) {
      throw new BadRequestException('Admin role cannot be self-activated');
    }

    const profile = await this.prisma.runWithRetry(
      'UserService.activateRole.profile',
      () =>
        this.prisma.profile.findUnique({
          where: {
            id: profileId,
          },
          select: {
            id: true,
            email: true,
            roles: true,
            firstName: true,
            lastName: true,
            state: true,
          },
        }),
    );

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const currentRoles = normalizeProfileRoles(profile);
    if (currentRoles.includes(input.targetRole)) {
      const currentProfile = await this.findProfileById(profileId);
      if (!currentProfile) {
        throw new NotFoundException('Profile not found');
      }
      return currentProfile;
    }

    const nextRoles = Array.from(
      new Set([
        ...currentRoles,
        input.targetRole,
        ...(input.targetRole === UserType.BUSINESS ? [UserType.INDIVIDUAL] : []),
      ]),
    );

    const updatedProfile = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.profile.update({
        where: { id: profileId },
        data: {
          roles: {
            set: nextRoles,
          },
        },
        select: {
          id: true,
          email: true,
          roles: true,
          firstName: true,
          lastName: true,
          phoneE164: true,
          phoneVerified: true,
          phoneVerifiedAt: true,
          state: true,
          referralCode: true,
          preferredLanguage: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          contactForProviders: {
            select: {
              businessName: true,
            },
            take: 1,
          },
          userAddresses: {
            select: {
              address: true,
              city: true,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: 1,
          },
        },
      });

      if (input.targetRole === UserType.BUSINESS) {
        await this.ensureProviderForProfile(tx, profile, input.businessName);
      }

      return updated;
    });

    return this.toGraphqlProfile(updatedProfile);
  }

  private async ensureProviderForProfile(
    tx: Prisma.TransactionClient,
    profile: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    },
    businessName?: string,
  ): Promise<void> {
    const existingMembership = await tx.providerMember.findFirst({
      where: {
        profileId: profile.id,
      },
      select: {
        providerId: true,
      },
    });

    if (existingMembership) {
      await tx.providerMember.upsert({
        where: {
          providerId_profileId: {
            providerId: existingMembership.providerId,
            profileId: profile.id,
          },
        },
        create: {
          providerId: existingMembership.providerId,
          profileId: profile.id,
          role: 'owner',
          status: 'active',
        },
        update: {
          role: 'owner',
          status: 'active',
        },
      });

      await tx.provider.updateMany({
        where: {
          id: existingMembership.providerId,
          profileId: null,
        },
        data: {
          profileId: profile.id,
        },
      });
      return;
    }

    const existingProvider = await tx.provider.findUnique({
      where: {
        profileId: profile.id,
      },
      select: {
        id: true,
      },
    });

    if (existingProvider) {
      await tx.providerMember.upsert({
        where: {
          providerId_profileId: {
            providerId: existingProvider.id,
            profileId: profile.id,
          },
        },
        create: {
          providerId: existingProvider.id,
          profileId: profile.id,
          role: 'owner',
          status: 'active',
        },
        update: {
          role: 'owner',
          status: 'active',
        },
      });
      return;
    }

    const fallbackBusinessName = this.getDefaultBusinessName(profile);
    const provider = await tx.provider.create({
      data: {
        businessName: businessName?.trim() || fallbackBusinessName,
        profileId: profile.id,
        status: 'pending',
      },
      select: {
        id: true,
      },
    });

    await tx.providerMember.create({
      data: {
        providerId: provider.id,
        profileId: profile.id,
        role: 'owner',
        status: 'active',
      },
    });
  }

  private getDefaultBusinessName(profile: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  }): string {
    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (fullName.length > 0) {
      return `${fullName} Logistics`;
    }

    const emailPrefix = profile.email.split('@')[0]?.trim();
    if (emailPrefix) {
      const normalized =
        emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      return `${normalized} Logistics`;
    }

    return 'New Provider';
  }
}
