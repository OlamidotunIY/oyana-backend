import { Module } from '@nestjs/common';
import { MarketPlaceService } from './market-place.service';
import { MarketPlaceResolver } from './market-place.resolver';

@Module({
  providers: [MarketPlaceService, MarketPlaceResolver]
})
export class MarketPlaceModule {}
