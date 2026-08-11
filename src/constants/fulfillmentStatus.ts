export type JobStatus =
  | 'queued'
  | 'assigned'
  | 'marking'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type OrderChannel = 'app' | 'pos';

export type FulfillmentStatus =
  | 'submitted'
  | 'queued'
  | 'marking'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'factory_sent'
  | 'factory_in_production'
  | 'shipped';

export interface FulfillmentStatusMeta {
  label: string;
  tone: 'neutral' | 'active' | 'success' | 'error';
}

const POS_STATUSES: FulfillmentStatus[] = ['submitted', 'queued', 'marking', 'completed', 'failed', 'cancelled'];
const APP_STATUSES: FulfillmentStatus[] = [
  'submitted',
  'factory_sent',
  'factory_in_production',
  'shipped',
  'completed',
  'failed',
  'cancelled',
];

const STATUS_LABELS: Record<FulfillmentStatus, string> = {
  submitted: 'Submitted',
  queued: 'Queued for Laser',
  marking: 'Engraving…',
  completed: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
  factory_sent: 'Sent to Factory',
  factory_in_production: 'Factory Production',
  shipped: 'Shipped',
};

export function getFulfillmentStatusMeta(status: string, channel: OrderChannel = 'pos'): FulfillmentStatusMeta {
  const label = STATUS_LABELS[status as FulfillmentStatus] ?? status;
  if (status === 'completed' || status === 'shipped') {
    return { label, tone: 'success' };
  }
  if (status === 'failed' || status === 'cancelled') {
    return { label, tone: 'error' };
  }
  if (
    status === 'queued' ||
    status === 'marking' ||
    status === 'factory_sent' ||
    status === 'factory_in_production'
  ) {
    return { label, tone: 'active' };
  }
  if (channel === 'app' && status === 'submitted') {
    return { label: 'Submitted to GIVA', tone: 'neutral' };
  }
  return { label, tone: 'neutral' };
}

export function isTerminalFulfillmentStatus(status: string): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'shipped';
}

export function isActiveLaserStatus(status: string): boolean {
  return status === 'queued' || status === 'marking';
}

export function isAppChannel(channel: string): channel is 'app' {
  return channel === 'app';
}

export function normalizeFulfillmentStatus(status: string, channel: OrderChannel = 'pos'): FulfillmentStatus {
  const allowed = channel === 'app' ? APP_STATUSES : POS_STATUSES;
  return (allowed.includes(status as FulfillmentStatus) ? status : 'submitted') as FulfillmentStatus;
}
