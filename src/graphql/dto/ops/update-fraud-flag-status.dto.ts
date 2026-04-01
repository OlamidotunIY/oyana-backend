import { Field, InputType } from '@nestjs/graphql';
import { FraudStatus } from '../../enums';

@InputType()
export class UpdateFraudFlagStatusDto {
  @Field()
  fraudFlagId: string;

  @Field(() => FraudStatus)
  status: FraudStatus;

  @Field(() => String, { nullable: true })
  note?: string;
}
