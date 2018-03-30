import { ObjectId } from 'Radar-shared/interfaces/base.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';

import * as EventInterfaces from 'interfaces/events.interface';

import { Socket, Event } from 'classes/sharedEvents';

export { Socket as Socket }
export { Event as Event }

export namespace Internal {
    export abstract class InternalEvent extends Event implements EventInterfaces.Internal.IInternalEvent {
        constructor(className: string = 'InternalEvent') {
            super(className);
        }
    }

    export class LogsEvent extends InternalEvent implements EventInterfaces.Internal.ILogsEvent {
        constructor(public logs: EventInterfaces.Internal.logValues) {
            super('LogsEvent');
        }
    }

    export class DoneHandlingEvent extends InternalEvent {
        constructor(public handledEventName: string, public socketID: string) {
            super('DoneHandlingEvent');
        }
    }

    export class ReadyEvent extends InternalEvent implements EventInterfaces.Internal.IReadyEvent {
        constructor(public readyClassName: EventInterfaces.Internal.controllerClasses) {
            super('ReadyEvent');
        }
    }
}