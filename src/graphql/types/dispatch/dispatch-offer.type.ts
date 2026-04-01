import { ObjectType, Field, ID } from '@nestjs/graphql';
import { DispatchOfferStatus } from '../../enums';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class DispatchOffer {
  @Field(() => ID)
  id: string;

  @Field()
  batchId: string;

  @Field()
  providerId: string;

  @Field()
  shipmentId: string;

  @Field(() => String, { nullable: true })
  vehicleId?: string;

  @Field(() => DispatchOfferStatus)
  status: DispatchOfferStatus;

  @Field(() => Date, { nullable: true })
  sentAt?: Date;

  @Field(() => Date, { nullable: true })
  respondedAt?: Date;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field(() => Float, { nullable: true })
  providerEtaMinutes?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
