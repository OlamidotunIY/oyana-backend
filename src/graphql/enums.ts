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

export const RegistrationIntent = {
  DRIVER: 'driver',
} as const;
export type RegistrationIntent =
  (typeof RegistrationIntent)[keyof typeof RegistrationIntent];

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

export const PublicRole = {
  SHIPPER: 'shipper',
  RIDER: 'rider',
  VAN_DRIVER: 'van_driver',
  TRUCK_DRIVER: 'truck_driver',
  ADMIN: 'admin',
} as const;
export type PublicRole = (typeof PublicRole)[keyof typeof PublicRole];

export const OnboardingStep = {
  EMAIL_VERIFICATION: 'email_verification',
  PHONE_INPUT: 'phone_input',
  PHONE_VERIFICATION: 'phone_verification',
  DRIVER_REGISTRATION: 'driver_registration',
  ADDRESS: 'address',
  NOTIFICATION_PERMISSION: 'notification_permission',
  COMPLETED: 'completed',
} as const;
export type OnboardingStep =
  (typeof OnboardingStep)[keyof typeof OnboardingStep];

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

export const DriverType = {
  BIKE: 'bike',
  VAN: 'van',
  TRUCK: 'truck',
} as const;
export type DriverType = (typeof DriverType)[keyof typeof DriverType];

export { VehicleCategory as VehicleType };

export enum VehicleStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

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

export const ShipmentQueryFilter = {
  ACTIVE: 'active',
  SCHEDULED: 'scheduled',
  HISTORY: 'history',
} as const;
export type ShipmentQueryFilter =
  (typeof ShipmentQueryFilter)[keyof typeof ShipmentQueryFilter];

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
// OPS ENUMS
// ============================================================================

export const SupportTicketStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;
export type SupportTicketStatus =
  (typeof SupportTicketStatus)[keyof typeof SupportTicketStatus];

export const SupportTicketPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type SupportTicketPriority =
  (typeof SupportTicketPriority)[keyof typeof SupportTicketPriority];

export const DisputeStatus = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

export const DisputeEventType = {
  CREATED: 'created',
  COMMENT: 'comment',
  STATUS_CHANGED: 'status_changed',
  RESOLVED: 'resolved',
} as const;
export type DisputeEventType =
  (typeof DisputeEventType)[keyof typeof DisputeEventType];

export const InvoiceStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const FraudSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type FraudSeverity = (typeof FraudSeverity)[keyof typeof FraudSeverity];

export const FraudStatus = {
  OPEN: 'open',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;
export type FraudStatus = (typeof FraudStatus)[keyof typeof FraudStatus];

export const FraudTargetType = {
  SHIPMENT: 'shipment',
  PROFILE: 'profile',
  PROVIDER: 'provider',
  WALLET: 'wallet',
  INVOICE: 'invoice',
  DISPUTE: 'dispute',
  OTHER: 'other',
} as const;
export type FraudTargetType =
  (typeof FraudTargetType)[keyof typeof FraudTargetType];

export const NotificationAudience = {
  CUSTOMER: 'customer',
  PROVIDER: 'provider',
  ADMIN: 'admin',
} as const;
export type NotificationAudience =
  (typeof NotificationAudience)[keyof typeof NotificationAudience];

export const NotificationCategory = {
  SHIPMENT: 'shipment',
  DISPATCH: 'dispatch',
  SUPPORT: 'support',
  DISPUTE: 'dispute',
  SYSTEM: 'system',
} as const;
export type NotificationCategory =
  (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const AdminDashboardInterval = {
  HOURLY: 'hourly',
  DAILY: 'daily',
} as const;
export type AdminDashboardInterval =
  (typeof AdminDashboardInterval)[keyof typeof AdminDashboardInterval];

export const AdminFleetStatus = {
  IN_TRANSIT: 'in_transit',
  DELAYED: 'delayed',
  STATIONARY: 'stationary',
} as const;
export type AdminFleetStatus =
  (typeof AdminFleetStatus)[keyof typeof AdminFleetStatus];

// ============================================================================
// WALLET ENUMS
// ============================================================================

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
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
  WITHDRAWAL = 'withdrawal',
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
registerEnumType(RegistrationIntent, { name: 'RegistrationIntent' });
registerEnumType(ProfileStatus, { name: 'ProfileStatus' });
registerEnumType(State, { name: 'State' });
registerEnumType(PreferredLanguage, { name: 'PreferredLanguage' });
registerEnumType(PublicRole, { name: 'PublicRole' });
registerEnumType(OnboardingStep, { name: 'OnboardingStep' });
registerEnumType(ProviderType, { name: 'ProviderType' });
registerEnumType(ProviderStatus, { name: 'ProviderStatus' });
registerEnumType(ProviderMemberRole, { name: 'ProviderMemberRole' });
registerEnumType(VehicleCategory, { name: 'VehicleCategory' });
registerEnumType(DriverType, { name: 'DriverType' });
registerEnumType(VehicleStatus, { name: 'VehicleStatus' });
registerEnumType(ShipmentMode, { name: 'ShipmentMode' });
registerEnumType(ShipmentScheduleType, { name: 'ShipmentScheduleType' });
registerEnumType(ShipmentStatus, { name: 'ShipmentStatus' });
registerEnumType(ShipmentQueryFilter, { name: 'ShipmentQueryFilter' });
registerEnumType(ShipmentEventType, { name: 'ShipmentEventType' });
registerEnumType(ShipmentActorRole, { name: 'ShipmentActorRole' });
registerEnumType(DispatchBatchStatus, { name: 'DispatchBatchStatus' });
registerEnumType(DispatchOfferStatus, { name: 'DispatchOfferStatus' });
registerEnumType(ShipmentAssignmentStatus, {
  name: 'ShipmentAssignmentStatus',
});
registerEnumType(BidStatus, { name: 'BidStatus' });
registerEnumType(SupportTicketStatus, { name: 'SupportTicketStatus' });
registerEnumType(SupportTicketPriority, { name: 'SupportTicketPriority' });
registerEnumType(DisputeStatus, { name: 'DisputeStatus' });
registerEnumType(DisputeEventType, { name: 'DisputeEventType' });
registerEnumType(InvoiceStatus, { name: 'InvoiceStatus' });
registerEnumType(FraudSeverity, { name: 'FraudSeverity' });
registerEnumType(FraudStatus, { name: 'FraudStatus' });
registerEnumType(FraudTargetType, { name: 'FraudTargetType' });
registerEnumType(NotificationAudience, { name: 'NotificationAudience' });
registerEnumType(NotificationCategory, { name: 'NotificationCategory' });
registerEnumType(AdminDashboardInterval, { name: 'AdminDashboardInterval' });
registerEnumType(AdminFleetStatus, { name: 'AdminFleetStatus' });
registerEnumType(TransactionStatus, { name: 'TransactionStatus' });
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
