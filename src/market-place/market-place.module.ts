import { Module } from '@nestjs/common';
import { MarketPlaceService } from './market-place.service';
import { MarketPlaceResolver } from './market-place.resolver';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [AuthModule, UserModule],
  providers: [MarketPlaceService, MarketPlaceResolver],
})
export class MarketPlaceModule {}
