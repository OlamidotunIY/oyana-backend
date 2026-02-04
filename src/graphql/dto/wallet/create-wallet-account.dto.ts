import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateWalletAccountDto {
  @Field()
  profileId: string;

  @Field()
  currency: string;
}
