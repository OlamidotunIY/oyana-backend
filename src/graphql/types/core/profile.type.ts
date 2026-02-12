import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ProfileStatus, PreferredLanguage, UserType } from '../../enums';
import { UserRole } from './user-role.type';

@ObjectType()
export class Profile {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field(() => UserType)
  userType: UserType;

  @Field(() => String, { nullable: true })
  firstName: string | null;

  @Field(() => String, { nullable: true })
  lastName: string | null;

  @Field(() => String, { nullable: true })
  phoneE164: string | null;

  @Field(() => String, { nullable: true })
  state: string | null;

  @Field(() => String, { nullable: true })
  referralCode: string | null;

  @Field(() => PreferredLanguage)
  preferredLanguage: string;

  @Field(() => ProfileStatus)
  status: ProfileStatus;

  @Field(() => Date, { nullable: true })
  lastLoginAt: Date | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [UserRole])
  userRoles: UserRole[];
}
