import { InputType, Field } from '@nestjs/graphql';
import { ProviderType } from '../../enums';

@InputType()
export class CreateProviderDto {
  @Field(() => ProviderType)
  type: ProviderType;

  @Field()
  legalName: string;

  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  contactProfileId?: string;

  @Field()
  minWalletThresholdMinor: string;
}
