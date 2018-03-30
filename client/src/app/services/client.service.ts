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
import { ScriptStatusService } from 'app/services/scriptStatus.service';

import Models = ComponentInterfaces.Models;
import IClient = ComponentInterfaces.IClientObject;

/**
 *  Service that holds the list of clients, serving as part of the model in the MVC layout.
 *
 *  Buffers its clients when the AppComponent designates itself as ready, then serves requests for individual clients when a
 *      clientComponent is initialized and requests its properties.
 */
@Injectable()
export class ClientService extends InternalService implements IService {
    private scriptStatusService: ScriptStatusService;
    private clients: IClient[] = [];
    private buffer: IClient[] = [];

    constructor(injector: Injector) {
        super('ClientService');
        this.logEventTextFormatting = 'color:steelblue';
        this.displayLogs = true;

        this.injectServices(injector);
    }

    private injectServices(injector: Injector): void {
        setTimeout((): void => {
            this.appService = injector.get(AppService);
            this.scriptStatusService = injector.get(ScriptStatusService);
        });
    }

    public nextClient(): IClient {
        return this.buffer.shift();
    }

    public getClient(_id: ObjectId): IClient {
        return this.clients.find((client: IClient): boolean => { return client._id == _id; });
    }

    public setClients(clients: IClient[]): void {
        this.clients = clients;
        this.buffer = clients;
        this.source.next(new Events.Internal.SetEvent('AppComponent', { clients: clients }));
        this.source.next(new Events.Internal.ReadyEvent('AppComponent', 'ClientService'));
    }

    public broadcastEvent(event: EventInterfaces.Internal.IInternalEvent): void {
        this.source.next(event);
    }
}