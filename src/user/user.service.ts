import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

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
}
