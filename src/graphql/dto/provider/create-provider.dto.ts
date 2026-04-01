import { InputType, Field } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@InputType()
export class CreateProviderDto {
  @Field()
  businessName: string;

  @Field(() => String, { nullable: true })
  profileId?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  minWalletThresholdMinor?: bigint;
}
