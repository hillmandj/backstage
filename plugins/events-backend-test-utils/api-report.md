## API Report File for "@backstage/plugin-events-backend-test-utils"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts
import { EventBroker } from '@backstage/plugin-events-node';
import { EventParams } from '@backstage/plugin-events-node';
import { EventPublisher } from '@backstage/plugin-events-node';
import { EventSubscriber } from '@backstage/plugin-events-node';

// @public (undocumented)
export class TestEventBroker implements EventBroker {
  // (undocumented)
  publish(params: EventParams): Promise<void>;
  // (undocumented)
  readonly published: EventParams[];
  // (undocumented)
  subscribe(
    ...subscribers: Array<EventSubscriber | Array<EventSubscriber>>
  ): void;
  // (undocumented)
  readonly subscribed: EventSubscriber[];
}

// @public (undocumented)
export class TestEventPublisher implements EventPublisher {
  // (undocumented)
  get eventBroker(): EventBroker | undefined;
  // (undocumented)
  setEventBroker(eventBroker: EventBroker): Promise<void>;
}

// @public (undocumented)
export class TestEventSubscriber implements EventSubscriber {
  constructor(name: string, topics: string[]);
  // (undocumented)
  readonly name: string;
  // (undocumented)
  onEvent(params: EventParams): Promise<void>;
  // (undocumented)
  readonly receivedEvents: Record<string, EventParams[]>;
  // (undocumented)
  supportsEventTopics(): string[];
  // (undocumented)
  readonly topics: string[];
}
```