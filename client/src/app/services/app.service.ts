import { Injectable, Injector } from '@angular/core';
import { Subject, Observable, Subscriber } from 'rxjs';
import * as SocketIO_Client from 'socket.io-client';

import { ObjectId } from 'Radar-shared/interfaces/base.interface';

import * as ComponentInterfaces from 'app/interfaces/components.interface';
import * as EventInterfaces from 'app/interfaces/events.interface';

import * as Components from 'app/classes/components';

import * as Events from 'app/classes/events';

import { BaseService } from 'app/services/base.service';
import { FilterService } from 'app/services/filter.service';
import { ScriptStatusService } from 'app/services/scriptStatus.service';
import { ModalService } from 'app/services/modal.service';

import Errors = EventInterfaces.Socket.Errors;
import Updates = EventInterfaces.Socket.Updates;
import Fetch = EventInterfaces.Socket.Fetch;
import Models = ComponentInterfaces.Models;

//import { log } from 'util'; // TODO: figure out if this is better than the custom logging stuff (if it is, use it)

const LOCAL_RADAR_SERVER_PORT: number = 9013;
const LOCALHOST_URL: string = 'http://localhost:' + LOCAL_RADAR_SERVER_PORT;
const LIVE_URL: string = 'https://radar.dataemerge.com';

/**
 *  Service to connect to and communicate with the server and route/handle received messages.
 *
 *  It designates itself as ready once the AppComponent has signaled that it is ready and once this service has connected to the server.
 */
@Injectable()
export class AppService extends BaseService {
    private isLocal: boolean = false;
    private displaySocketLogs: boolean = false;
    private appIsReady: boolean = false;
    private hasConnected: boolean = false;

    private socketURL: string = this.isLocal ? LOCALHOST_URL : LIVE_URL;
    //private socketURL: string = '/';
    private socketOptions: SocketIOClient.ConnectOpts = this.isLocal ? {} : { secure: true };
    private socket: SocketIOClient.Socket;

    public get Socket(): SocketIOClient.Socket {
        return this.socket;
    }

    constructor(
        private filterService: FilterService,
        private scriptStatusService: ScriptStatusService,
        private modalService: ModalService) {
        super('AppService');
        this.displayLogs = true;
        this.logEventTextFormatting = 'color:mediumpurple';

        this.initializeSocket();
    }

    public onAppReady(): void {
        this.appIsReady = true;
        this.onReady();
    }

    private onReady(): void {
        if (this.appIsReady && this.hasConnected) {
            this.source.next(new Events.Internal.ReadyEvent('AppComponent', 'AppService'));
        }
    }

    private initializeSocket(): void {
        //this.socketOptions.autoConnect = false;
        this.socketOptions.reconnectionAttempts = 0;
        this.socketOptions.reconnection = false;
        this.socket = SocketIO_Client(this.socketURL, this.socketOptions);
        this.registerSocketConnectionEvents();
    }

    private registerSocketConnectionEvents(): void {
        var __this: AppService = this;

        this.socket.on('connect', (): void => {
            __this.hasConnected = true;
            __this.onReady();
            __this.logSocket('[Socket] connect');
        });

        this.socket.on('eventFromServer', (eventObject: any): void => { __this.onServerEvent(eventObject); });

        this.socket.on('disconnect', (reason: any): void => { __this.logSocket('[Socket] disconnect:', reason); });
        this.socket.on('error', (error: any): void => { __this.logSocketError('[Socket] error:', error); });

        this.socket.io.on('connect_error', (error: Error): void => {
            __this.logSocketError('[IO] connect_error:', error);
            __this.socketOptions.autoConnect = false; // TODO: if reconnect error log issue ever gets fixed, can omit this

            var stackTrace: string[] = new Error(error.message).stack.substring(7).split('\n');
            __this.source.next(new Events.Internal.SetEvent('AppComponent', {
                errorMessages: [
                    'Error: could not connect to server',
                    stackTrace,
                    'Did Andrew or Alex forget to change isLocal to false?',
                    'Please wait a couple minutes and refresh the page. If the problem persists, please contact the DataEmerge DevTeam.'
                ]
            }));
        });
        this.socket.io.on('connect_timeout', (timeout: number): void => { __this.logSocket('[IO] connect_timeout:', timeout); });
        this.socket.io.on('reconnect', (attemptNumber: number): void => { __this.logSocket('[IO] reconnect:', attemptNumber); });
        this.socket.io.on('reconnecting', (attemptNumber: number): void => { __this.logSocket('[IO] reconnecting:', attemptNumber); });
        this.socket.io.on('reconnect_attempt', (attemptNumber: number): void => { __this.logSocket('[IO] reconnect_attempt:', attemptNumber); });
        this.socket.io.on('reconnect_failed', (error: any): void => { __this.logSocketError('[IO] reconnect_failed:', error); });
        this.socket.io.on('reconnect_error', (error: any): void => { __this.logSocketError('[IO] reconnect_error:', error); });
    }

    private onServerEvent(eventObject: any): void {
        const MESSAGE: string = 'AppService received an event from the server';
        var event: EventInterfaces.Socket.ISocketEvent = <EventInterfaces.Socket.ISocketEvent>this.constructEvent(eventObject, 'Socket');

        if (event) {
            this.logEvent(MESSAGE + ':', event);
            this.handleEvent(event);
        } else {
            this.logEvent(MESSAGE);
            this.logError('Error: could not construct event;', event);
            // TODO: send error to app here to notify user
        }
    }

    private sendEventToServer(event: EventInterfaces.Socket.ISocketEvent, ...otherArgs: any[]): void {
        event.socketID = this.socket.id;
        this.socket.emit('eventFromClient', event, ...otherArgs);
    }

    public requestScriptStatuses(): void {
        this.sendEventToServer(new Events.Socket.FetchScriptStatusesRequestEvent(this.socket.id));
    }

    public requestScriptEvents(_project?: ObjectId): void {
        this.sendEventToServer(new Events.Socket.FetchScriptEventsRequestEvent(this.socket.id, _project));
    }

    private handleEvent(event: EventInterfaces.Socket.ISocketEvent): boolean {
        if (event instanceof Events.Socket.SocketEvent) {
            return this.handleSocketEvent(event);
        } else {
            this.logError('Error: client shouldn\'t receive a non-SocketEvent:', event);
            return false;
        }
    }

    private handleSocketEvent(event: EventInterfaces.Socket.ISocketEvent): boolean {
        if (event instanceof Events.Socket.FetchEvent) {
            return this.handleFetchEvent(event);
        } else if (event instanceof Events.Socket.ErrorEvent) {
            return this.handleErrorEvent(event);
        } else if (event instanceof Events.Socket.UpdateEvent) {
            return this.handleUpdateEvent(event);
        } else {
            this.logError('Error: client shouldn\'t receive an abstract SocketEvent:', event);
            return false;
        }
    }

    private handleFetchEvent(event: EventInterfaces.Socket.Fetch.IFetchEvent): boolean {
        if (event instanceof Events.Socket.FetchResponseEvent) {
            return this.handleFetchResponseEvent(event);
        } else if (event instanceof Events.Socket.FetchRequestEvent) {
            this.logError('Error: client shouldn\'t receive a FetchRequestEvent:', event);
            return false;
        } else {
            this.logError('Error: client shouldn\'t receive an abstract FetchEvent:', event);
            return false;
        }
    }

    private handleFetchResponseEvent(event: EventInterfaces.Socket.Fetch.Response.IFetchResponseEvent): boolean {
        if (event instanceof Events.Socket.FetchCurrentUserResponseEvent) {
            this.source.next(new Events.Internal.SetEvent('AppComponent', { currentUser: event.currentUser }));
        } else if (event instanceof Events.Socket.FetchScriptStatusesResponseEvent) {
            this.scriptStatusService.setScriptStatuses(event.scriptStatuses);
        } else if (event instanceof Events.Socket.FetchScriptEventsResponseEvent) {
            this.modalService.sendEventToForm(new Events.Internal.SetEvent('EventLogForm', { scriptEvents: event.scriptEvents }));
        } else {
            this.logError('Error: client shouldn\'t receive an abstract FetchResponseEvent:', event);
            return false;
        }
        return true;
    }

    private handleErrorEvent(event: Errors.IErrorEvent): boolean {
        if (event instanceof Events.Socket.ServerErrorEvent) {
            return this.handleServerErrorEvent(event);
        } else if (event instanceof Events.Socket.ClientErrorEvent) {
            this.logError('Error: client shouldn\'t receive a ClientErrorEvent:', event);
            return false;
        } else {
            this.logError('Error: client shouldn\'t receive an abstract ErrorEvent:', event);
            return false;
        }
    }

    private handleServerErrorEvent(event: Errors.Server.IServerErrorEvent): boolean {
        console.log(event.toString());
        this.source.next(new Events.Internal.SetEvent('AppComponent', { errorMessages: [event.toString()] }));
        return true;
    }

    private handleUpdateEvent(event: Updates.IUpdateEvent): boolean {
        if (event instanceof Events.Socket.UpdateScriptStatusEvent) {
            this.scriptStatusService.updateScriptStatus(event);
        } else {
            this.logError('Error: client shouldn\'t receive an abstract UpdateEvent:', event);
            return false;
        }
    }

    private logSocket(message: string, ...args: any[]): void {
        if (this.displaySocketLogs) {
            this.log(message, ...args);
        }
    }

    private logSocketError(message: string, ...args: any[]): void {
        if (this.displaySocketLogs) {
            this.logError(message, ...args);
        }
    }
}