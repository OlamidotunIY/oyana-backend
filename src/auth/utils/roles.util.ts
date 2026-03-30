import { UserRole, UserType } from '../../graphql/enums';

type ProfileRoleShape = {
  role?: UserRole | null;
};

const ALL_USER_TYPES = Object.values(UserType) as UserType[];
const DRIVER_USER_ROLES = new Set<UserRole>([
  UserRole.RIDER,
  UserRole.VAN_DRIVER,
  UserRole.TRUCK_DRIVER,
]);

export const isDriverUserRole = (
  value: UserRole | null | undefined,
): value is UserRole =>
  Boolean(value && DRIVER_USER_ROLES.has(value));

export const mapUserRoleToUserTypes = (
  role: UserRole | null | undefined,
): UserType[] => {
  if (!role) {
    return [];
  }

  if (role === UserRole.ADMIN) {
    return [UserType.ADMIN];
  }

  if (isDriverUserRole(role)) {
    return [UserType.BUSINESS];
  }

  if (role === UserRole.SHIPPER) {
    return [UserType.INDIVIDUAL];
  }

  return [];
};

export const normalizeProfileRoles = (
  profile: ProfileRoleShape,
): UserType[] => {
  return mapUserRoleToUserTypes(profile.role).filter((role) =>
    ALL_USER_TYPES.includes(role),
  );
};

export const resolveProfileRole = (
  profile: ProfileRoleShape,
  preferredRoles: UserType[] = [],
): UserType => {
  const normalizedRoles = normalizeProfileRoles(profile);

  if (normalizedRoles.length === 0) {
    return preferredRoles[0] ?? UserType.INDIVIDUAL;
  }

  for (const preferredRole of preferredRoles) {
    if (normalizedRoles.includes(preferredRole)) {
      return preferredRole;
    }
  }

  return normalizedRoles[0];
};

export const hasAnyProfileRole = (
  profile: ProfileRoleShape,
  requiredRoles: UserType[],
): boolean => {
  const normalizedRoles = normalizeProfileRoles(profile);
  return requiredRoles.some((requiredRole) =>
    normalizedRoles.includes(requiredRole),
  );
};
