import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycResolver } from './kyc.resolver';

@Module({
  providers: [KycService, KycResolver]
})
export class KycModule {}
