import { registerEnumType } from '@nestjs/graphql';

// ============================================================================
// CORE ENUMS
// ============================================================================

export enum ProfileStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

// Alias for backward compatibility
export { ProfileStatus as UserStatus };

export enum PreferredLanguage {
  EN = 'en',
  ZH_HANS = 'zh-Hans',
}

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

export enum VehicleCategory {
  BIKE = 'bike',
  VAN = 'van',
  TRUCK = 'truck',
}

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
// JOB ENUMS
// ============================================================================

export enum LocationType {
  PICKUP = 'pickup',
  DROPOFF = 'dropoff',
}

export enum JobMode {
  DISPATCH = 'dispatch',
  MARKETPLACE = 'marketplace',
}

export { JobMode as JobType };

export enum JobStatus {
  DRAFT = 'draft',
  CREATED = 'created',
  BROADCASTING = 'broadcasting',
  ASSIGNED = 'assigned',
  EN_ROUTE_PICKUP = 'en_route_pickup',
  PICKED_UP = 'picked_up',
  EN_ROUTE_DROPOFF = 'en_route_dropoff',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum JobEventType {
  CREATED = 'created',
  BROADCASTED = 'broadcasted',
  BID_PLACED = 'bid_placed',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  CANCELLED = 'cancelled',
  PICKED_UP = 'picked_up',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
}

export enum JobActorRole {
  CUSTOMER = 'customer',
  PROVIDER = 'provider',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

// ============================================================================
// DISPATCH ENUMS
// ============================================================================

export enum DispatchBatchStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  ASSIGNED = 'assigned',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum DispatchOfferStatus {
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum JobAssignmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// MARKETPLACE ENUMS
// ============================================================================

export enum BidStatus {
  ACTIVE = 'active',
  WITHDRAWN = 'withdrawn',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted',
}

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
  JOB_PAYMENT = 'job_payment',
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

export { JobStatus as SLARuleStatus };

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

export enum MilestoneType {
  ACCEPTED = 'accepted',
  ARRIVED_PICKUP = 'arrived_pickup',
  PICKED_UP = 'picked_up',
  ARRIVED_DROPOFF = 'arrived_dropoff',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
}

export { MilestoneType as JobMilestoneType };

export enum MilestoneStatus {
  PENDING = 'pending',
  REACHED = 'reached',
  VERIFIED = 'verified',
}

export { MilestoneStatus as JobMilestoneStatus };

export enum OTPPurpose {
  REGISTRATION = 'registration',
  LOGIN = 'login',
  PASSWORD_RESET = 'password_reset',
  TRANSACTION_VERIFY = 'transaction_verify',
}

export enum PodUploadType {
  PHOTO = 'photo',
  SIGNATURE = 'signature',
  DOCUMENT = 'document',
}

export enum WaybillStatus {
  UPLOADED = 'uploaded',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// ============================================================================
// REGISTER ENUMS FOR GRAPHQL
// ============================================================================

registerEnumType(ProfileStatus, { name: 'ProfileStatus' });
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
registerEnumType(LocationType, { name: 'LocationType' });
registerEnumType(JobMode, { name: 'JobMode' });
registerEnumType(JobStatus, { name: 'JobStatus' });
registerEnumType(JobEventType, { name: 'JobEventType' });
registerEnumType(JobActorRole, { name: 'JobActorRole' });
registerEnumType(DispatchBatchStatus, { name: 'DispatchBatchStatus' });
registerEnumType(DispatchOfferStatus, { name: 'DispatchOfferStatus' });
registerEnumType(JobAssignmentStatus, { name: 'JobAssignmentStatus' });
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
registerEnumType(MilestoneType, { name: 'MilestoneType' });
registerEnumType(MilestoneStatus, { name: 'MilestoneStatus' });
registerEnumType(OTPPurpose, { name: 'OTPPurpose' });
registerEnumType(PodUploadType, { name: 'PodUploadType' });
registerEnumType(WaybillStatus, { name: 'WaybillStatus' });
