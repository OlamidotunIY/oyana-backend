import {
  AccountRole,
  AppMode,
  DriverOnboardingStatus,
  UserRole,
  UserType,
} from '../../graphql/enums';

type ProfileRoleShape = {
  role?: UserRole | null;
  accountRole?: AccountRole | null;
  activeAppMode?: AppMode | null;
  driverProfile?:
    | {
        onboardingStatus?: DriverOnboardingStatus | null;
      }
    | null;
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

const hasApprovedDriverMode = (profile: ProfileRoleShape): boolean =>
  profile.activeAppMode === AppMode.DRIVER &&
  profile.driverProfile?.onboardingStatus === DriverOnboardingStatus.APPROVED;

export const mapUserRoleToUserTypes = (
  profile: ProfileRoleShape,
): UserType[] => {
  if (
    profile.accountRole === AccountRole.ADMIN ||
    profile.role === UserRole.ADMIN
  ) {
    return [UserType.ADMIN];
  }

  if (hasApprovedDriverMode(profile)) {
    return [UserType.BUSINESS];
  }

  // Compatibility path for older seeded data that still stores driver role
  // directly on the profile and has not been upgraded to DriverProfile yet.
  if (isDriverUserRole(profile.role) && !profile.driverProfile) {
    return [UserType.BUSINESS];
  }

  if (profile.accountRole === AccountRole.USER || profile.role === UserRole.SHIPPER) {
    return [UserType.INDIVIDUAL];
  }

  return [];
};

export const normalizeProfileRoles = (
  profile: ProfileRoleShape,
): UserType[] => {
  return mapUserRoleToUserTypes(profile).filter((role) =>
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
