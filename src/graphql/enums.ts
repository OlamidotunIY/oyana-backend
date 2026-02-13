import { registerEnumType } from '@nestjs/graphql';
import {
  BidStatus as PrismaBidStatus,
  DispatchBatchStatus as PrismaDispatchBatchStatus,
  DispatchOfferStatus as PrismaDispatchOfferStatus,
  PodUploadType as PrismaPodUploadType,
  ProfileStatus as PrismaProfileStatus,
  ShipmentActorRole as PrismaShipmentActorRole,
  ShipmentAssignmentStatus as PrismaShipmentAssignmentStatus,
  ShipmentEventType as PrismaShipmentEventType,
  ShipmentMilestoneStatus as PrismaShipmentMilestoneStatus,
  ShipmentMilestoneType as PrismaShipmentMilestoneType,
  ShipmentMode as PrismaShipmentMode,
  ShipmentScheduleType as PrismaShipmentScheduleType,
  ShipmentStatus as PrismaShipmentStatus,
  State as PrismaState,
  UserType as PrismaUserType,
  VehicleCategory as PrismaVehicleCategory,
  WaybillStatus as PrismaWaybillStatus,
} from '@prisma/client';

// ============================================================================
// AUTH ENUMS
// ============================================================================

export enum OtpMode {
  SIGNUP = 'signup',
  SIGNIN = 'signin',
}

export const UserType = {
  INDIVIDUAL: PrismaUserType.individual,
  BUSINESS: PrismaUserType.business,
  ADMIN: PrismaUserType.admin,
} as const;
export type UserType = (typeof UserType)[keyof typeof UserType];

// ============================================================================
// CORE ENUMS
// ============================================================================

export const ProfileStatus = {
  ACTIVE: PrismaProfileStatus.active,
  SUSPENDED: PrismaProfileStatus.suspended,
  DELETED: PrismaProfileStatus.deleted,
} as const;
export type ProfileStatus = (typeof ProfileStatus)[keyof typeof ProfileStatus];

export const State = {
  LAGOS: PrismaState.Lagos,
  OYO: PrismaState.Oyo,
  ABUJA: PrismaState.Abuja,
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
  BIKE: PrismaVehicleCategory.bike,
  VAN: PrismaVehicleCategory.van,
  TRUCK: PrismaVehicleCategory.truck,
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
  DISPATCH: PrismaShipmentMode.dispatch,
  MARKETPLACE: PrismaShipmentMode.marketplace,
} as const;
export type ShipmentMode = (typeof ShipmentMode)[keyof typeof ShipmentMode];

export const ShipmentScheduleType = {
  INSTANT: PrismaShipmentScheduleType.instant,
  SCHEDULED: PrismaShipmentScheduleType.scheduled,
} as const;
export type ShipmentScheduleType =
  (typeof ShipmentScheduleType)[keyof typeof ShipmentScheduleType];

export const ShipmentStatus = {
  DRAFT: PrismaShipmentStatus.draft,
  CREATED: PrismaShipmentStatus.created,
  BROADCASTING: PrismaShipmentStatus.broadcasting,
  ASSIGNED: PrismaShipmentStatus.assigned,
  EN_ROUTE_PICKUP: PrismaShipmentStatus.en_route_pickup,
  PICKED_UP: PrismaShipmentStatus.picked_up,
  EN_ROUTE_DROPOFF: PrismaShipmentStatus.en_route_dropoff,
  DELIVERED: PrismaShipmentStatus.delivered,
  COMPLETED: PrismaShipmentStatus.completed,
  CANCELLED: PrismaShipmentStatus.cancelled,
  EXPIRED: PrismaShipmentStatus.expired,
} as const;
export type ShipmentStatus =
  (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const ShipmentEventType = {
  CREATED: PrismaShipmentEventType.created,
  BROADCASTED: PrismaShipmentEventType.broadcasted,
  BID_PLACED: PrismaShipmentEventType.bid_placed,
  ASSIGNED: PrismaShipmentEventType.assigned,
  ACCEPTED: PrismaShipmentEventType.accepted,
  CANCELLED: PrismaShipmentEventType.cancelled,
  PICKED_UP: PrismaShipmentEventType.picked_up,
  DELIVERED: PrismaShipmentEventType.delivered,
  COMPLETED: PrismaShipmentEventType.completed,
} as const;
export type ShipmentEventType =
  (typeof ShipmentEventType)[keyof typeof ShipmentEventType];

export const ShipmentActorRole = {
  CUSTOMER: PrismaShipmentActorRole.customer,
  PROVIDER: PrismaShipmentActorRole.provider,
  ADMIN: PrismaShipmentActorRole.admin,
  SYSTEM: PrismaShipmentActorRole.system,
} as const;
export type ShipmentActorRole =
  (typeof ShipmentActorRole)[keyof typeof ShipmentActorRole];

// ============================================================================
// DISPATCH ENUMS
// ============================================================================

export const DispatchBatchStatus = {
  OPEN: PrismaDispatchBatchStatus.open,
  CLOSED: PrismaDispatchBatchStatus.closed,
  ASSIGNED: PrismaDispatchBatchStatus.assigned,
  EXPIRED: PrismaDispatchBatchStatus.expired,
  CANCELLED: PrismaDispatchBatchStatus.cancelled,
} as const;
export type DispatchBatchStatus =
  (typeof DispatchBatchStatus)[keyof typeof DispatchBatchStatus];

export const DispatchOfferStatus = {
  SENT: PrismaDispatchOfferStatus.sent,
  VIEWED: PrismaDispatchOfferStatus.viewed,
  ACCEPTED: PrismaDispatchOfferStatus.accepted,
  DECLINED: PrismaDispatchOfferStatus.declined,
  EXPIRED: PrismaDispatchOfferStatus.expired,
  CANCELLED: PrismaDispatchOfferStatus.cancelled,
} as const;
export type DispatchOfferStatus =
  (typeof DispatchOfferStatus)[keyof typeof DispatchOfferStatus];

export const ShipmentAssignmentStatus = {
  ACTIVE: PrismaShipmentAssignmentStatus.active,
  COMPLETED: PrismaShipmentAssignmentStatus.completed,
  CANCELLED: PrismaShipmentAssignmentStatus.cancelled,
} as const;
export type ShipmentAssignmentStatus =
  (typeof ShipmentAssignmentStatus)[keyof typeof ShipmentAssignmentStatus];

// ============================================================================
// MARKETPLACE ENUMS
// ============================================================================

export const BidStatus = {
  ACTIVE: PrismaBidStatus.active,
  WITHDRAWN: PrismaBidStatus.withdrawn,
  REJECTED: PrismaBidStatus.rejected,
  ACCEPTED: PrismaBidStatus.accepted,
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
  ACCEPTED: PrismaShipmentMilestoneType.accepted,
  ARRIVED_PICKUP: PrismaShipmentMilestoneType.arrived_pickup,
  PICKED_UP: PrismaShipmentMilestoneType.picked_up,
  ARRIVED_DROPOFF: PrismaShipmentMilestoneType.arrived_dropoff,
  DELIVERED: PrismaShipmentMilestoneType.delivered,
  COMPLETED: PrismaShipmentMilestoneType.completed,
} as const;
export type ShipmentMilestoneType =
  (typeof ShipmentMilestoneType)[keyof typeof ShipmentMilestoneType];

export const ShipmentMilestoneStatus = {
  PENDING: PrismaShipmentMilestoneStatus.pending,
  REACHED: PrismaShipmentMilestoneStatus.reached,
  VERIFIED: PrismaShipmentMilestoneStatus.verified,
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
  PHOTO: PrismaPodUploadType.photo,
  SIGNATURE: PrismaPodUploadType.signature,
  DOCUMENT: PrismaPodUploadType.document,
} as const;
export type PodUploadType = (typeof PodUploadType)[keyof typeof PodUploadType];

export const WaybillStatus = {
  UPLOADED: PrismaWaybillStatus.uploaded,
  APPROVED: PrismaWaybillStatus.approved,
  REJECTED: PrismaWaybillStatus.rejected,
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
