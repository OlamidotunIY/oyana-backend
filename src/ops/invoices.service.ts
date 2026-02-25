import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreateInvoiceDto,
  CreateInvoiceLineItemDto,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  UpdateInvoiceStatusDto,
  UserType,
} from '../graphql';

type InvoiceRow = {
  id: string;
  invoice_number: string;
  profile_id: string;
  shipment_id: string | null;
  status: string;
  currency: string;
  subtotal_minor: bigint | number | string;
  fee_minor: bigint | number | string;
  tax_minor: bigint | number | string;
  total_minor: bigint | number | string;
  issued_at: Date;
  due_at: Date | null;
  paid_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

type InvoiceLineItemRow = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_amount_minor: bigint | number | string;
  total_amount_minor: bigint | number | string;
  created_at: Date;
};

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async myInvoices(profileId: string): Promise<Invoice[]> {
    const role = await this.requireUserRole(profileId);
    const where =
      role === UserType.ADMIN
        ? Prisma.empty
        : Prisma.sql`WHERE "profile_id" = ${profileId}::uuid`;

    const rows = await this.prisma.runWithRetry('InvoicesService.myInvoices', () =>
      this.prisma.$queryRaw<InvoiceRow[]>(Prisma.sql`
        SELECT *
        FROM "invoices"
        ${where}
        ORDER BY "created_at" DESC
      `),
    );

    return rows.map((row) => this.toInvoice(row));
  }

  async invoice(profileId: string, invoiceId: string): Promise<Invoice | null> {
    const role = await this.requireUserRole(profileId);
    const invoiceRow = await this.requireInvoiceAccess(profileId, role, invoiceId);
    const lineItems = await this.prisma.runWithRetry('InvoicesService.invoice.lineItems', () =>
      this.prisma.$queryRaw<InvoiceLineItemRow[]>(Prisma.sql`
        SELECT *
        FROM "invoice_line_items"
        WHERE "invoice_id" = ${invoiceId}::uuid
        ORDER BY "created_at" ASC
      `),
    );

    return this.toInvoice(
      invoiceRow,
      lineItems.map((item) => this.toInvoiceLineItem(item)),
    );
  }

  async createInvoice(profileId: string, input: CreateInvoiceDto): Promise<Invoice> {
    await this.assertAdmin(profileId);

    if (!input.lineItems?.length) {
      throw new BadRequestException('Invoice requires at least one line item');
    }

    const now = new Date();
    const invoiceNumber = this.generateReference('INV');
    const currency = input.currency?.trim().toUpperCase() || 'NGN';
    const normalizedItems = input.lineItems.map((item) => this.normalizeLineItem(item));

    const subtotalMinor = normalizedItems.reduce(
      (sum, item) => sum + item.totalAmountMinor,
      BigInt(0),
    );
    const feeMinor = BigInt(0);
    const taxMinor = BigInt(0);
    const totalMinor = subtotalMinor + feeMinor + taxMinor;

    const created = await this.prisma.runWithRetry(
      'InvoicesService.createInvoice',
      () =>
        this.prisma.$transaction(async (tx) => {
          const [invoice] = await tx.$queryRaw<InvoiceRow[]>(Prisma.sql`
            INSERT INTO "invoices" (
              "id",
              "invoice_number",
              "profile_id",
              "shipment_id",
              "status",
              "currency",
              "subtotal_minor",
              "fee_minor",
              "tax_minor",
              "total_minor",
              "issued_at",
              "due_at",
              "notes",
              "created_at",
              "updated_at"
            )
            VALUES (
              gen_random_uuid(),
              ${invoiceNumber},
              ${input.profileId}::uuid,
              ${input.shipmentId ? Prisma.sql`${input.shipmentId}::uuid` : Prisma.sql`NULL`},
              ${InvoiceStatus.PENDING},
              ${currency},
              ${subtotalMinor},
              ${feeMinor},
              ${taxMinor},
              ${totalMinor},
              ${now},
              ${input.dueAt ?? null},
              ${input.notes?.trim() || null},
              ${now},
              ${now}
            )
            RETURNING *
          `);

          const lineItems: InvoiceLineItemRow[] = [];
          for (const item of normalizedItems) {
            const [lineItem] = await tx.$queryRaw<InvoiceLineItemRow[]>(Prisma.sql`
              INSERT INTO "invoice_line_items" (
                "id",
                "invoice_id",
                "description",
                "quantity",
                "unit_amount_minor",
                "total_amount_minor",
                "created_at"
              )
              VALUES (
                gen_random_uuid(),
                ${invoice.id}::uuid,
                ${item.description},
                ${item.quantity},
                ${item.unitAmountMinor},
                ${item.totalAmountMinor},
                ${now}
              )
              RETURNING *
            `);
            lineItems.push(lineItem);
          }

          return { invoice, lineItems };
        }),
    );

    return this.toInvoice(
      created.invoice,
      created.lineItems.map((item) => this.toInvoiceLineItem(item)),
    );
  }

  async updateInvoiceStatus(
    profileId: string,
    input: UpdateInvoiceStatusDto,
  ): Promise<Invoice> {
    await this.assertAdmin(profileId);

    const now = new Date();
    const paidAt = input.status === InvoiceStatus.PAID ? now : null;

    const [updated] = await this.prisma.runWithRetry(
      'InvoicesService.updateInvoiceStatus',
      () =>
        this.prisma.$queryRaw<InvoiceRow[]>(Prisma.sql`
          UPDATE "invoices"
          SET
            "status" = ${input.status},
            "paid_at" = ${paidAt},
            "updated_at" = ${now}
          WHERE "id" = ${input.invoiceId}::uuid
          RETURNING *
        `),
    );

    if (!updated) {
      throw new NotFoundException(`Invoice with id ${input.invoiceId} not found`);
    }

    return this.toInvoice(updated);
  }

  private normalizeLineItem(item: CreateInvoiceLineItemDto): {
    description: string;
    quantity: number;
    unitAmountMinor: bigint;
    totalAmountMinor: bigint;
  } {
    if (!item.description.trim()) {
      throw new BadRequestException('Invoice line item description is required');
    }

    const quantity = Math.max(1, Math.round(Number(item.quantity ?? 1)));
    if (!Number.isFinite(quantity)) {
      throw new BadRequestException('Invoice line item quantity is invalid');
    }

    const unitAmountMinor = this.toBigInt(item.unitAmountMinor);
    if (unitAmountMinor < BigInt(0)) {
      throw new BadRequestException('Invoice line item amount must be non-negative');
    }

    return {
      description: item.description.trim(),
      quantity,
      unitAmountMinor,
      totalAmountMinor: unitAmountMinor * BigInt(quantity),
    };
  }

  private async requireInvoiceAccess(
    profileId: string,
    role: UserType,
    invoiceId: string,
  ): Promise<InvoiceRow> {
    const rows = await this.prisma.$queryRaw<InvoiceRow[]>(Prisma.sql`
      SELECT *
      FROM "invoices"
      WHERE "id" = ${invoiceId}::uuid
      LIMIT 1
    `);

    const invoice = rows[0];
    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${invoiceId} not found`);
    }

    if (role !== UserType.ADMIN && invoice.profile_id !== profileId) {
      throw new ForbiddenException('You are not allowed to access this invoice');
    }

    return invoice;
  }

  private async assertAdmin(profileId: string): Promise<void> {
    const role = await this.requireUserRole(profileId);
    if (role !== UserType.ADMIN) {
      throw new ForbiddenException('Admin role is required');
    }
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

  private toInvoice(row: InvoiceRow, lineItems?: InvoiceLineItem[]): Invoice {
    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      profileId: row.profile_id,
      shipmentId: row.shipment_id ?? undefined,
      status: row.status as InvoiceStatus,
      currency: row.currency,
      subtotalMinor: this.toBigInt(row.subtotal_minor),
      feeMinor: this.toBigInt(row.fee_minor),
      taxMinor: this.toBigInt(row.tax_minor),
      totalMinor: this.toBigInt(row.total_minor),
      issuedAt: row.issued_at,
      dueAt: row.due_at ?? undefined,
      paidAt: row.paid_at ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lineItems,
    };
  }

  private toInvoiceLineItem(row: InvoiceLineItemRow): InvoiceLineItem {
    return {
      id: row.id,
      invoiceId: row.invoice_id,
      description: row.description,
      quantity: row.quantity,
      unitAmountMinor: this.toBigInt(row.unit_amount_minor),
      totalAmountMinor: this.toBigInt(row.total_amount_minor),
      createdAt: row.created_at,
    };
  }

  private toBigInt(value: unknown): bigint {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'number') {
      return BigInt(Math.trunc(value));
    }
    if (typeof value === 'string') {
      return BigInt(value);
    }
    return BigInt(0);
  }

  private generateReference(prefix: string): string {
    const random = Math.random().toString().slice(2, 8);
    return `${prefix}-${random}`;
  }
}
