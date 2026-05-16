import { DomainEvent } from './DomainEvent';

type EventHandler = (event: DomainEvent) => void;

export class EventDispatcher {
  private static instance: EventDispatcher;
  private handlers: Map<string, EventHandler[]> = new Map();

  static getInstance(): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher();
    }
    return EventDispatcher.instance;
  }

  register(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  dispatch(event: DomainEvent): void {
    const handlers = this.handlers.get(event.eventType) ?? [];
    handlers.forEach((handler) => handler(event));
  }

  clear(): void {
    this.handlers.clear();
  }
}
