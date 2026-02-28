export const DISPATCH_QUEUE_NAME = 'dispatch';
export const MAINTENANCE_QUEUE_NAME = 'maintenance';

export const DISPATCH_SHIPMENT_JOB = 'dispatch.shipment';
export const DISPATCH_RECONCILE_DUE_JOB = 'dispatch.reconcile_due';
export const KYC_CLEANUP_JOB = 'kyc.cleanup';

export type DispatchShipmentJobTrigger = 'created' | 'scheduled' | 'reconcile';

export type DispatchShipmentJobPayload = {
  shipmentId: string;
  trigger: DispatchShipmentJobTrigger;
};

export type DispatchReconcileJobPayload = {
  reason: 'periodic';
};

export type KycCleanupJobPayload = {
  trigger: 'startup' | 'interval';
};
