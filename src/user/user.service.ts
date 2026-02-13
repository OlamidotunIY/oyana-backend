import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileInput } from '../graphql/dto/core/profile.dto';
import { Profile } from '../graphql/types/core';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfileByEmail(email: string): Promise<Profile | null> {
    const profile = await this.prisma.runWithRetry('UserService.getProfileByEmail', () =>
      this.prisma.profile.findUnique({
        where: { email },
      }),
    );

    if (!profile) {
      return null;
    }

    return profile;
  }

  async findProfileById(profileId: string): Promise<Profile | null> {
    return this.prisma.runWithRetry('UserService.findProfileById', () =>
      this.prisma.profile.findUnique({
        where: { id: profileId },
      }),
    );
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
    return this.prisma.runWithRetry('UserService.updateProfile', () =>
      this.prisma.profile.upsert({
        where: { id: profileId },
        update: updateData,
        create: {
          id: profileId,
          ...updateData,
        },
      }),
    );
  }
}
