import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminProviderOverview {
  @Field(() => ID)
  id: string;

  @Field()
  businessName: string;

  @Field()
  status: string;

  @Field(() => Int)
  activeAssignments: number;

  @Field(() => Int)
  openOffers: number;

  @Field()
  kycStatus: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
