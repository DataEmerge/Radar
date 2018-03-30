import { ObjectId } from 'Radar-shared/interfaces/base.interface';
import { IEvent, Socket } from 'Radar-shared/interfaces/events.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';

export { Socket as Socket };

export namespace Internal {
    export type controllerClasses = 'queueController' | 'eventHandler' | 'fetchController' | 'scriptStatusController';
    export type logClasses = 'reset' | 'states' | 'all' | 'app' | controllerClasses | 'mongoose';

    export type logValues = {
        states?: null;
        all?: boolean;
        app?: boolean;
        queueController?: boolean;
        eventHandler?: boolean;
        fetchController?: boolean;
        mappingController?: boolean;
        loginController?: boolean;
        mongoose?: boolean;
    };

    export interface IInternalEvent extends IEvent {

    }

    export interface ILogsEvent extends IInternalEvent {
        logs: logValues;
    }

    export interface IReadyEvent extends IInternalEvent {
        readyClassName: controllerClasses;
    }
}