import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateBidDto {
  @Field()
  jobId: string;

  @Field()
  providerId: string;

  @Field(() => GraphQLBigInt)
  bidAmountMinor: bigint;

  @Field()
  currency: string;

  @Field({ nullable: true })
  proposedPickupTime?: Date;

  @Field({ nullable: true })
  proposedDeliveryTime?: Date;

  @Field({ nullable: true })
  coverLetter?: string;
}
