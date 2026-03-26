import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WalletService } from './wallet.service';
import { WalletResolver } from './wallet.resolver';
import { WalletController } from './wallet.controller';
import { PaystackService } from './paystack.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [WalletController],
  providers: [WalletService, WalletResolver, PaystackService],
})
export class WalletModule {}
