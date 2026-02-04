# GraphQL Types and DTOs - Complete Implementation

## Overview

This document provides a complete overview of all GraphQL types and DTOs created for the Oyana logistics platform.

## Structure

```
src/graphql/
├── enums.ts                    # All GraphQL enums with registrations
├── scalars.ts                  # Custom scalars (DateTime, BigInt, JSON)
├── index.ts                    # Main export file
├── types/                      # GraphQL Object Types
│   ├── core/
│   │   ├── profile.type.ts
│   │   ├── role.type.ts
│   │   ├── permission.type.ts
│   │   └── index.ts
│   ├── provider/
│   │   ├── provider.type.ts
│   │   ├── vehicle.type.ts
│   │   ├── kyc-case.type.ts
│   │   ├── kyc-document.type.ts
│   │   ├── nin-verification.type.ts
│   │   └── index.ts
│   ├── job/
│   │   ├── job.type.ts
│   │   ├── job-location.type.ts
│   │   ├── job-item.type.ts
│   │   ├── job-event.type.ts
│   │   └── index.ts
│   ├── dispatch/
│   │   ├── dispatch-batch.type.ts
│   │   ├── dispatch-offer.type.ts
│   │   ├── job-assignment.type.ts
│   │   └── index.ts
│   ├── marketplace/
│   │   ├── job-bid.type.ts
│   │   ├── bid-award.type.ts
│   │   └── index.ts
│   ├── wallet/
│   │   ├── wallet-account.type.ts
│   │   ├── transaction.type.ts
│   │   ├── payment-intent.type.ts
│   │   ├── refund.type.ts
│   │   └── index.ts
│   └── common/
│       ├── rating.type.ts
│       ├── sla-rule.type.ts
│       ├── job-milestone.type.ts
│       ├── otp.type.ts
│       ├── proof-of-delivery.type.ts
│       ├── waybill.type.ts
│       └── index.ts
└── dto/                        # GraphQL Input Types (DTOs)
    ├── core/
    │   ├── profile.dto.ts
    │   ├── role.dto.ts
    │   └── index.ts
    ├── provider/
    │   ├── create-provider.dto.ts
    │   ├── update-provider.dto.ts
    │   ├── create-vehicle.dto.ts
    │   ├── upload-kyc-document.dto.ts
    │   ├── verify-nin.dto.ts
    │   └── index.ts
    ├── job/
    │   ├── create-job.dto.ts
    │   ├── update-job.dto.ts
    │   ├── create-location.dto.ts
    │   ├── add-job-item.dto.ts
    │   ├── cancel-job.dto.ts
    │   └── index.ts
    ├── dispatch/
    │   ├── create-dispatch-batch.dto.ts
    │   ├── create-dispatch-offer.dto.ts
    │   ├── update-dispatch-offer.dto.ts
    │   ├── assign-job.dto.ts
    │   └── index.ts
    ├── marketplace/
    │   ├── create-bid.dto.ts
    │   ├── update-bid.dto.ts
    │   ├── award-bid.dto.ts
    │   └── index.ts
    ├── wallet/
    │   ├── create-wallet-account.dto.ts
    │   ├── create-transaction.dto.ts
    │   ├── create-payment-intent.dto.ts
    │   ├── request-refund.dto.ts
    │   └── index.ts
    └── common/
        ├── create-rating.dto.ts
        ├── create-milestone.dto.ts
        ├── create-proof-of-delivery.dto.ts
        ├── send-otp.dto.ts
        ├── verify-otp.dto.ts
        └── index.ts
```

## Custom Scalars

### GraphQLBigInt

Used for storing money amounts in minor units (e.g., cents, kobo).

- **Serialize**: Returns string representation
- **Parse**: Accepts string or number, converts to bigint

### DateTimeScalar

Standard ISO 8601 DateTime scalar.

### JSONScalar

For storing arbitrary JSON data in fields.

## Enums

### Core Enums

- `UserStatus`: ACTIVE, SUSPENDED, DELETED
- `PreferredLanguage`: EN, ZH_HANS

### Provider Enums

- `ProviderType`: INDIVIDUAL, COMPANY
- `ProviderStatus`: PENDING, ACTIVE, SUSPENDED, REJECTED
- `VehicleCategory`/`VehicleType`: BIKE, VAN, TRUCK
- `VehicleStatus`: ACTIVE, MAINTENANCE, INACTIVE
- `KYCCaseType`: INDIVIDUAL, COMPANY
- `KycCaseStatus`/`KYCCaseStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED, NEEDS_MORE_INFO
- `KycDocumentType`/`KYCDocumentType`: NIN, DRIVERS_LICENSE, VEHICLE_REG, PASSPORT, WAYBILL_TEMPLATE
- `KycDocumentStatus`/`KYCDocumentStatus`: UPLOADED, VERIFIED, REJECTED
- `NinVerificationStatus`/`NINVerificationStatus`: PENDING, VERIFIED, FAILED

### Job Enums

- `LocationType`: PICKUP, DROPOFF
- `JobMode`/`JobType`: DISPATCH, MARKETPLACE
- `JobStatus`: DRAFT, CREATED, BROADCASTING, ASSIGNED, EN_ROUTE_PICKUP, PICKED_UP, EN_ROUTE_DROPOFF, DELIVERED, COMPLETED, CANCELLED, EXPIRED
- `JobEventType`: CREATED, BROADCASTED, BID_PLACED, ASSIGNED, ACCEPTED, CANCELLED, PICKED_UP, DELIVERED, COMPLETED

### Dispatch Enums

- `DispatchBatchStatus`: OPEN, CLOSED, ASSIGNED, EXPIRED, CANCELLED
- `DispatchOfferStatus`: SENT, VIEWED, ACCEPTED, DECLINED, EXPIRED, CANCELLED
- `JobAssignmentStatus`: ACTIVE, COMPLETED, CANCELLED

### Marketplace Enums

- `BidStatus`: ACTIVE, WITHDRAWN, REJECTED, ACCEPTED

### Wallet Enums

- `WalletAccountStatus`: ACTIVE, SUSPENDED, CLOSED
- `TransactionStatus`: PENDING, COMPLETED, FAILED, REVERSED
- `TransactionType`: TOPUP, JOB_PAYMENT, PROVIDER_PAYOUT, COMMISSION, REFUND, ADJUSTMENT
- `PaymentIntentStatus`: INITIALIZED, PENDING, SUCCEEDED, FAILED, CANCELLED
- `RefundStatus`: PENDING, SUCCEEDED, FAILED

### Common Enums

- `RatingTargetType`: PROVIDER, CUSTOMER
- `MilestoneType`/`JobMilestoneType`: ACCEPTED, ARRIVED_PICKUP, PICKED_UP, ARRIVED_DROPOFF, DELIVERED, COMPLETED
- `MilestoneStatus`/`JobMilestoneStatus`: PENDING, REACHED, VERIFIED
- `OTPPurpose`: REGISTRATION, LOGIN, PASSWORD_RESET, TRANSACTION_VERIFY

## Key Types

### Provider Domain

- **Provider**: Core provider entity with rating, status, and wallet threshold
- **Vehicle**: Provider's vehicle with type, registration, and status
- **KYCCase**: KYC verification case management
- **KYCDocument**: Individual KYC documents
- **NINVerification**: Nigerian National Identification Number verification

### Job Domain

- **Job**: Main job entity with pricing, status, and timeline
- **JobLocation**: Pickup/dropoff locations with coordinates
- **JobItem**: Items being transported with dimensions and value
- **JobEvent**: Audit trail of job lifecycle events

### Dispatch Domain

- **DispatchBatch**: Batch of jobs for dispatch
- **DispatchOffer**: Offer sent to provider for a job
- **JobAssignment**: Active assignment of job to provider

### Marketplace Domain

- **JobBid**: Provider's bid on marketplace job
- **BidAward**: Record of awarded bid

### Wallet Domain

- **WalletAccount**: User's wallet with balance and escrow
- **Transaction**: Financial transaction record
- **PaymentIntent**: Payment gateway integration
- **Refund**: Refund processing record

### Common Domain

- **Rating**: Star ratings with detailed scores
- **SLARule**: Service level agreement rules
- **JobMilestone**: Milestone tracking with penalties
- **OTP**: One-time password for verification
- **ProofOfDelivery**: POD with signature and photos
- **Waybill**: Shipping document with QR/barcode

## Updated Resolvers

All existing resolvers have been updated to use the new types and DTOs:

- `JobsResolver`: Uses Job, JobLocation, JobItem types
- `DispatchResolver`: Uses DispatchBatch, DispatchOffer, JobAssignment
- `KycResolver`: Uses KYCCase, KYCDocument, NINVerification
- `MarketPlaceResolver`: Uses JobBid, BidAward
- `WalletResolver`: Uses WalletAccount, Transaction, PaymentIntent, Refund

## Usage Examples

### Creating a Job

```typescript
import { CreateJobDto } from './graphql';

const createJobInput: CreateJobDto = {
  customerId: 'user_123',
  jobType: JobType.MARKETPLACE,
  totalPriceMinor: BigInt(500000), // ₦5,000.00 in kobo
  currency: 'NGN',
  pickupTime: new Date('2024-01-15T10:00:00Z'),
  customerNotes: 'Handle with care',
};
```

### Creating a Bid

```typescript
import { CreateBidDto } from './graphql';

const bidInput: CreateBidDto = {
  jobId: 'job_123',
  providerId: 'provider_456',
  bidAmountMinor: BigInt(450000), // ₦4,500.00
  currency: 'NGN',
  proposedPickupTime: new Date('2024-01-15T09:00:00Z'),
  coverLetter: 'I can deliver this quickly and safely',
};
```

## Notes

- All money amounts use `GraphQLBigInt` scalar stored in minor units (kobo)
- Nullable fields are marked with `{ nullable: true }`
- All enums are registered with GraphQL using `registerEnumType`
- Enum aliases provided for compatibility (e.g., `VehicleType` = `VehicleCategory`)
- DTOs use `@InputType()` decorator, Types use `@ObjectType()` decorator
- External package `graphql-scalars` used for GraphQLJSON type

## Compilation Status

✅ All TypeScript compilation errors resolved
✅ All GraphQL types properly defined
✅ All DTOs properly defined
✅ All resolvers updated with correct types
✅ All enums registered
✅ Custom scalars implemented
