import { ObjectType, Field } from '@nestjs/graphql';
import { Permission } from './permission.type';

@ObjectType()
export class RolePermission {
  @Field()
  roleId: string;

  @Field()
  permissionId: string;

  @Field()
  createdAt: Date;

  @Field(() => Permission)
  permission: Permission;
}
