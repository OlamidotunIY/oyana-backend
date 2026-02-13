import { InputType, Field } from '@nestjs/graphql';
import { WalletOwnerType } from '../../enums';

@InputType()
export class CreateWalletAccountDto {
  @Field(() => WalletOwnerType)
  ownerType: WalletOwnerType;

  @Field({ nullable: true })
  ownerProfileId?: string;

  @Field({ nullable: true })
  ownerProviderId?: string;

  @Field()
  currency: string;

  @Field(() => Boolean, { nullable: true })
  initializeEscrow?: boolean;
}
