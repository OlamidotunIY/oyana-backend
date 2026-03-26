import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PushDevice {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  profileId: string;

  @Field(() => String)
  expoPushToken: string;

  @Field(() => String, { nullable: true })
  deviceId: string | null;

  @Field(() => String, { nullable: true })
  platform: string | null;

  @Field(() => String, { nullable: true })
  appVersion: string | null;

  @Field(() => String, { nullable: true })
  pushPermissionStatus: string | null;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Date)
  lastSeenAt: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
