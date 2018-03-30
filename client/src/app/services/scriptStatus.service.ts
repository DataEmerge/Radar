import { Injectable, Injector } from '@angular/core';
import { Subject, Observable } from 'rxjs';

import { ObjectId } from 'Radar-shared/interfaces/base.interface';

import * as EventInterfaces from 'app/interfaces/events.interface';
import * as ComponentInterfaces from 'app/interfaces/components.interface';
import { IService } from 'app/interfaces/service.interface';

import * as Components from 'app/classes/components';
import * as Events from 'app/classes/events';

import { ClientBase } from 'app/classes/clientBase';

import { InternalService } from 'app/services/base.service';
import { AppService } from 'app/services/app.service';
import { ClientService } from 'app/services/client.service';

import Models = ComponentInterfaces.Models;
import Request = EventInterfaces.Socket.Fetch.Request;
import IClient = ComponentInterfaces.IClientObject;
import IScriptStatus = Models.IScriptStatus;

/**
 *  Service that holds the list of script statuses, serving as the model in the MVC layout.
 *
 *  Buffers script statuses when the ClientService requests them, then serves requests for individual script statuses when a scriptStatusComponent
 *      is initialized and requests its properties.
 */
@Injectable()
export class ScriptStatusService extends InternalService implements IService {
    private clientService: ClientService;
    private scriptStatuses: Models.IScriptStatus[] = [];
    private buffer: Models.IScriptStatus[] = [];

    constructor(injector: Injector) {
        super('ScriptStatusService');
        this.logEventTextFormatting = 'color:steelblue';
        this.displayLogs = true;

        this.injectServices(injector);
    }

    private injectServices(injector: Injector): void {
        setTimeout((): void => {
            this.appService = injector.get(AppService);
            this.clientService = injector.get(ClientService);
        });
    }

    public nextScriptStatus(clientID: ObjectId): Models.IScriptStatus {
        return this.buffer.splice(this.buffer.findIndex((scriptStatus: Models.IScriptStatus): boolean => {
            return (<Models.ICompassProject>scriptStatus._project).client._id == clientID;
        }), 1)[0];
    }

    public getScriptStatus(_id: ObjectId): Models.IScriptStatus {
        return this.scriptStatuses.find((scriptStatus: Models.IScriptStatus): boolean => { return scriptStatus._id == _id; });
    }

    public bufferScriptStatuses(clientID: ObjectId): void {
        for (var i: number = 0; i < this.scriptStatuses.length; i++) {
            var scriptStatus: Models.IScriptStatus = this.scriptStatuses[i];
            if ((<Models.ICompassProject>scriptStatus._project).client._id == clientID) {
                this.buffer.push(scriptStatus);
            }
        }
    }

    public getScriptStatusesCount(clientID: ObjectId): number {
        var numScriptStatuses: number = 0;
        for (var i: number = 0; i < this.scriptStatuses.length; i++) {
            var scriptStatus: Models.IScriptStatus = this.scriptStatuses[i];
            if ((<Models.ICompassProject>scriptStatus._project).client._id == clientID) {
                numScriptStatuses++;
            }
        }
        return numScriptStatuses;
    }

    public setScriptStatuses(scriptStatuses: Models.IScriptStatus[]): void {
        this.scriptStatuses = scriptStatuses;
        this.buffer = [];
        this.clientService.setClients(this.getClients(scriptStatuses));
        this.source.next(new Events.Internal.SetEvent('AppComponent', { numScriptStatuses: this.scriptStatuses.length }));
        this.source.next(new Events.Internal.ReadyEvent('AppComponent', 'ScriptStatusService'));
    }

    private getClients(scriptStatuses: Models.IScriptStatus[]): IClient[] {
        var clients: IClient[] = [];

        for (var i: number = 0; i < scriptStatuses.length; i++) {
            var scriptStatus: Models.IScriptStatus = scriptStatuses[i];
            var clientDoc: Models.IClient = (<Models.ICompassProject>(scriptStatus._project)).client;
            var clientIndex: number = clients.findIndex((client): boolean => { return client._id == clientDoc._id; });

            if (clientIndex == -1) {
                clientIndex = clients.push(new Client(clientDoc)) - 1;
            }
        }

        return clients;
    }

    public updateScriptStatus(event: EventInterfaces.Socket.Updates.IUpdateScriptStatusEvent): void {
        var scriptStatus: Models.IScriptStatus = this.scriptStatuses.find((scriptStatus: Models.IScriptStatus): boolean => { return scriptStatus._id == event._id; });
        var props: any = event.props;

        if (scriptStatus) {
            this.updateProps(scriptStatus, props);
            this.source.next(new Events.Internal.UpdateScriptStatusEvent(scriptStatus._id, props));
        } else {
            scriptStatus = new Components.ScriptStatus(props._id, props._project, props.operation, props.status);
            this.updateProps(scriptStatus, props);
            this.scriptStatuses.push(scriptStatus);
            this.source.next(new Events.Internal.CallEvent('AppComponent', { reloadScriptStatuses: null }));
        }
    }

    public broadcastEvent(event: EventInterfaces.Internal.IInternalEvent): void {
        this.source.next(event);
    }
}

export class Client extends ClientBase implements IClient {
    public scriptStatuses: {}[] = [];
    public name: string;
    public state: Models.clientState;
    public contactPerson: ObjectId;
    public _id: ObjectId;

    constructor(clientDoc: Models.IClient) {
        super('Client');
        this.updateProps(this, clientDoc);
    }
}