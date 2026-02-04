import { InputType, Field } from '@nestjs/graphql';
import { JobType } from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateJobDto {
  @Field()
  customerId: string;

  @Field(() => JobType)
  jobType: JobType;

  @Field(() => GraphQLBigInt)
  totalPriceMinor: bigint;

  @Field()
  currency: string;

  @Field({ nullable: true })
  pickupTime?: Date;

  @Field({ nullable: true })
  deliveryTime?: Date;

  @Field({ nullable: true })
  customerNotes?: string;
}
