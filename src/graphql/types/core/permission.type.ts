import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Permission {
  @Field(() => ID)
  id: string;

  @Field()
  key: string;

  @Field({ nullable: true })
  description: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
