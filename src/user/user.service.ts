import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileInput } from '../graphql/dto/core/profile.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findProfileById(profileId: string) {
    return this.prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateProfile(profileId: string, input: UpdateProfileInput) {
    const updateData: any = {};

    // If fullName is provided, generate displayName from it
    if (input.fullName !== undefined) {
      updateData.fullName = input.fullName;
      // Generate displayName from fullName (using the full name)
      updateData.displayName = input.fullName || null;
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

    return this.prisma.profile.update({
      where: { id: profileId },
      data: updateData,
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
