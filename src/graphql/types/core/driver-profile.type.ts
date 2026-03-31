import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import {
  DriverType,
  DriverCapability,
  DriverComplianceDocumentType,
  DriverOnboardingStatus,
  NotificationCategory,
  VehicleCategory,
} from '../../enums';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class DriverVehicleRecord {
  @Field(() => ID)
  id: string;

  @Field(() => VehicleCategory)
  category: VehicleCategory;

  @Field({ nullable: true })
  plateNumber?: string | null;

  @Field({ nullable: true })
  vin?: string | null;

  @Field({ nullable: true })
  make?: string | null;

  @Field({ nullable: true })
  model?: string | null;

  @Field({ nullable: true })
  color?: string | null;

  @Field(() => Int, { nullable: true })
  capacityKg?: number | null;

  @Field(() => GraphQLBigInt, { nullable: true })
  capacityVolumeCm3?: bigint | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class DriverComplianceDocumentRecord {
  @Field(() => ID)
  id: string;

  @Field(() => DriverComplianceDocumentType)
  type: DriverComplianceDocumentType;

  @Field()
  status: string;

  @Field()
  storageBucket: string;

  @Field()
  storagePath: string;

  @Field({ nullable: true })
  mimeType?: string | null;

  @Field({ nullable: true })
  notes?: string | null;

  @Field()
  uploadedAt: Date;

  @Field({ nullable: true })
  reviewedAt?: Date | null;
}

@ObjectType()
export class DriverPresenceRecord {
  @Field(() => ID)
  id: string;

  @Field(() => Boolean)
  isOnline: boolean;

  @Field(() => Float, { nullable: true })
  lat?: number | null;

  @Field(() => Float, { nullable: true })
  lng?: number | null;

  @Field(() => Float, { nullable: true })
  accuracyMeters?: number | null;

  @Field(() => Float, { nullable: true })
  heading?: number | null;

  @Field(() => Float, { nullable: true })
  speedKph?: number | null;

  @Field({ nullable: true })
  recordedAt?: Date | null;

  @Field({ nullable: true })
  lastHeartbeatAt?: Date | null;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class DriverOnboardingSubmissionRecord {
  @Field(() => ID)
  id: string;

  @Field(() => DriverOnboardingStatus)
  status: DriverOnboardingStatus;

  @Field({ nullable: true })
  rejectionReason?: string | null;

  @Field({ nullable: true })
  reviewerId?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  snapshot?: Record<string, unknown> | null;

  @Field()
  submittedAt: Date;

  @Field({ nullable: true })
  reviewedAt?: Date | null;
}

@ObjectType()
export class DriverDocumentUploadUrl {
  @Field()
  storageBucket: string;

  @Field()
  storagePath: string;

  @Field()
  uploadUrl: string;

  @Field()
  expiresAt: Date;
}

@ObjectType()
export class DriverProfileRecord {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  providerId?: string | null;

  @Field(() => DriverOnboardingStatus)
  onboardingStatus: DriverOnboardingStatus;

  @Field(() => DriverType, { nullable: true })
  driverType?: DriverType | null;

  @Field({ nullable: true })
  legalFirstName?: string | null;

  @Field({ nullable: true })
  legalLastName?: string | null;

  @Field({ nullable: true })
  dateOfBirth?: Date | null;

  @Field({ nullable: true })
  selfieStorageBucket?: string | null;

  @Field({ nullable: true })
  selfieStoragePath?: string | null;

  @Field({ nullable: true })
  licenseNumber?: string | null;

  @Field({ nullable: true })
  licenseExpiryAt?: Date | null;

  @Field({ nullable: true })
  identityType?: string | null;

  @Field({ nullable: true })
  identityNumber?: string | null;

  @Field({ nullable: true })
  insurancePolicyNumber?: string | null;

  @Field({ nullable: true })
  rejectionReason?: string | null;

  @Field(() => [DriverCapability])
  capabilities: DriverCapability[];

  @Field(() => Boolean)
  canDispatch: boolean;

  @Field(() => Boolean)
  canFreight: boolean;

  @Field({ nullable: true })
  submittedAt?: Date | null;

  @Field({ nullable: true })
  reviewedAt?: Date | null;

  @Field({ nullable: true })
  approvedAt?: Date | null;

  @Field(() => DriverVehicleRecord, { nullable: true })
  vehicle?: DriverVehicleRecord | null;

  @Field(() => [DriverComplianceDocumentRecord])
  complianceDocuments: DriverComplianceDocumentRecord[];

  @Field(() => [DriverOnboardingSubmissionRecord])
  submissions: DriverOnboardingSubmissionRecord[];

  @Field(() => DriverPresenceRecord, { nullable: true })
  presence?: DriverPresenceRecord | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class NotificationInboxItem {
  @Field(() => ID)
  id: string;

  @Field(() => NotificationCategory)
  category: NotificationCategory;

  @Field()
  title: string;

  @Field()
  body: string;

  @Field({ nullable: true })
  entityType?: string | null;

  @Field({ nullable: true })
  entityId?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown> | null;

  @Field(() => Boolean)
  isRead: boolean;

  @Field({ nullable: true })
  readAt?: Date | null;

  @Field()
  createdAt: Date;
}
