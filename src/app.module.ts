import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletModule } from './wallet/wallet.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { MarketPlaceModule } from './market-place/market-place.module';
import { KycModule } from './kyc/kyc.module';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GqlConfig } from './config/graphql-ws';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';
import { BigIntScalar } from './graphql/scalars';
import { AddressModule } from './address/address.module';
import { GqlAuthGuard } from './auth/guards/gql-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { OpsModule } from './ops/ops.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    QueueModule,
    AuthModule,
    GqlConfig,
    WalletModule,
    ShipmentsModule,
    DispatchModule,
    MarketPlaceModule,
    KycModule,
    UserModule,
    AddressModule,
    OpsModule,
  ],
  controllers: [AppController],
  providers: [AppService, BigIntScalar, GqlAuthGuard, RolesGuard],
})
export class AppModule {}
