import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ProfileStatus, PreferredLanguage } from '../../enums';

@ObjectType()
export class Profile {
  @Field(() => ID)
  id: string; // Same as auth.users.id

  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  phoneE164?: string;

  @Field(() => PreferredLanguage)
  preferredLanguage: PreferredLanguage;

  @Field(() => ProfileStatus)
  status: ProfileStatus;

  @Field({ nullable: true })
  lastLoginAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
