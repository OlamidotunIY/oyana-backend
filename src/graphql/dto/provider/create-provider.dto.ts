import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateProviderDto {
  @Field()
  businessName: string;

  @Field({ nullable: true })
  profileId?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  minWalletThresholdMinor?: bigint;
}
