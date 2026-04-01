import { InputType, Field } from '@nestjs/graphql';
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

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field({ nullable: true })
  providerEtaMinutes?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;
}
