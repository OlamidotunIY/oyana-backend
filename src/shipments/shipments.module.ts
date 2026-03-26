import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsResolver } from './shipments.resolver';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [NotificationsModule, AuthModule],
  providers: [ShipmentsService, ShipmentsResolver],
})
export class ShipmentsModule {}
