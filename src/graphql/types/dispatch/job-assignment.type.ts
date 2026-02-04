import { ObjectType, Field, ID } from '@nestjs/graphql';
import { JobAssignmentStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class JobAssignment {
  @Field(() => ID)
  id: string;

  @Field()
  jobId: string;

  @Field()
  providerId: string;

  @Field({ nullable: true })
  dispatchOfferId?: string;

  @Field(() => GraphQLBigInt)
  agreedPriceMinor: bigint;

  @Field()
  currency: string;

  @Field(() => JobAssignmentStatus)
  status: JobAssignmentStatus;

  @Field({ nullable: true })
  assignedAt?: Date;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field({ nullable: true })
  cancelledAt?: Date;

  @Field({ nullable: true })
  cancelReason?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
