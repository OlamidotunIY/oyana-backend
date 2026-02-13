import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class Rating {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field()
  ratedByProfileId: string;

  @Field()
  providerId: string;

  @Field(() => Int)
  score: number;

  @Field({ nullable: true })
  comment?: string;

  @Field()
  createdAt: Date;
}
