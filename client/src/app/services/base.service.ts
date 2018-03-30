import { Subject, Observable } from 'rxjs';

import { IEvent } from 'Radar-shared/interfaces/events.interface'

import * as EventInterfaces from 'app/interfaces/events.interface';
import * as ServiceInterfaces from 'app/interfaces/service.interface';

import { ClientBase } from 'app/classes/clientBase';

import { AppService } from 'app/services/app.service';

export abstract class BaseService extends ClientBase implements ServiceInterfaces.IService {
    protected source: Subject<IEvent> = new Subject<IEvent>(); // TODO: narrow down the types of things services can send/receive to events

    public broadcast: Observable<IEvent> = this.source.asObservable();

    constructor(public serviceName: ServiceInterfaces.serviceType) {
        super(serviceName);
    }
}

export abstract class InternalService extends BaseService implements ServiceInterfaces.IInternalService {
    protected appService: AppService;
}