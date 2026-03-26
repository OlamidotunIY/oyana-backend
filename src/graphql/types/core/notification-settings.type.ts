import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class NotificationSettings {
  @Field(() => Boolean)
  notificationsEnabled: boolean;

  @Field(() => Date, { nullable: true })
  notificationPromptedAt: Date | null;

  @Field(() => Boolean)
  pushPermissionGranted: boolean;

  @Field(() => String, { nullable: true })
  pushPermissionStatus: string | null;

  @Field(() => Boolean)
  hasActivePushDevice: boolean;

  @Field(() => Date, { nullable: true })
  lastPushDeviceSeenAt: Date | null;
}
