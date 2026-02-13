# OYA-NA Express: MVP Pages and Responsibilities

## Platform Split

- **Web (Next.js, shared shell):** Customer + Admin (role-based routes and permissions)
- **Mobile (React Native):** Provider app (bike riders, van drivers, truck owners)
- **Auth:** Supabase
- **Business APIs:** NestJS + Prisma + GraphQL (Apollo)

## Core Domain Language

- Use **Shipment** as the canonical delivery unit across dispatch and marketplace.
- Use **Shipment Mode**:
  - `DISPATCH` for bike/van auto dispatch
  - `MARKETPLACE` for trucking bid flow

## Shared Web App (Next.js)

### Common

- `/auth/sign-in`: Email/password + OTP fallback
- `/auth/sign-up`: Role-aware onboarding (customer/admin invite path)
- `/settings/profile`: Personal profile and security settings
- `/settings/addresses`: Address book for pickup/dropoff presets

### Customer Pages

- `/dashboard`: Active shipments, recent activity, wallet balance, quick actions
- `/shipments/new`: Create shipment request (instant/scheduled, bike/van/truck)
- `/shipments/:id`: Shipment timeline, status, documents, support actions
- `/shipments/:id/track`: Live map + ETA + milestone stream
- `/marketplace/:id/bids`: Compare trucking bids and award one
- `/shipments/history`: Completed/cancelled shipments with filters
- `/wallet`: Balance, escrow visibility, funding, transaction history
- `/wallet/checkout/:shipmentId`: Payment confirmation for shipment
- `/support/disputes`: Create and monitor disputes

### Admin Pages

- `/admin/overview`: Ops KPIs (open shipments, SLA breach count, revenue)
- `/admin/shipments/live`: Real-time shipment operations board
- `/admin/dispatch`: Dispatch queue and assignment control
- `/admin/marketplace`: Truck bid marketplace monitoring and interventions
- `/admin/providers`: Provider list, status, and quality scores
- `/admin/providers/:id/kyc`: KYC case reviews and document decisions
- `/admin/fraud`: Fraud flags, suspicious activity triage
- `/admin/disputes`: Dispute and resolution workflow
- `/admin/sla`: SLA rules, breach analytics, penalty tracking
- `/admin/finance`: Escrow, payouts, refunds, reconciliation
- `/admin/config`: Pricing, commissions, notification, and policy settings

## Provider App (React Native)

- `Auth Stack`: Sign-in, OTP verification, profile completion
- `Home`: Availability toggle, active shipment summary, earnings snapshot
- `Offers Inbox`: Dispatch offers and marketplace opportunities
- `Shipment Details`: Accept/decline, milestones, proof upload, completion
- `Navigation`: Route guidance and live tracking handoff
- `Marketplace Bids`: Submit/update/withdraw truck bids
- `Wallet & Earnings`: Balance, payouts, transaction history
- `KYC`: Upload docs and track verification status
- `Notifications`: Operational alerts and reminders
- `Support`: Incident and dispute reporting

## Page-to-GraphQL Focus (MVP)

- `Shipment` CRUD and timeline:
  - `shipments`, `shipment`, `createShipment`, `updateShipment`, `cancelShipment`
- Dispatch:
  - `createDispatchBatch`, `sendDispatchOffer`, `respondToDispatchOffer`
  - `createShipmentAssignment`, `updateShipmentAssignment`, `cancelShipmentAssignment`
- Marketplace:
  - `shipmentBids`, `createShipmentBid`, `updateShipmentBid`, `awardShipmentBid`
- Wallet:
  - `createWalletAccount`, `createWalletTransaction`, `initiatePayment`, `initiateRefund`
- Trust/SLA:
  - Milestones, POD, waybills, ratings, penalties, disputes (next pass)

## MVP Build Order (4-6 Weeks)

1. Auth + profile + address book
2. Shipment creation and dispatch lifecycle (bike/van)
3. Marketplace bid flow (truck)
4. Wallet, escrow, and refunds
5. Admin SLA/fraud/dispute operations
