import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { SupabaseModule } from './supabase/supabase.module';
import { DatabaseModule } from '../database/database.module';
import { AuthEventsListener } from './events/auth.events';
import { UserModule } from '../user/user.module';

@Module({
  imports: [SupabaseModule, DatabaseModule, UserModule],
  providers: [AuthService, AuthResolver, AuthEventsListener],
  exports: [AuthService],
})
export class AuthModule {}
