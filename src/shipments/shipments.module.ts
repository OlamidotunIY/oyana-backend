import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsResolver } from './shipments.resolver';

@Module({
  providers: [ShipmentsService, ShipmentsResolver],
})
export class ShipmentsModule {}
