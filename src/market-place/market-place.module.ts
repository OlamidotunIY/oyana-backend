import { Module } from '@nestjs/common';
import { MarketPlaceService } from './market-place.service';
import { MarketPlaceResolver } from './market-place.resolver';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [MarketPlaceService, MarketPlaceResolver],
})
export class MarketPlaceModule {}
