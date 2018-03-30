import * as Child_Process from 'child_process';

import { ServerBase } from 'classes/serverBase';
import * as Events from 'classes/events';

import { IEvent } from 'Radar-shared/interfaces/events.interface';

import * as EventInterfaces from 'interfaces/events.interface';

const EVENT_BUFFER_INTERVAL_SECONDS: number = 1;

/**
 *  Class that stores events received and parsed by the app, and sends events to the forked event handler process.

 *  Forked from the app process to asynchronously manage the passing of events between the app and the event handler.
 *  
 *  The net effect of this setup is that the event handling ends up being pseudo-synchronous, because the event handler handles events
 *  synchronously and this queue only gives the handler an event once it finishes with the previous one.
 */
class QueueController extends ServerBase {
    private eventHandler: Child_Process.ChildProcess;
    private eventQueue: IEvent[] = [];
    private eventBuffer: IEvent[] = [];
    private timer: NodeJS.Timer;
    private isProcessing: boolean = false;

    constructor(private process: NodeJS.Process) {
        super('QueueController', ['magenta']);
        this.displayLogs = false;
        this.eventHandler = Child_Process.fork('./dist/classes/eventHandler');

        var __this: QueueController = this;
        this.eventHandler.on('message', (message: EventInterfaces.Socket.ISocketEvent): void => {
            __this.onEventHandlerMessage(message);
        });
        this.process.on('message', (message: EventInterfaces.Socket.ISocketEvent): void => {
            __this.onAppMessage(message);
        });

        this.setEventBufferInterval();
    }

    private setEventBufferInterval(): void {
        var __this: QueueController = this;
        this.timer = setInterval((): void => {
            __this.sendNextEventToClient();
        }, EVENT_BUFFER_INTERVAL_SECONDS * 1000);
    }

    private sendNextEventToClient(): void {
        if (this.eventBuffer.length > 0) {
            this.process.send(this.eventBuffer.shift());
        }
    }

    private onAppMessage(message: EventInterfaces.Socket.ISocketEvent): void {
        var event: IEvent = this.parseEvent(message);
        if (event instanceof Events.Internal.InternalEvent) {
            this.onInternalEventFromApp(event);
        } else {
            this.log('Received', event ? event.constructor.name : 'message', 'from App', event ? '' : ':' + message);

            if (event) {
                if (!this.isProcessing) {
                    this.log('Not processing; forwarding event to EventHandler');
                    this.isProcessing = true;
                    this.eventHandler.send(event);
                } else {
                    this.log('Already processing; enqueueing event (' + this.eventQueue.length + ')');
                    this.eventQueue.push(event);
                }
            }
        }
    }

    private onInternalEventFromApp(event: EventInterfaces.Internal.IInternalEvent): void {
        if (event instanceof Events.Internal.LogsEvent) {
            this.handleLogEvent(event);
        } else {
            this.logError('Error: unhandled internal event type;', event);
        }
    }

    private handleLogEvent(event: EventInterfaces.Internal.ILogsEvent): void {
        if (event.logs.hasOwnProperty('all')) {
            this.displayLogs = true;
            this.log('QueueController logging turned', event.logs.all ? 'on' : 'off');
            this.displayLogs = event.logs.all;
            this.eventHandler.send(new Events.Internal.LogsEvent(event.logs));
        } else if (event.logs.hasOwnProperty('queueController')) {
            this.displayLogs = true;
            this.log('QueueController logging turned', event.logs.queueController ? 'on' : 'off');
            this.displayLogs = event.logs.queueController;
        } else if (event.logs.hasOwnProperty('eventHandler')) {
            this.eventHandler.send(new Events.Internal.LogsEvent(event.logs));
        } else if (event.logs.hasOwnProperty('states')) {
            this.logState();
            this.eventHandler.send(new Events.Internal.LogsEvent({ states: null }));
        } else {
            this.eventHandler.send(new Events.Internal.LogsEvent(event.logs));
        }
    }

    private onEventHandlerMessage(message: IEvent): void {
        var event: IEvent = this.parseEvent(message);
        this.log('Received', event ? event.constructor.name : 'message', 'from EventHandler', event ? '' : ':' + message);

        if (event instanceof Events.Internal.DoneHandlingEvent) {
            if (this.eventQueue.length > 0) {
                this.log('Forwarding next event in queue to EventHandler (' + (this.eventQueue.length - 1) + ')');
                this.eventHandler.send(this.eventQueue.shift());
            } else {
                this.log('Finished processing all events in queue');
                this.isProcessing = false;
            }
        } else if (event instanceof Events.Internal.ReadyEvent) {
            if (event.readyClassName == 'eventHandler') {
                this.process.send(new Events.Internal.ReadyEvent('queueController'));
            } else {
                this.logError('Error: unhandled controller class name;', event);
            }
        } else if (event instanceof Events.Socket.SocketEvent) {
            this.eventBuffer.push(event);
        } else {
            this.logError('Error: unhandled event type;', event);
        }
    }
}

const queueController: QueueController = new QueueController(process);