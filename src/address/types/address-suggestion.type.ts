import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AddressSuggestion {
  @Field()
  placeId: string;

  @Field()
  description: string;

  @Field({ nullable: true })
  mainText?: string;

  @Field({ nullable: true })
  secondaryText?: string;
}
