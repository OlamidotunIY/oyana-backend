import { Module } from '@nestjs/common';
import { DispatchService, DISPATCH_PUBSUB } from './dispatch.service';
import { DispatchResolver } from './dispatch.resolver';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { PubSub } from 'graphql-subscriptions';

@Module({
  imports: [NotificationsModule, AuthModule],
  providers: [
    DispatchService,
    DispatchResolver,
    {
      provide: DISPATCH_PUBSUB,
      useValue: new PubSub(),
    },
  ],
  exports: [DispatchService, DISPATCH_PUBSUB],
})
export class DispatchModule {}
