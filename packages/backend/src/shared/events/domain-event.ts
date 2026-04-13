export interface DomainEvent {
  id?: string;
  tenantId: string;
  eventType: EventType;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

export type EventType =
  | 'BillConfirmed'
  | 'PaymentReceived'
  | 'SampleAccessioned'
  | 'ResultSignedOff'
  | 'DailyBranchCloseCompleted';

export type EventHandler = (event: DomainEvent) => Promise<void>;
