import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletModule } from './wallet/wallet.module';
import { JobsModule } from './jobs/jobs.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { MarketPlaceModule } from './market-place/market-place.module';
import { KycModule } from './kyc/kyc.module';

@Module({
  imports: [WalletModule, JobsModule, DispatchModule, MarketPlaceModule, KycModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
