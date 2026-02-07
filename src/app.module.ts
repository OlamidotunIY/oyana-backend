import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletModule } from './wallet/wallet.module';
import { JobsModule } from './jobs/jobs.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { MarketPlaceModule } from './market-place/market-place.module';
import { KycModule } from './kyc/kyc.module';
import { ConfigModule } from '@nestjs/config';
import { GqlConfig } from './config/graphql-ws';
import { SupabaseModule } from './auth/supabase/supabase.module';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';
import { BigIntScalar } from './graphql/scalars';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    SupabaseModule,
    GqlConfig,
    WalletModule,
    JobsModule,
    DispatchModule,
    MarketPlaceModule,
    KycModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, BigIntScalar],
})
export class AppModule {}
