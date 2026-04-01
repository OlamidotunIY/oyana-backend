import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { State } from '../../enums';

@ObjectType()
export class UserAddress {
  @Field(() => ID)
  id: string;

  @Field()
  profileId: string;

  @Field()
  address: string;

  @Field()
  city: string;

  @Field(() => State)
  state: State;

  @Field()
  postalCode: string;

  @Field(() => String, { nullable: true })
  label?: string;

  @Field()
  countryCode: string;

  @Field(() => Float, { nullable: true })
  lat?: number;

  @Field(() => Float, { nullable: true })
  lng?: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
