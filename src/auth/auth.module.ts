import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { DatabaseModule } from '../database/database.module';
import { AuthEventsListener } from './events/auth.events';
import { UserModule } from '../user/user.module';
import { MailService } from './mail.service';
import { GqlAuthGuard } from './guards/gql-auth.guard';

@Module({
  imports: [
    DatabaseModule,
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '15m') as any,
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    AuthResolver,
    AuthEventsListener,
    MailService,
    GqlAuthGuard,
  ],
  exports: [AuthService, JwtModule, GqlAuthGuard],
})
export class AuthModule {}
