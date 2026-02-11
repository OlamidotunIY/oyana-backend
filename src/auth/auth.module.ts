import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { SupabaseModule } from './supabase/supabase.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [SupabaseModule, DatabaseModule],
  providers: [AuthService, AuthResolver],
  exports: [AuthService],
})
export class AuthModule {}
