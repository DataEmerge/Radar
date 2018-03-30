import { OnInit, OnDestroy } from '@angular/core';
import * as JSONStableStringify from 'json-stable-stringify';
import * as Moment from 'moment-timezone';

import { EventType, IEvent } from 'Radar-shared/interfaces/events.interface';

import * as EventInterfaces from 'app/interfaces/events.interface';

import { SharedBase } from 'app/classes/sharedBase';

import * as Components from 'app/classes/components';
import * as Events from 'app/classes/events';

export class ClientBase extends SharedBase implements OnInit, OnDestroy {
    protected logTextFormatting: string = 'color:rgb(171,171,171)';
    protected logEventTextFormatting: string = 'color:rgb(171,171,171)';

    constructor(public className: string = 'ClientBase') {
        super(className);
        this.displayLogs = true;
    }

    public ngOnInit(): void {

    }

    public ngOnDestroy(): void {

    }

    protected log(message: any, ...args: any[]): void {
        if (this.displayLogs) {
            console.log('%c' + '[' + this.className + '] ' + message, this.logTextFormatting, ...args);
        }
    }

    protected logWarn(message: any, ...args: any[]): void {
        this.log(message, ...args); // TODO: add some warnings in places? and do a warning format too
    }

    protected logEvent(message: any, ...args: any[]): void {
        if (this.displayLogs) {
            console.log('%c' + '[' + this.className + '] ' + message, this.logEventTextFormatting, ...args);
        }
    }

    protected logError(message: any, ...args: any[]): void {
        console.error('[' + this.className + '] ' + message, ...args); // always log errors
    }

    protected getNewEvent(eventType: EventType, className, ...args: any[]): IEvent {
        return new Events[eventType][className](...args);
    }

    protected getEventConstructor(eventType: EventType, className: string): Function {
        return Events[eventType][className];
    }

    protected getNewComponent(className, ...args: any[]): IEvent {
        if (Components[className]) {
            return new Components[className](...args);
        } else if (Events.Internal[className]) {
            return new Events.Internal[className](...args);
        } else if (Events.Socket[className]) {
            return new Events.Socket[className](...args);
        }
    }

    protected getComponentConstructor(className: string): Function {
        if (Components[className]) {
            return Components[className];
        } else if (Events.Internal[className]) {
            return Events.Internal[className];
        } else if (Events.Socket[className]) {
            return Events.Socket[className];
        }
    }

    protected equalObjects(o1: any, o2: any): boolean {
        return (JSONStableStringify(o1) === JSONStableStringify(o2));
    }

    protected setProperties(props: EventInterfaces.Internal.propsType): void {
        this.updateProps(this, props);
    }

    protected callMethods(methods: EventInterfaces.Internal.methodCallType): void {
        for (var method in methods) {
            if (methods.hasOwnProperty(method)) {
                var params: any[] = [];
                if (methods[method] !== Object(methods[method])) {
                    params.push(methods[method]);
                } else {
                    for (var param in methods[method]) {
                        if (methods[method].hasOwnProperty(param)) {
                            params.push(methods[method][param]);
                        }
                    }
                }
                this[method](...params);
            }
        }
    }

    protected isDescendant(child: Element, parent: Element): boolean {
        if (child === parent) {
            return true;
        }

        var element = child.parentElement;
        while (element != null) {
            if (element === parent) {
                return true;
            }
            element = element.parentElement;
        }

        return false;
    }
}