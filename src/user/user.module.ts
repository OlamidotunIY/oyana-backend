import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [forwardRef(() => AuthModule), StorageModule],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
