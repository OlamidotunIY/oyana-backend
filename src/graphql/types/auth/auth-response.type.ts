import { Field, ObjectType } from '@nestjs/graphql';
import { Profile } from '../core';

@ObjectType()
export class AuthUser {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field(() => String, { nullable: true })
  fullName?: string;

  @Field()
  emailConfirmed: boolean;
}

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  @Field()
  user: Profile;
}

@ObjectType()
export class MessageResponse {
  @Field()
  message: string;

  @Field({ defaultValue: true })
  success: boolean;
}
