import { prisma } from '../../config/database';
import { DomainEvent, EventHandler, EventType } from './domain-event';
import { generateId } from '../utils/id-generator';

const handlers = new Map<EventType, EventHandler[]>();

export function registerEventHandler(eventType: EventType, handler: EventHandler) {
  const existing = handlers.get(eventType) || [];
  existing.push(handler);
  handlers.set(eventType, existing);
}

/**
 * Emits a domain event: persists to outbox table, then invokes in-process handlers.
 * In a full system, handlers would be async via a worker queue.
 */
export async function emitDomainEvent(event: DomainEvent): Promise<void> {
  const eventId = generateId();

  // Persist to outbox
  await prisma.domain_events.create({
    data: {
      id: eventId,
      tenant_id: event.tenantId,
      event_type: event.eventType,
      aggregate_type: event.aggregateType,
      aggregate_id: event.aggregateId,
      payload: event.payload,
      status: 'PENDING',
    },
  });

  // Invoke in-process handlers (prototype: synchronous)
  const eventHandlers = handlers.get(event.eventType) || [];
  for (const handler of eventHandlers) {
    try {
      await handler({ ...event, id: eventId });
      await prisma.domain_events.update({
        where: { id: eventId },
        data: { status: 'PROCESSED', processed_at: new Date() },
      });
    } catch (error) {
      console.error(`Event handler failed for ${event.eventType}:`, error);
      await prisma.domain_events.update({
        where: { id: eventId },
        data: { status: 'FAILED' },
      });
    }
  }
}
