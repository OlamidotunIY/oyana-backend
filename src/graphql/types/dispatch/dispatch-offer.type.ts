import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { DispatchOfferStatus } from '../../enums';
import { GraphQLJSON } from 'graphql-scalars';
import { GraphQLBigInt } from '../../scalars';
import { Provider } from '../provider';

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

  @Field(() => DispatchOfferStatus)
  status: DispatchOfferStatus;

  @Field(() => Date, { nullable: true })
  sentAt?: Date;

  @Field(() => Date, { nullable: true })
  respondedAt?: Date;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field(() => Int, { nullable: true })
  providerEtaMinutes?: number;

  @Field(() => GraphQLBigInt, { nullable: true })
  counterAmountMinor?: bigint;

  @Field(() => String, { nullable: true })
  counterCurrency?: string;

  @Field(() => String, { nullable: true })
  counterMessage?: string;

  @Field(() => Date, { nullable: true })
  counteredAt?: Date;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field(() => Provider, { nullable: true })
  provider?: Provider;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
