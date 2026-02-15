import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ResolvedAddress {
  @Field()
  formattedAddress: string;

  @Field({ nullable: true })
  placeId?: string;

  @Field({ nullable: true })
  addressLine?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  stateOrProvince?: string;

  @Field({ nullable: true })
  postalCode?: string;

  @Field({ nullable: true })
  countryCode?: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;
}
