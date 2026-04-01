import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateRatingDto {
  @Field()
  shipmentId: string;

  @Field()
  ratedByProfileId: string;

  @Field()
  providerId: string;

  @Field(() => Int)
  score: number;

  @Field(() => String, { nullable: true })
  comment?: string;
}
