import { InputType, Field } from '@nestjs/graphql';
import { PreferredLanguage, UserStatus } from '../../enums';

@InputType()
export class CreateProfileInput {
  @Field()
  authUserId: string;

  @Field({ nullable: true })
  fullName?: string;

  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  phoneE164?: string;

  @Field(() => PreferredLanguage, { defaultValue: PreferredLanguage.EN })
  preferredLanguage?: PreferredLanguage;
}

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  fullName?: string;

  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  phoneE164?: string;

  @Field(() => PreferredLanguage, { nullable: true })
  preferredLanguage?: PreferredLanguage;

  @Field(() => UserStatus, { nullable: true })
  status?: UserStatus;
}
