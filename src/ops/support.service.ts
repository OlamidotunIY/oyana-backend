import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreateSupportTicketDto,
  ReplySupportTicketDto,
  ShipmentActorRole,
  SupportTicket,
  SupportTicketMessage,
  SupportTicketPriority,
  SupportTicketStatus,
  UpdateSupportTicketStatusDto,
  UserType,
} from '../graphql';

type SupportTicketRow = {
  id: string;
  ticket_number: string;
  owner_profile_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  reference_id: string | null;
  description: string;
  assigned_admin_profile_id: string | null;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
  closed_at: Date | null;
};

type SupportTicketMessageRow = {
  id: string;
  ticket_id: string;
  author_profile_id: string | null;
  author_role: string;
  body: string;
  created_at: Date;
};

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async mySupportTickets(profileId: string): Promise<SupportTicket[]> {
    const role = await this.requireUserRole(profileId);
    const where =
      role === UserType.ADMIN
        ? Prisma.empty
        : Prisma.sql`WHERE "owner_profile_id" = ${profileId}::uuid`;

    const rows = await this.prisma.runWithRetry(
      'SupportService.mySupportTickets',
      () =>
        this.prisma.$queryRaw<SupportTicketRow[]>(Prisma.sql`
          SELECT *
          FROM "support_tickets"
          ${where}
          ORDER BY "updated_at" DESC
        `),
    );

    return rows.map((row) => this.toSupportTicket(row));
  }

  async supportTicket(
    profileId: string,
    ticketId: string,
  ): Promise<SupportTicket | null> {
    const role = await this.requireUserRole(profileId);
    const ticket = await this.requireSupportTicketAccess(profileId, role, ticketId);

    const messages = await this.prisma.runWithRetry(
      'SupportService.supportTicket.messages',
      () =>
        this.prisma.$queryRaw<SupportTicketMessageRow[]>(Prisma.sql`
          SELECT *
          FROM "support_ticket_messages"
          WHERE "ticket_id" = ${ticketId}::uuid
          ORDER BY "created_at" ASC
        `),
    );

    return this.toSupportTicket(
      ticket,
      messages.map((message) => this.toSupportTicketMessage(message)),
    );
  }

  async createSupportTicket(
    profileId: string,
    input: CreateSupportTicketDto,
  ): Promise<SupportTicket> {
    if (!input.subject.trim() || !input.category.trim() || !input.description.trim()) {
      throw new BadRequestException('subject, category, and description are required');
    }

    const role = await this.requireUserRole(profileId);
    const actorRole = this.toActorRole(role);
    const now = new Date();
    const ticketNumber = this.generateReference('TKT');
    const priority = input.priority ?? SupportTicketPriority.MEDIUM;

    const created = await this.prisma.runWithRetry(
      'SupportService.createSupportTicket',
      () =>
        this.prisma.$transaction(async (tx) => {
          const [ticket] = await tx.$queryRaw<SupportTicketRow[]>(Prisma.sql`
            INSERT INTO "support_tickets" (
              "id",
              "ticket_number",
              "owner_profile_id",
              "subject",
              "category",
              "priority",
              "status",
              "reference_id",
              "description",
              "created_at",
              "updated_at"
            )
            VALUES (
              gen_random_uuid(),
              ${ticketNumber},
              ${profileId}::uuid,
              ${input.subject.trim()},
              ${input.category.trim()},
              ${priority},
              ${SupportTicketStatus.OPEN},
              ${input.referenceId?.trim() || null},
              ${input.description.trim()},
              ${now},
              ${now}
            )
            RETURNING *
          `);

          const [message] = await tx.$queryRaw<SupportTicketMessageRow[]>(Prisma.sql`
            INSERT INTO "support_ticket_messages" (
              "id",
              "ticket_id",
              "author_profile_id",
              "author_role",
              "body",
              "created_at"
            )
            VALUES (
              gen_random_uuid(),
              ${ticket.id}::uuid,
              ${profileId}::uuid,
              ${actorRole},
              ${input.description.trim()},
              ${now}
            )
            RETURNING *
          `);

          return { ticket, message };
        }),
    );

    return this.toSupportTicket(created.ticket, [
      this.toSupportTicketMessage(created.message),
    ]);
  }

  async replySupportTicket(
    profileId: string,
    input: ReplySupportTicketDto,
  ): Promise<SupportTicketMessage> {
    if (!input.message.trim()) {
      throw new BadRequestException('Reply message is required');
    }

    const role = await this.requireUserRole(profileId);
    await this.requireSupportTicketAccess(profileId, role, input.ticketId);
    const actorRole = this.toActorRole(role);
    const now = new Date();

    const [message] = await this.prisma.runWithRetry(
      'SupportService.replySupportTicket',
      () =>
        this.prisma.$transaction(async (tx) => {
          const inserted = await tx.$queryRaw<SupportTicketMessageRow[]>(Prisma.sql`
            INSERT INTO "support_ticket_messages" (
              "id",
              "ticket_id",
              "author_profile_id",
              "author_role",
              "body",
              "created_at"
            )
            VALUES (
              gen_random_uuid(),
              ${input.ticketId}::uuid,
              ${profileId}::uuid,
              ${actorRole},
              ${input.message.trim()},
              ${now}
            )
            RETURNING *
          `);

          await tx.$executeRaw(Prisma.sql`
            UPDATE "support_tickets"
            SET "updated_at" = ${now}
            WHERE "id" = ${input.ticketId}::uuid
          `);

          return inserted;
        }),
    );

    return this.toSupportTicketMessage(message);
  }

  async updateSupportTicketStatus(
    profileId: string,
    input: UpdateSupportTicketStatusDto,
  ): Promise<SupportTicket> {
    const role = await this.requireUserRole(profileId);
    const ticket = await this.requireSupportTicketAccess(profileId, role, input.ticketId);

    if (role !== UserType.ADMIN && input.status !== SupportTicketStatus.CLOSED) {
      throw new ForbiddenException(
        'Only admins can set this ticket status',
      );
    }

    const now = new Date();
    const resolvedAt =
      input.status === SupportTicketStatus.RESOLVED ? now : ticket.resolved_at;
    const closedAt =
      input.status === SupportTicketStatus.CLOSED ? now : ticket.closed_at;

    const [updated] = await this.prisma.runWithRetry(
      'SupportService.updateSupportTicketStatus',
      () =>
        this.prisma.$queryRaw<SupportTicketRow[]>(Prisma.sql`
          UPDATE "support_tickets"
          SET
            "status" = ${input.status},
            "resolved_at" = ${resolvedAt},
            "closed_at" = ${closedAt},
            "updated_at" = ${now}
          WHERE "id" = ${input.ticketId}::uuid
          RETURNING *
        `),
    );

    return this.toSupportTicket(updated);
  }

  private async requireSupportTicketAccess(
    profileId: string,
    role: UserType,
    ticketId: string,
  ): Promise<SupportTicketRow> {
    const rows = await this.prisma.$queryRaw<SupportTicketRow[]>(Prisma.sql`
      SELECT *
      FROM "support_tickets"
      WHERE "id" = ${ticketId}::uuid
      LIMIT 1
    `);

    const ticket = rows[0];
    if (!ticket) {
      throw new NotFoundException(`Support ticket with id ${ticketId} not found`);
    }

    if (role !== UserType.ADMIN && ticket.owner_profile_id !== profileId) {
      throw new ForbiddenException('You are not allowed to access this ticket');
    }

    return ticket;
  }

  private async requireUserRole(profileId: string): Promise<UserType> {
    const profile = await this.prisma.profile.findUnique({
      where: {
        id: profileId,
      },
      select: {
        userType: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile.userType as UserType;
  }

  private toActorRole(role: UserType): ShipmentActorRole {
    if (role === UserType.ADMIN) {
      return ShipmentActorRole.ADMIN;
    }
    if (role === UserType.BUSINESS) {
      return ShipmentActorRole.PROVIDER;
    }
    return ShipmentActorRole.CUSTOMER;
  }

  private toSupportTicket(
    row: SupportTicketRow,
    messages?: SupportTicketMessage[],
  ): SupportTicket {
    return {
      id: row.id,
      ticketNumber: row.ticket_number,
      ownerProfileId: row.owner_profile_id,
      subject: row.subject,
      category: row.category,
      priority: row.priority as SupportTicketPriority,
      status: row.status as SupportTicketStatus,
      referenceId: row.reference_id ?? undefined,
      description: row.description,
      assignedAdminProfileId: row.assigned_admin_profile_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at ?? undefined,
      closedAt: row.closed_at ?? undefined,
      messages,
    };
  }

  private toSupportTicketMessage(row: SupportTicketMessageRow): SupportTicketMessage {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      authorProfileId: row.author_profile_id ?? undefined,
      authorRole: row.author_role as ShipmentActorRole,
      body: row.body,
      createdAt: row.created_at,
    };
  }

  private generateReference(prefix: string): string {
    const random = Math.random().toString().slice(2, 8);
    return `${prefix}-${random}`;
  }
}
