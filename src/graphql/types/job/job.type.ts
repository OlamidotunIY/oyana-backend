import { ObjectType, Field, ID } from '@nestjs/graphql';
import { JobStatus, JobType } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class Job {
  @Field(() => ID)
  id: string;

  @Field()
  customerId: string;

  @Field(() => JobType)
  jobType: JobType;

  @Field(() => JobStatus)
  status: JobStatus;

  @Field({ nullable: true })
  assignedProviderId?: string;

  @Field(() => GraphQLBigInt)
  totalPriceMinor: bigint;

  @Field()
  currency: string;

  @Field({ nullable: true })
  pickupTime?: Date;

  @Field({ nullable: true })
  deliveryTime?: Date;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field({ nullable: true })
  cancelledAt?: Date;

  @Field({ nullable: true })
  cancelReason?: string;

  @Field({ nullable: true })
  customerNotes?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
