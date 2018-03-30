import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

import * as EventInterfaces from 'app/interfaces/events.interface';
import { formType, modalType, modalPosition } from 'app/interfaces/form.interface';

import { ClientBase } from 'app/classes/clientBase';
import * as Events from 'app/classes/events';

import { ModalService } from 'app/services/modal.service';

@Component({ selector: 'app-modal', templateUrl: './modal.component.html' })
export class ModalComponent extends ClientBase implements OnInit, OnDestroy {
    @Input() private darkTheme: boolean = true;
    @Input() private formName: formType;
    @Input() private size: string = 'modal-md';
    @Input() private position: modalPosition = 'middle';
    @Input() private canButtonClose: boolean = true;
    @Input() private canContainerClickClose: boolean = true;
    @Input() private canEscapeClose: boolean = true;
    @Input() private options: string = '';
    @Input() private contentOptions: string = '';

    private modalName: modalType;
    private value: string = '';
    private isVisible: boolean = false;
    private bodyMaxHeight: number = -1;

    protected ngUnsubscribe: Subject<any> = new Subject<any>();

    constructor(private modalService: ModalService) {
        super('newModal');
        this.logEventTextFormatting = 'color:yellow; background-color:white';
        this.displayLogs = true;

        this.modalService.broadcast.takeUntil(this.ngUnsubscribe).subscribe((event: EventInterfaces.Internal.IInternalEvent): void => { this.eventHandler(event); });
    }

    public ngOnInit(): void {
        setTimeout((): void => {
            this.modalService.showModal(<modalType>(this.formName + 'Modal'));
        });
    }

    public ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    private eventHandler(event: EventInterfaces.Internal.IInternalEvent): void {
        if (event.destination == this.formName + 'Modal') {
            if (event instanceof Events.Internal.InternalEvent) {
                this.handleInternalEvent(event);
            } else {
                this.logError('Error: unhandled event type;', event);
            }
        }
    }

    private handleInternalEvent(event: EventInterfaces.Internal.IInternalEvent): void {
        if (event instanceof Events.Internal.ShowFormEvent) {
            this.show();
        } else if (event instanceof Events.Internal.HideFormEvent) {
            if (event.keyPressInfo) {
                this.onKeyPressed(event.keyPressInfo);
            } else {
                this.hide();
            }
        } else if (event instanceof Events.Internal.FormEvent) {
            this.logError('Error: should not receive an abstract FormEvent');
        } else {
            this.logError('Error: should not receive an abstract InternalEvent');
        }
    }

    private show(): void {
        this.isVisible = true;
    }

    private hide(): void {
        this.isVisible = false;
        this.modalService.sendEventToApp(new Events.Internal.CallEvent('AppComponent', { closeForms: { formNames: [] } }));
    }

    private onContainerClicked(event: MouseEvent): void {
        if (this.canContainerClickClose && (<HTMLElement>event.target).classList.contains('modal')) {
            this.hide();
        }
    }

    private onCloseClicked(): void {
        if (this.canButtonClose) {
            this.hide();
        }
    }

    private onKeyPressed(event: KeyboardEvent): void {
        if (event.key == 'Escape' && this.canEscapeClose && event.target['tagName'] != 'INPUT') {
            this.hide();
        }
    }

    private getBodyMaxHeight(): number {
        if (this.isVisible) {
            var height: number = document.getElementById(this.formName + '-modal') ? document.getElementById(this.formName + '-modal').offsetHeight : 0;
            var heights: any = {
                modalHeaderHeight: document.getElementById(this.formName + '-header') ? document.getElementById(this.formName + '-header').offsetHeight : 0,
                modalFooterHeight: document.getElementById(this.formName + '-footer') ? document.getElementById(this.formName + '-footer').offsetHeight : 0,
            };

            for (var prop in heights) {
                if (heights.hasOwnProperty(prop)) {
                    height -= parseInt(heights[prop]);
                }
            }

            return height;
        }

        return 0;
    }
}
