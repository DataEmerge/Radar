import { Injectable, Injector } from '@angular/core';
import { Subject, Observable } from 'rxjs';

import * as EventInterfaces from 'app/interfaces/events.interface';
import { IInternalService } from 'app/interfaces/service.interface';
import * as ComponentInterfaces from 'app/interfaces/components.interface';
import { formType, modalType } from 'app/interfaces/form.interface';

import * as Components from 'app/classes/components';

import * as Events from 'app/classes/events';

import { InternalService } from 'app/services/base.service';
import { AppService } from 'app/services/app.service';
import { ScriptStatusService } from 'app/services/scriptStatus.service';

@Injectable()
export class ModalService extends InternalService implements IInternalService {
    private scriptStatusService: ScriptStatusService;

    constructor(injector: Injector) {
        super('ModalService');
        this.logEventTextFormatting = 'color:blue; background-color:rgba(255,255,255,0.5)';
        this.displayLogs = true;

        this.injectServices(injector);
    }

    private injectServices(injector: Injector): void {
        setTimeout((): void => {
            this.scriptStatusService = injector.get(ScriptStatusService);
        });
    }

    public showForm(formName: formType): void {
        this.source.next(new Events.Internal.CallEvent('AppComponent', { showForm: { formName: formName } }));
    }

    public showModal(modalName: modalType): void {
        this.source.next(new Events.Internal.ShowFormEvent(modalName));
    }

    public sendEventToApp(event: EventInterfaces.Internal.IInternalEvent): void {
        this.source.next(event);
    }

    public sendEventToForm(event: EventInterfaces.Internal.IInternalEvent): void {
        this.source.next(event);
    }
}