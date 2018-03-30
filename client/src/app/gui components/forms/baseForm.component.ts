import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

import * as FormInterfaces from 'app/interfaces/form.interface';
import * as ComponentInterfaces from 'app/interfaces/components.interface';
import * as EventInterfaces from 'app/interfaces/events.interface';

import { ClientBase } from 'app/classes/clientBase';
import * as Events from 'app/classes/events';

import { ModalModule } from 'app/gui components/modal/modal.module';

import { ModalService } from 'app/services/modal.service';

import Models = ComponentInterfaces.Models;

@Component({})
export abstract class BaseForm extends ClientBase implements FormInterfaces.IForm, OnInit, OnDestroy {
    @Input() private darkTheme: boolean = true;

    protected ngUnsubscribe: Subject<any> = new Subject<any>();

    public component: Models.IComponent = { _id: null };

    constructor(public modalService: ModalService, public formType: FormInterfaces.formType = 'BaseForm') {
        super(formType);
        this.displayLogs = true;
        this.logEventTextFormatting = 'color:black; background-color:white';
    }

    public ngOnInit(): void {
        this.modalService.broadcast.takeUntil(this.ngUnsubscribe).subscribe((event: EventInterfaces.Internal.IInternalEvent): void => { this.eventHandler(event); });
    }

    public ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    public eventHandler(event: EventInterfaces.Internal.IInternalEvent): void {
        if (event.destination == this.formType) {
            if (event instanceof Events.Internal.InternalEvent) {
                if (event instanceof Events.Internal.SetEvent) {
                    this.setProperties(event.props);
                } else if (event instanceof Events.Internal.CallEvent) {
                    this.callMethods(event.methods);
                } else {
                    this.logError('Error: should not receive an abstract InternalEvent');
                }
            } else {
                this.logError('Error: unhandled event type;', event);
            }
        }
    }

    public closeForm(): void {
        this.modalService.sendEventToApp(new Events.Internal.CallEvent('AppComponent', { closeForms: { formName: this.formType } }));
    }
}