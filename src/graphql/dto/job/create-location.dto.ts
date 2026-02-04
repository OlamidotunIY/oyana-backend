import { InputType, Field } from '@nestjs/graphql';
import { LocationType } from '../../enums';

@InputType()
export class CreateLocationDto {
  @Field()
  jobId: string;

  @Field(() => LocationType)
  locationType: LocationType;

  @Field()
  latitude: number;

  @Field()
  longitude: number;

  @Field()
  address: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  state?: string;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  contactName?: string;

  @Field({ nullable: true })
  contactPhone?: string;
}
