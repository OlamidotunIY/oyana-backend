import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Role {
  @Field(() => ID)
  id: string;

  @Field()
  key: string;

  @Field({ nullable: true })
  name?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
