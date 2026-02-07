import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Permission } from './permission.type';

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

  @Field(() => [Permission])
  permissions: Permission[];
}
