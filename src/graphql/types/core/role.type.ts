import { ObjectType, Field, ID } from '@nestjs/graphql';
import { RolePermission } from './role-permission.type';

@ObjectType()
export class Role {
  @Field(() => ID)
  id: string;

  @Field()
  key: string;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [RolePermission])
  rolePermissions: RolePermission[];
}
