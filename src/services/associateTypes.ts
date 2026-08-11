import type { JobStatus } from '../constants/fulfillmentStatus';

export interface EngravingJob {
  id: string;
  order_id: string;
  station_id?: string | null;
  status: JobStatus;
  error_message?: string | null;
  attempts: number;
  queued_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaserStation {
  id: string;
  store_id: string;
  name: string;
  status: 'offline' | 'online' | 'busy' | 'error';
  last_heartbeat_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function isStationOnline(station: LaserStation): boolean {
  if (station.status === 'offline' || station.status === 'error') {
    return false;
  }
  if (!station.last_heartbeat_at) {
    return false;
  }
  const heartbeatMs = Date.now() - new Date(station.last_heartbeat_at).getTime();
  return heartbeatMs < 90_000;
}
