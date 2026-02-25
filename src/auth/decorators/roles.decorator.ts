import { SetMetadata } from '@nestjs/common';
import { UserType } from '../../graphql/enums';

export type AppUserRole = UserType;

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AppUserRole[]) => SetMetadata(ROLES_KEY, roles);
