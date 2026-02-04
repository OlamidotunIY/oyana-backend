import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { RatingTargetType } from '../../enums';

@InputType()
export class CreateRatingDto {
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
}
