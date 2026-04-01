import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class CreateDispatchOfferDto {
  @Field()
  batchId: string;

  @Field()
  providerId: string;

  @Field()
  shipmentId: string;

  @Field(() => String, { nullable: true })
  vehicleId?: string;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field(() => Int, { nullable: true })
  providerEtaMinutes?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;
}
