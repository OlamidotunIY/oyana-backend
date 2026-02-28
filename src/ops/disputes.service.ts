import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AddDisputeCommentDto,
  CreateDisputeDto,
  DisputeCase,
  DisputeEvent,
  DisputeEventType,
  DisputeStatus,
  ResolveDisputeDto,
  ShipmentActorRole,
  UserType,
} from '../graphql';
import { resolveProfileRole } from '../auth/utils/roles.util';

type DisputeCaseRow = {
  id: string;
  dispute_number: string;
  owner_profile_id: string;
  shipment_id: string | null;
  invoice_id: string | null;
  reference_id: string | null;
  category: string;
  reason: string;
  status: string;
  resolution_summary: string | null;
  resolved_by_profile_id: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type DisputeEventRow = {
  id: string;
  dispute_case_id: string;
  actor_profile_id: string | null;
  actor_role: string;
  event_type: string;
  message: string | null;
  metadata: unknown;
  created_at: Date;
};

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  async myDisputes(profileId: string): Promise<DisputeCase[]> {
    const role = await this.requireUserRole(profileId);
    const where =
      role === UserType.ADMIN
        ? Prisma.empty
        : Prisma.sql`WHERE "owner_profile_id" = ${profileId}::uuid`;

    const rows = await this.prisma.runWithRetry('DisputesService.myDisputes', () =>
      this.prisma.$queryRaw<DisputeCaseRow[]>(Prisma.sql`
        SELECT *
        FROM "dispute_cases"
        ${where}
        ORDER BY "updated_at" DESC
      `),
    );

    return rows.map((row) => this.toDisputeCase(row));
  }

  async dispute(profileId: string, disputeId: string): Promise<DisputeCase | null> {
    const role = await this.requireUserRole(profileId);
    const dispute = await this.requireDisputeAccess(profileId, role, disputeId);

    const events = await this.prisma.runWithRetry('DisputesService.dispute.events', () =>
      this.prisma.$queryRaw<DisputeEventRow[]>(Prisma.sql`
        SELECT *
        FROM "dispute_events"
        WHERE "dispute_case_id" = ${disputeId}::uuid
        ORDER BY "created_at" ASC
      `),
    );

    return this.toDisputeCase(
      dispute,
      events.map((event) => this.toDisputeEvent(event)),
    );
  }

  async createDispute(profileId: string, input: CreateDisputeDto): Promise<DisputeCase> {
    const role = await this.requireUserRole(profileId);
    const actorRole = this.toActorRole(role);
    const now = new Date();

    if (!input.category.trim() || !input.reason.trim()) {
      throw new BadRequestException('category and reason are required');
    }

    await this.validateDisputeReferences(profileId, role, input);
    const disputeNumber = this.generateReference('DSP');

    const [caseRow] = await this.prisma.runWithRetry(
      'DisputesService.createDispute',
      () =>
        this.prisma.$transaction(async (tx) => {
          const insertedCase = await tx.$queryRaw<DisputeCaseRow[]>(Prisma.sql`
            INSERT INTO "dispute_cases" (
              "id",
              "dispute_number",
              "owner_profile_id",
              "shipment_id",
              "invoice_id",
              "reference_id",
              "category",
              "reason",
              "status",
              "created_at",
              "updated_at"
            )
            VALUES (
              gen_random_uuid(),
              ${disputeNumber},
              ${profileId}::uuid,
              ${input.shipmentId ? Prisma.sql`${input.shipmentId}::uuid` : Prisma.sql`NULL`},
              ${input.invoiceId ? Prisma.sql`${input.invoiceId}::uuid` : Prisma.sql`NULL`},
              ${input.referenceId?.trim() || null},
              ${input.category.trim()},
              ${input.reason.trim()},
              ${DisputeStatus.OPEN},
              ${now},
              ${now}
            )
            RETURNING *
          `);

          await tx.$executeRaw(Prisma.sql`
            INSERT INTO "dispute_events" (
              "id",
              "dispute_case_id",
              "actor_profile_id",
              "actor_role",
              "event_type",
              "message",
              "created_at"
            )
            VALUES (
              gen_random_uuid(),
              ${insertedCase[0].id}::uuid,
              ${profileId}::uuid,
              ${actorRole},
              ${DisputeEventType.CREATED},
              ${'Dispute created'},
              ${now}
            )
          `);

          return insertedCase;
        }),
    );

    return this.toDisputeCase(caseRow);
  }

  async addDisputeComment(
    profileId: string,
    input: AddDisputeCommentDto,
  ): Promise<DisputeEvent> {
    if (!input.message.trim()) {
      throw new BadRequestException('Comment message is required');
    }

    const role = await this.requireUserRole(profileId);
    await this.requireDisputeAccess(profileId, role, input.disputeId);
    const actorRole = this.toActorRole(role);
    const now = new Date();

    const [event] = await this.prisma.runWithRetry(
      'DisputesService.addDisputeComment',
      () =>
        this.prisma.$transaction(async (tx) => {
          const inserted = await tx.$queryRaw<DisputeEventRow[]>(Prisma.sql`
            INSERT INTO "dispute_events" (
              "id",
              "dispute_case_id",
              "actor_profile_id",
              "actor_role",
              "event_type",
              "message",
              "created_at"
            )
            VALUES (
              gen_random_uuid(),
              ${input.disputeId}::uuid,
              ${profileId}::uuid,
              ${actorRole},
              ${DisputeEventType.COMMENT},
              ${input.message.trim()},
              ${now}
            )
            RETURNING *
          `);

          await tx.$executeRaw(Prisma.sql`
            UPDATE "dispute_cases"
            SET "updated_at" = ${now}
            WHERE "id" = ${input.disputeId}::uuid
          `);

          return inserted;
        }),
    );

    return this.toDisputeEvent(event);
  }

  async resolveDispute(profileId: string, input: ResolveDisputeDto): Promise<DisputeCase> {
    await this.assertAdmin(profileId);

    if (!input.resolutionSummary.trim()) {
      throw new BadRequestException('resolutionSummary is required');
    }

    const status = input.status ?? DisputeStatus.RESOLVED;
    if (status !== DisputeStatus.RESOLVED && status !== DisputeStatus.REJECTED) {
      throw new BadRequestException('status must be RESOLVED or REJECTED');
    }

    const now = new Date();
    const [updated] = await this.prisma.runWithRetry(
      'DisputesService.resolveDispute',
      () =>
        this.prisma.$transaction(async (tx) => {
          const disputeRows = await tx.$queryRaw<DisputeCaseRow[]>(Prisma.sql`
            UPDATE "dispute_cases"
            SET
              "status" = ${status},
              "resolution_summary" = ${input.resolutionSummary.trim()},
              "resolved_by_profile_id" = ${profileId}::uuid,
              "resolved_at" = ${now},
              "updated_at" = ${now}
            WHERE "id" = ${input.disputeId}::uuid
            RETURNING *
          `);

          if (!disputeRows[0]) {
            throw new NotFoundException(`Dispute with id ${input.disputeId} not found`);
          }

          await tx.$executeRaw(Prisma.sql`
            INSERT INTO "dispute_events" (
              "id",
              "dispute_case_id",
              "actor_profile_id",
              "actor_role",
              "event_type",
              "message",
              "created_at"
            )
            VALUES (
              gen_random_uuid(),
              ${input.disputeId}::uuid,
              ${profileId}::uuid,
              ${ShipmentActorRole.ADMIN},
              ${DisputeEventType.RESOLVED},
              ${input.resolutionSummary.trim()},
              ${now}
            )
          `);

          return disputeRows;
        }),
    );

    return this.toDisputeCase(updated);
  }

  private async validateDisputeReferences(
    profileId: string,
    role: UserType,
    input: CreateDisputeDto,
  ): Promise<void> {
    if (input.shipmentId) {
      const shipment = await this.prisma.shipment.findUnique({
        where: {
          id: input.shipmentId,
        },
        select: {
          customerProfileId: true,
        },
      });

      if (!shipment) {
        throw new NotFoundException(`Shipment with id ${input.shipmentId} not found`);
      }

      if (role !== UserType.ADMIN && shipment.customerProfileId !== profileId) {
        throw new ForbiddenException('You can only dispute your own shipments');
      }
    }

    if (input.invoiceId) {
      const invoices = await this.prisma.$queryRaw<
        Array<{ id: string; profile_id: string }>
      >(Prisma.sql`
        SELECT "id", "profile_id"
        FROM "invoices"
        WHERE "id" = ${input.invoiceId}::uuid
        LIMIT 1
      `);

      const invoice = invoices[0];
      if (!invoice) {
        throw new NotFoundException(`Invoice with id ${input.invoiceId} not found`);
      }

      if (role !== UserType.ADMIN && invoice.profile_id !== profileId) {
        throw new ForbiddenException('You can only dispute your own invoices');
      }
    }
  }

  private async requireDisputeAccess(
    profileId: string,
    role: UserType,
    disputeId: string,
  ): Promise<DisputeCaseRow> {
    const rows = await this.prisma.$queryRaw<DisputeCaseRow[]>(Prisma.sql`
      SELECT *
      FROM "dispute_cases"
      WHERE "id" = ${disputeId}::uuid
      LIMIT 1
    `);

    const dispute = rows[0];
    if (!dispute) {
      throw new NotFoundException(`Dispute with id ${disputeId} not found`);
    }

    if (role !== UserType.ADMIN && dispute.owner_profile_id !== profileId) {
      throw new ForbiddenException('You are not allowed to access this dispute');
    }

    return dispute;
  }

  private async assertAdmin(profileId: string): Promise<void> {
    const role = await this.requireUserRole(profileId);
    if (role !== UserType.ADMIN) {
      throw new ForbiddenException('Admin role is required');
    }
  }

  private async requireUserRole(
    profileId: string,
    preferredRoles: UserType[] = [
      UserType.ADMIN,
      UserType.INDIVIDUAL,
      UserType.BUSINESS,
    ],
  ): Promise<UserType> {
    const profile = await this.prisma.profile.findUnique({
      where: {
        id: profileId,
      },
      select: {
        roles: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return resolveProfileRole(profile, preferredRoles);
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

  private toDisputeCase(row: DisputeCaseRow, events?: DisputeEvent[]): DisputeCase {
    return {
      id: row.id,
      disputeNumber: row.dispute_number,
      ownerProfileId: row.owner_profile_id,
      shipmentId: row.shipment_id ?? undefined,
      invoiceId: row.invoice_id ?? undefined,
      referenceId: row.reference_id ?? undefined,
      category: row.category,
      reason: row.reason,
      status: row.status as DisputeStatus,
      resolutionSummary: row.resolution_summary ?? undefined,
      resolvedByProfileId: row.resolved_by_profile_id ?? undefined,
      resolvedAt: row.resolved_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      events,
    };
  }

  private toDisputeEvent(row: DisputeEventRow): DisputeEvent {
    return {
      id: row.id,
      disputeCaseId: row.dispute_case_id,
      actorProfileId: row.actor_profile_id ?? undefined,
      actorRole: row.actor_role as ShipmentActorRole,
      eventType: row.event_type as DisputeEventType,
      message: row.message ?? undefined,
      metadata: row.metadata ?? undefined,
      createdAt: row.created_at,
    };
  }

  private generateReference(prefix: string): string {
    const random = Math.random().toString().slice(2, 8);
    return `${prefix}-${random}`;
  }
}
