import { ObjectType, Field } from '@nestjs/graphql';
import { Role } from './role.type';

@ObjectType()
export class UserRole {
  @Field()
  profileId: string;

  @Field()
  roleId: string;

  @Field()
  createdAt: Date;

  @Field(() => Role)
  role: Role;
}
