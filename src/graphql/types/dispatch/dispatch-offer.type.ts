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

  @Field({ nullable: true })
  sentAt?: Date;

  @Field({ nullable: true })
  respondedAt?: Date;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field({ nullable: true })
  providerEtaMinutes?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
