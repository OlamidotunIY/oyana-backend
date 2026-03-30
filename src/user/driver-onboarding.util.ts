import { normalizeProfileRoles } from '../auth/utils/roles.util';
import {
  DriverType,
  OnboardingStep,
  PublicRole,
  UserType,
  VehicleCategory,
} from '../graphql/enums';

type DriverVehicleShape = {
  category?: string | null;
  plateNumber?: string | null;
  capacityKg?: number | null;
};

export type DriverProviderShape = {
  id: string;
  businessName?: string | null;
  driverType?: string | null;
  isAvailable?: boolean | null;
  availabilityUpdatedAt?: Date | null;
  vehicles?: DriverVehicleShape[] | null;
};

type DriverMembershipShape = {
  provider: DriverProviderShape | null;
};

export type DriverOnboardingProfileShape = {
  roles?: UserType[] | null;
  emailVerified: boolean;
  phoneE164?: string | null;
  phoneVerified: boolean;
  notificationPromptedAt?: Date | null;
  activeAddressId?: string | null;
  contactForProviders?: DriverProviderShape[] | null;
  providerMembers?: DriverMembershipShape[] | null;
};

export const normalizeDriverType = (
  value?: string | null,
): DriverType | null => {
  if (value === DriverType.BIKE || value === VehicleCategory.BIKE) {
    return DriverType.BIKE;
  }

  if (value === DriverType.VAN || value === VehicleCategory.VAN) {
    return DriverType.VAN;
  }

  if (value === DriverType.TRUCK || value === VehicleCategory.TRUCK) {
    return DriverType.TRUCK;
  }

  return null;
};

export const mapDriverTypeToVehicleCategory = (
  driverType?: string | null,
): VehicleCategory | null => {
  const normalizedDriverType = normalizeDriverType(driverType);

  if (normalizedDriverType === DriverType.BIKE) {
    return VehicleCategory.BIKE;
  }

  if (normalizedDriverType === DriverType.VAN) {
    return VehicleCategory.VAN;
  }

  if (normalizedDriverType === DriverType.TRUCK) {
    return VehicleCategory.TRUCK;
  }

  return null;
};

export const resolveActiveProvider = (
  profile: DriverOnboardingProfileShape,
): DriverProviderShape | null =>
  profile.contactForProviders?.[0] ?? profile.providerMembers?.[0]?.provider ?? null;

export const hasCompletedDriverRegistration = (
  provider?: DriverProviderShape | null,
): boolean => {
  const normalizedDriverType = normalizeDriverType(provider?.driverType);
  const expectedCategory = mapDriverTypeToVehicleCategory(normalizedDriverType);

  if (!normalizedDriverType || !expectedCategory) {
    return false;
  }

  return Boolean(
    provider?.vehicles?.some(
      (vehicle) =>
        vehicle.category === expectedCategory &&
        Boolean(vehicle.plateNumber?.trim()) &&
        typeof vehicle.capacityKg === 'number' &&
        vehicle.capacityKg > 0,
    ),
  );
};

export const resolvePublicRole = (
  profile: DriverOnboardingProfileShape,
): PublicRole => {
  const roles = normalizeProfileRoles(profile);

  if (roles.includes(UserType.ADMIN)) {
    return PublicRole.ADMIN;
  }

  const driverType = normalizeDriverType(resolveActiveProvider(profile)?.driverType);

  if (driverType === DriverType.BIKE) {
    return PublicRole.RIDER;
  }

  if (driverType === DriverType.VAN) {
    return PublicRole.VAN_DRIVER;
  }

  if (driverType === DriverType.TRUCK) {
    return PublicRole.TRUCK_DRIVER;
  }

  return PublicRole.SHIPPER;
};

export const resolveOnboardingStep = (
  profile: DriverOnboardingProfileShape,
): OnboardingStep => {
  const roles = normalizeProfileRoles(profile);

  if (!roles.includes(UserType.BUSINESS)) {
    return OnboardingStep.COMPLETED;
  }

  if (!profile.emailVerified) {
    return OnboardingStep.EMAIL_VERIFICATION;
  }

  if (!profile.phoneE164?.trim()) {
    return OnboardingStep.PHONE_INPUT;
  }

  if (!profile.phoneVerified) {
    return OnboardingStep.PHONE_VERIFICATION;
  }

  if (!hasCompletedDriverRegistration(resolveActiveProvider(profile))) {
    return OnboardingStep.DRIVER_REGISTRATION;
  }

  if (!profile.activeAddressId) {
    return OnboardingStep.ADDRESS;
  }

  if (!profile.notificationPromptedAt) {
    return OnboardingStep.NOTIFICATION_PERMISSION;
  }

  return OnboardingStep.COMPLETED;
};

export const isDriverOnboardingCompleted = (
  profile: DriverOnboardingProfileShape,
): boolean => resolveOnboardingStep(profile) === OnboardingStep.COMPLETED;
