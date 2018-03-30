import { ObjectId } from 'Radar-shared/interfaces/base.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';

import * as EventInterfaces from 'app/interfaces/events.interface';

import { Socket, Event } from 'app/classes/sharedEvents';

import Request = EventInterfaces.Socket.Fetch.Request;
import Response = EventInterfaces.Socket.Fetch.Response;
import IInternal = EventInterfaces.Internal;
import messengerType = IInternal.messengerType;

export { Socket as Socket }
export { Event as Event }

export namespace Internal {
    export abstract class InternalEvent extends Event implements IInternal.IInternalEvent {
        constructor(className: string = 'InternalEvent', public destination: messengerType) {
            super(className);
        }
    }

    export class SetEvent extends InternalEvent implements IInternal.ISetEvent {
        constructor(destination: messengerType, public props: IInternal.propsType) {
            super('SetEvent', destination);
        }
    }

    export class CallEvent extends InternalEvent implements IInternal.ICallEvent {
        constructor(destination: messengerType, public methods: IInternal.methodCallType) {
            super('CallEvent', destination);
        }
    }

    export class ReadyEvent extends InternalEvent implements IInternal.IReadyEvent {
        constructor(destination: messengerType, public sender: messengerType) {
            super('ReadyEvent', destination);
        }
    }

    export abstract class FormEvent extends InternalEvent implements IInternal.Form.IFormEvent {
        constructor(className: string = 'FormEvent', destination: messengerType) {
            super(className, destination);
        }
    }

    export class ShowFormEvent extends FormEvent implements IInternal.Form.IShowFormEvent {
        constructor(destination: messengerType) {
            super('ShowFormEvent', destination);
        }
    }

    export class HideFormEvent extends FormEvent implements IInternal.Form.IHideFormEvent {
        constructor(destination: messengerType, public keyPressInfo?: KeyboardEvent) {
            super('HideFormEvent', destination);
        }
    }
    
    export abstract class UpdateEvent extends InternalEvent implements IInternal.Updates.IUpdateEvent {
        constructor(className: string = 'UpdateEvent', destination: messengerType) {
            super(className, destination);
        }
    }

    export class UpdateScriptStatusEvent extends UpdateEvent implements IInternal.Updates.IUpdateScriptStatusEvent {
        constructor(destination: messengerType, public props: any) {
            super('UpdateScriptStatusEvent', destination);
        }
    }
}