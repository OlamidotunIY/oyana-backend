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

  @Field({ nullable: true })
  firstName: string | null;

  @Field({ nullable: true })
  lastName: string | null;

  @Field({ nullable: true })
  phoneE164: string | null;

  @Field({ nullable: true })
  state: string | null;

  @Field({ nullable: true })
  referralCode: string | null;

  @Field(() => PreferredLanguage)
  preferredLanguage: string;

  @Field(() => ProfileStatus)
  status: ProfileStatus;

  @Field({ nullable: true })
  lastLoginAt: Date | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [UserRole])
  userRoles: UserRole[];
}
