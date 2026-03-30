import { Module } from '@nestjs/common';
import { DispatchService, DISPATCH_PUBSUB } from './dispatch.service';
import { DispatchResolver } from './dispatch.resolver';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { PubSub } from 'graphql-subscriptions';
import { UserModule } from '../user/user.module';

@Module({
  imports: [NotificationsModule, AuthModule, UserModule],
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
