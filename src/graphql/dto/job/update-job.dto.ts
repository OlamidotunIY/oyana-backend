import { InputType, Field } from '@nestjs/graphql';
import { JobStatus } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class UpdateJobDto {
  @Field(() => JobStatus, { nullable: true })
  status?: JobStatus;

  @Field({ nullable: true })
  assignedProviderId?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  totalPriceMinor?: bigint;

  @Field({ nullable: true })
  pickupTime?: Date;

  @Field({ nullable: true })
  deliveryTime?: Date;

  @Field({ nullable: true })
  customerNotes?: string;
}
