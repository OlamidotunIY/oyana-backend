import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WalletService } from './wallet.service';
import { WalletResolver } from './wallet.resolver';
import { WalletController } from './wallet.controller';
import { PaystackService } from './paystack.service';

@Module({
  imports: [ConfigModule],
  controllers: [WalletController],
  providers: [WalletService, WalletResolver, PaystackService],
})
export class WalletModule {}
