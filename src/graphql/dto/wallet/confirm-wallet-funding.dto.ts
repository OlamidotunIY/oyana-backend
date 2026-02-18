import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class ConfirmWalletFundingInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  reference: string;
}
