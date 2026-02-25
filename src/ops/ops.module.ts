import { Module } from '@nestjs/common';
import { AdminOpsResolver } from './admin-ops.resolver';
import { AdminOpsService } from './admin-ops.service';
import { DisputesResolver } from './disputes.resolver';
import { DisputesService } from './disputes.service';
import { InvoicesResolver } from './invoices.resolver';
import { InvoicesService } from './invoices.service';
import { SupportResolver } from './support.resolver';
import { SupportService } from './support.service';

@Module({
  providers: [
    SupportResolver,
    SupportService,
    DisputesResolver,
    DisputesService,
    InvoicesResolver,
    InvoicesService,
    AdminOpsResolver,
    AdminOpsService,
  ],
})
export class OpsModule {}
