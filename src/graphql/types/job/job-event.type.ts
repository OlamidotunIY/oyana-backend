import { ObjectType, Field, ID } from '@nestjs/graphql';
import { JobEventType } from '../../enums';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class JobEvent {
  @Field(() => ID)
  id: string;

  @Field()
  jobId: string;

  @Field(() => JobEventType)
  eventType: JobEventType;

  @Field()
  eventTimestamp: Date;

  @Field({ nullable: true })
  latitude?: number;

  @Field({ nullable: true })
  longitude?: number;

  @Field({ nullable: true })
  notes?: string;

  @Field({ nullable: true })
  triggeredByProfileId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field()
  createdAt: Date;
}
