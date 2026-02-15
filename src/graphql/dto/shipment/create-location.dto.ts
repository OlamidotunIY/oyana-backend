import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateUserAddressDto {
  @Field()
  placeId: string;

  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  countryCode?: string;
}
