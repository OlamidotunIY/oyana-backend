import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ProfileStatus, PreferredLanguage, State, UserType } from '../../enums';

@ObjectType()
export class Profile {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field(() => Boolean)
  emailVerified: boolean;

  @Field(() => Date, { nullable: true })
  emailVerifiedAt: Date | null;

  @Field(() => [UserType])
  roles: UserType[];

  @Field(() => String, { nullable: true })
  firstName: string | null;

  @Field(() => String, { nullable: true })
  lastName: string | null;

  @Field(() => String, { nullable: true })
  phoneE164: string | null;

  @Field(() => Boolean)
  phoneVerified: boolean;

  @Field(() => Date, { nullable: true })
  phoneVerifiedAt: Date | null;

  @Field(() => State)
  state: State;

  @Field(() => String, { nullable: true })
  referralCode: string | null;

  @Field(() => Boolean)
  notificationsEnabled: boolean;

  @Field(() => Date, { nullable: true })
  notificationPromptedAt: Date | null;

  @Field(() => Boolean)
  pushPermissionGranted: boolean;

  @Field(() => String, { nullable: true })
  pushPermissionStatus: string | null;

  @Field(() => String, { nullable: true })
  businessName?: string | null;

  @Field(() => String, { nullable: true })
  providerId?: string | null;

  @Field(() => Boolean, { nullable: true })
  providerIsAvailable?: boolean | null;

  @Field(() => Date, { nullable: true })
  providerAvailabilityUpdatedAt?: Date | null;

  @Field(() => String, { nullable: true })
  primaryAddress?: string | null;

  @Field(() => String, { nullable: true })
  city?: string | null;

  @Field(() => PreferredLanguage)
  preferredLanguage: PreferredLanguage;

  @Field(() => ProfileStatus)
  status: ProfileStatus;

  @Field(() => Date, { nullable: true })
  lastLoginAt: Date | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
