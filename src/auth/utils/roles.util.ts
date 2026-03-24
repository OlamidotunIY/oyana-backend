import { UserType } from '../../graphql/enums';

type ProfileRoleShape = {
  roles?: UserType[] | null;
};

const ALL_USER_TYPES = Object.values(UserType) as UserType[];

const isUserType = (value: unknown): value is UserType =>
  typeof value === 'string' && ALL_USER_TYPES.includes(value as UserType);

export const normalizeProfileRoles = (
  profile: ProfileRoleShape,
): UserType[] => {
  const roleSet = new Set<UserType>();

  for (const role of profile.roles ?? []) {
    if (isUserType(role)) {
      roleSet.add(role);
    }
  }

  if (roleSet.size === 0) {
    roleSet.add(UserType.INDIVIDUAL);
  }

  return Array.from(roleSet);
};

export const resolveProfileRole = (
  profile: ProfileRoleShape,
  preferredRoles: UserType[] = [],
): UserType => {
  const normalizedRoles = normalizeProfileRoles(profile);

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
