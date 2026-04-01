import { ObjectType, Field, ID } from '@nestjs/graphql';
import { WaybillStatus } from '../../enums';

@ObjectType()
export class Waybill {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field()
  storageBucket: string;

  @Field()
  storagePath: string;

  @Field(() => WaybillStatus)
  status: WaybillStatus;

  @Field(() => String, { nullable: true })
  reviewedByProfileId?: string;

  @Field({ nullable: true })
  reviewedAt?: Date;

  @Field()
  createdAt: Date;
}
