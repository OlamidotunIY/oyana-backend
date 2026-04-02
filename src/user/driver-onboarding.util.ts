import {
  DriverType,
  OnboardingStep,
  PublicRole,
  UserRole,
} from '../graphql/enums';

export type DriverProviderShape = {
  id: string;
  businessName?: string | null;
  driverType?: string | null;
  isAvailable?: boolean | null;
  availabilityUpdatedAt?: Date | null;
};

type DriverMembershipShape = {
  provider: DriverProviderShape | null;
};

export type DriverOnboardingProfileShape = {
  role?: UserRole | null;
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
  if (value === DriverType.BIKE) {
    return DriverType.BIKE;
  }

  if (value === DriverType.VAN) {
    return DriverType.VAN;
  }

  if (value === DriverType.TRUCK) {
    return DriverType.TRUCK;
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
  return Boolean(normalizedDriverType);
};

export const resolvePublicRole = (
  profile: DriverOnboardingProfileShape,
): PublicRole => {
  if (profile.role === UserRole.ADMIN) {
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

export const isDriverRole = (
  role?: UserRole | null,
): role is UserRole =>
  role === UserRole.RIDER ||
  role === UserRole.VAN_DRIVER ||
  role === UserRole.TRUCK_DRIVER;

export const resolveOnboardingStep = (
  profile: DriverOnboardingProfileShape,
): OnboardingStep => {
  if (profile.role === UserRole.ADMIN || profile.role === UserRole.SHIPPER) {
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

  if (
    !isDriverRole(profile.role) ||
    !hasCompletedDriverRegistration(resolveActiveProvider(profile))
  ) {
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
