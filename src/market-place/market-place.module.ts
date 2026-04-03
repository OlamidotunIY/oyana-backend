import { Module } from '@nestjs/common';
import { MARKETPLACE_PUBSUB, MarketPlaceService } from './market-place.service';
import { MarketPlaceResolver } from './market-place.resolver';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { PubSub } from 'graphql-subscriptions';

@Module({
  imports: [AuthModule, UserModule],
  providers: [
    MarketPlaceService,
    MarketPlaceResolver,
    {
      provide: MARKETPLACE_PUBSUB,
      useValue: new PubSub(),
    },
  ],
})
export class MarketPlaceModule {}
