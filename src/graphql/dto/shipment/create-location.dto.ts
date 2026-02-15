import { InputType, Field } from '@nestjs/graphql';
import { State } from '../../enums';

@InputType()
export class CreateUserAddressDto {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  profileId?: string;

  @Field()
  address: string;

  @Field()
  city: string;

  @Field(() => State)
  state: State;

  @Field()
  postalCode: string;

  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  countryCode?: string;

  @Field({ nullable: true })
  lat?: number;

  @Field({ nullable: true })
  lng?: number;
}
