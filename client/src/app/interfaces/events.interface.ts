import { ObjectId } from 'Radar-shared/interfaces/base.interface';
import { IEvent, Socket } from 'Radar-shared/interfaces/events.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';

import { serviceType } from 'app/interfaces/service.interface';
import { formType, modalType } from 'app/interfaces/form.interface';

export { Socket as Socket };

export namespace Internal {
    export type messengerType = ObjectId | ObjectId[] | serviceType | 'AppComponent' | 'allScriptStatuses' | 'allClients' | formType | modalType;
    export interface IInternalEvent extends IEvent {
        destination: messengerType;
    }

    export type propsType = { [prop: string]: any };
    export interface ISetEvent extends IInternalEvent {
        props: propsType;
    }

    export type methodCallType = { [methodName: string]: { [parameterName: string]: any } };
    export interface ICallEvent extends IInternalEvent {
        methods: methodCallType;
    }

    export interface IReadyEvent extends IInternalEvent {
        sender: messengerType;
    }

    export namespace Form {
        export interface IFormEvent extends IInternalEvent {

        }

        export interface IShowFormEvent extends IFormEvent {

        }

        export interface IHideFormEvent extends IFormEvent {
            keyPressInfo?: KeyboardEvent;
        }
    }

    export namespace Updates {
        export interface IUpdateEvent extends IInternalEvent {

        }

        export interface IUpdateScriptStatusEvent extends IUpdateEvent {
            props: any;
        }
    }
}