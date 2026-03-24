import { Module } from '@nestjs/common';
import { SupabaseModule } from '../auth/supabase/supabase.module';
import { MobileClientGuard } from '../auth/guards/mobile-client.guard';
import { KycController } from './kyc.controller';
import { PremblyClient } from './prembly.client';
import { KycService } from './kyc.service';
import { KycResolver } from './kyc.resolver';

@Module({
  imports: [SupabaseModule],
  controllers: [KycController],
  providers: [KycService, KycResolver, PremblyClient, MobileClientGuard],
  exports: [KycService],
})
export class KycModule {}
