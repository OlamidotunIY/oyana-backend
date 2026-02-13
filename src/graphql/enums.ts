import { registerEnumType } from '@nestjs/graphql';

// ============================================================================
// AUTH ENUMS
// ============================================================================

export enum OtpMode {
  SIGNUP = 'signup',
  SIGNIN = 'signin',
}

export const UserType = {
  INDIVIDUAL: 'individual',
  BUSINESS: 'business',
  ADMIN: 'admin',
} as const;
export type UserType = (typeof UserType)[keyof typeof UserType];

// ============================================================================
// CORE ENUMS
// ============================================================================

export const ProfileStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;
export type ProfileStatus = (typeof ProfileStatus)[keyof typeof ProfileStatus];

export const State = {
  LAGOS: 'Lagos',
  OYO: 'Oyo',
  ABUJA: 'Abuja',
} as const;
export type State = (typeof State)[keyof typeof State];

export const UserStatus = ProfileStatus;
export type UserStatus = ProfileStatus;

export const PreferredLanguage = {
  EN: 'en',
  ZH_HANS: 'zh-Hans',
} as const;
export type PreferredLanguage =
  (typeof PreferredLanguage)[keyof typeof PreferredLanguage];

// ============================================================================
// PROVIDER ENUMS
// ============================================================================

export enum ProviderType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
}

export enum ProviderStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum ProviderMemberRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  DRIVER = 'driver',
  STAFF = 'staff',
}

export const VehicleCategory = {
  BIKE: 'bike',
  VAN: 'van',
  TRUCK: 'truck',
} as const;
export type VehicleCategory =
  (typeof VehicleCategory)[keyof typeof VehicleCategory];

export { VehicleCategory as VehicleType };

export enum VehicleStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

export enum KycCaseStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_MORE_INFO = 'needs_more_info',
}

export { KycCaseStatus as KYCCaseStatus };

export enum KYCCaseType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
}

export enum KycDocumentType {
  NIN = 'nin',
  DRIVERS_LICENSE = 'drivers_license',
  VEHICLE_REG = 'vehicle_reg',
  PASSPORT = 'passport',
  WAYBILL_TEMPLATE = 'waybill_template',
}

export { KycDocumentType as KYCDocumentType };

export enum KycDocumentStatus {
  UPLOADED = 'uploaded',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export { KycDocumentStatus as KYCDocumentStatus };

export enum NinVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export { NinVerificationStatus as NINVerificationStatus };

// ============================================================================
// SHIPMENT ENUMS
// ============================================================================

export const ShipmentMode = {
  DISPATCH: 'dispatch',
  MARKETPLACE: 'marketplace',
} as const;
export type ShipmentMode = (typeof ShipmentMode)[keyof typeof ShipmentMode];

export const ShipmentScheduleType = {
  INSTANT: 'instant',
  SCHEDULED: 'scheduled',
} as const;
export type ShipmentScheduleType =
  (typeof ShipmentScheduleType)[keyof typeof ShipmentScheduleType];

export const ShipmentStatus = {
  DRAFT: 'draft',
  CREATED: 'created',
  BROADCASTING: 'broadcasting',
  ASSIGNED: 'assigned',
  EN_ROUTE_PICKUP: 'en_route_pickup',
  PICKED_UP: 'picked_up',
  EN_ROUTE_DROPOFF: 'en_route_dropoff',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;
export type ShipmentStatus =
  (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const ShipmentEventType = {
  CREATED: 'created',
  BROADCASTED: 'broadcasted',
  BID_PLACED: 'bid_placed',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  CANCELLED: 'cancelled',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
} as const;
export type ShipmentEventType =
  (typeof ShipmentEventType)[keyof typeof ShipmentEventType];

export const ShipmentActorRole = {
  CUSTOMER: 'customer',
  PROVIDER: 'provider',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;
export type ShipmentActorRole =
  (typeof ShipmentActorRole)[keyof typeof ShipmentActorRole];

// ============================================================================
// DISPATCH ENUMS
// ============================================================================

export const DispatchBatchStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
  ASSIGNED: 'assigned',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;
export type DispatchBatchStatus =
  (typeof DispatchBatchStatus)[keyof typeof DispatchBatchStatus];

export const DispatchOfferStatus = {
  SENT: 'sent',
  VIEWED: 'viewed',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;
export type DispatchOfferStatus =
  (typeof DispatchOfferStatus)[keyof typeof DispatchOfferStatus];

export const ShipmentAssignmentStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type ShipmentAssignmentStatus =
  (typeof ShipmentAssignmentStatus)[keyof typeof ShipmentAssignmentStatus];

// ============================================================================
// MARKETPLACE ENUMS
// ============================================================================

export const BidStatus = {
  ACTIVE: 'active',
  WITHDRAWN: 'withdrawn',
  REJECTED: 'rejected',
  ACCEPTED: 'accepted',
} as const;
export type BidStatus = (typeof BidStatus)[keyof typeof BidStatus];

// ============================================================================
// WALLET ENUMS
// ============================================================================

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

export enum WalletOwnerType {
  PROFILE = 'profile',
  PROVIDER = 'provider',
}

export enum WalletAccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

export enum TransactionDirection {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum TransactionType {
  TOPUP = 'topup',
  SHIPMENT_PAYMENT = 'shipment_payment',
  PROVIDER_PAYOUT = 'provider_payout',
  COMMISSION = 'commission',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}

export enum PaymentIntentStatus {
  INITIALIZED = 'initialized',
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum RefundStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

// ============================================================================
// SLA ENUMS
// ============================================================================

export enum SlaRuleScope {
  GLOBAL = 'global',
  VEHICLE_CATEGORY = 'vehicle_category',
  PROVIDER = 'provider',
}

export { ShipmentStatus as SLARuleStatus };

export enum RatingTargetType {
  PROVIDER = 'provider',
  CUSTOMER = 'customer',
}

export enum PenaltyType {
  LATE_CANCEL = 'late_cancel',
  NO_SHOW = 'no_show',
  LOW_RATING = 'low_rating',
}

// ============================================================================
// MILESTONE ENUMS
// ============================================================================

export const ShipmentMilestoneType = {
  ACCEPTED: 'accepted',
  ARRIVED_PICKUP: 'arrived_pickup',
  PICKED_UP: 'picked_up',
  ARRIVED_DROPOFF: 'arrived_dropoff',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
} as const;
export type ShipmentMilestoneType =
  (typeof ShipmentMilestoneType)[keyof typeof ShipmentMilestoneType];

export const ShipmentMilestoneStatus = {
  PENDING: 'pending',
  REACHED: 'reached',
  VERIFIED: 'verified',
} as const;
export type ShipmentMilestoneStatus =
  (typeof ShipmentMilestoneStatus)[keyof typeof ShipmentMilestoneStatus];

export enum OTPPurpose {
  REGISTRATION = 'registration',
  LOGIN = 'login',
  PASSWORD_RESET = 'password_reset',
  TRANSACTION_VERIFY = 'transaction_verify',
}

export const PodUploadType = {
  PHOTO: 'photo',
  SIGNATURE: 'signature',
  DOCUMENT: 'document',
} as const;
export type PodUploadType = (typeof PodUploadType)[keyof typeof PodUploadType];

export const WaybillStatus = {
  UPLOADED: 'uploaded',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type WaybillStatus = (typeof WaybillStatus)[keyof typeof WaybillStatus];

// ============================================================================
// REGISTER ENUMS FOR GRAPHQL
// ============================================================================

registerEnumType(OtpMode, { name: 'OtpMode' });
registerEnumType(UserType, { name: 'UserType' });
registerEnumType(ProfileStatus, { name: 'ProfileStatus' });
registerEnumType(State, { name: 'State' });
registerEnumType(PreferredLanguage, { name: 'PreferredLanguage' });
registerEnumType(ProviderType, { name: 'ProviderType' });
registerEnumType(ProviderStatus, { name: 'ProviderStatus' });
registerEnumType(ProviderMemberRole, { name: 'ProviderMemberRole' });
registerEnumType(VehicleCategory, { name: 'VehicleCategory' });
registerEnumType(VehicleStatus, { name: 'VehicleStatus' });
registerEnumType(KycCaseStatus, { name: 'KycCaseStatus' });
registerEnumType(KYCCaseType, { name: 'KYCCaseType' });
registerEnumType(KycDocumentType, { name: 'KycDocumentType' });
registerEnumType(KycDocumentStatus, { name: 'KycDocumentStatus' });
registerEnumType(NinVerificationStatus, { name: 'NinVerificationStatus' });
registerEnumType(ShipmentMode, { name: 'ShipmentMode' });
registerEnumType(ShipmentScheduleType, { name: 'ShipmentScheduleType' });
registerEnumType(ShipmentStatus, { name: 'ShipmentStatus' });
registerEnumType(ShipmentEventType, { name: 'ShipmentEventType' });
registerEnumType(ShipmentActorRole, { name: 'ShipmentActorRole' });
registerEnumType(DispatchBatchStatus, { name: 'DispatchBatchStatus' });
registerEnumType(DispatchOfferStatus, { name: 'DispatchOfferStatus' });
registerEnumType(ShipmentAssignmentStatus, { name: 'ShipmentAssignmentStatus' });
registerEnumType(BidStatus, { name: 'BidStatus' });
registerEnumType(TransactionStatus, { name: 'TransactionStatus' });
registerEnumType(WalletOwnerType, { name: 'WalletOwnerType' });
registerEnumType(WalletAccountStatus, { name: 'WalletAccountStatus' });
registerEnumType(TransactionDirection, { name: 'TransactionDirection' });
registerEnumType(TransactionType, { name: 'TransactionType' });
registerEnumType(PaymentIntentStatus, { name: 'PaymentIntentStatus' });
registerEnumType(RefundStatus, { name: 'RefundStatus' });
registerEnumType(SlaRuleScope, { name: 'SlaRuleScope' });
registerEnumType(RatingTargetType, { name: 'RatingTargetType' });
registerEnumType(PenaltyType, { name: 'PenaltyType' });
registerEnumType(ShipmentMilestoneType, { name: 'ShipmentMilestoneType' });
registerEnumType(ShipmentMilestoneStatus, { name: 'ShipmentMilestoneStatus' });
registerEnumType(OTPPurpose, { name: 'OTPPurpose' });
registerEnumType(PodUploadType, { name: 'PodUploadType' });
registerEnumType(WaybillStatus, { name: 'WaybillStatus' });
