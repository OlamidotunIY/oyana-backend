import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { DispatchResolver } from './dispatch.resolver';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [DispatchService, DispatchResolver],
  exports: [DispatchService],
})
export class DispatchModule {}
