import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateDispatchBatchDto {
  @Field()
  shipmentId: string;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;
}
