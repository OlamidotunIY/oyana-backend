import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CreateRoleInput {
  @Field()
  key: string;

  @Field(() => String, { nullable: true })
  name?: string;
}

@InputType()
export class AssignRoleInput {
  @Field(() => ID)
  profileId: string;

  @Field(() => ID)
  roleId: string;
}

@InputType()
export class CreatePermissionInput {
  @Field()
  key: string;

  @Field(() => String, { nullable: true })
  description?: string;
}

@InputType()
export class AssignPermissionToRoleInput {
  @Field(() => ID)
  roleId: string;

  @Field(() => ID)
  permissionId: string;
}
