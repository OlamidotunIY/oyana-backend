import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { RatingTargetType } from '../../enums';

@ObjectType()
export class Rating {
  @Field(() => ID)
  id: string;

  @Field()
  jobId: string;

  @Field()
  ratedByProfileId: string;

  @Field(() => RatingTargetType)
  targetType: RatingTargetType;

  @Field()
  targetId: string;

  @Field(() => Int)
  stars: number;

  @Field({ nullable: true })
  comment?: string;

  @Field(() => Float, { nullable: true })
  punctualityScore?: number;

  @Field(() => Float, { nullable: true })
  professionalismScore?: number;

  @Field(() => Float, { nullable: true })
  communicationScore?: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
