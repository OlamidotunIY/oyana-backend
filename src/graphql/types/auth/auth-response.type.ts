import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AuthUser {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field({ nullable: true })
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
  expiresIn: number;

  @Field()
  tokenType: string;

  @Field()
  user: AuthUser;
}

@ObjectType()
export class MessageResponse {
  @Field()
  message: string;

  @Field({ defaultValue: true })
  success: boolean;
}
