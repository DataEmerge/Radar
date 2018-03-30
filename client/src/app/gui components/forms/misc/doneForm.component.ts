import { Component, Input } from '@angular/core';

import { BaseForm } from 'app/gui components/forms/baseForm.component';

import { ModalModule } from 'app/gui components/modal/modal.module';

import { ModalService } from 'app/services/modal.service';

@Component({ selector: 'doneForm', templateUrl: './doneForm.component.html' })
export class DoneForm extends BaseForm {
    private componentParent: any;
    private formAction: string;
    private verb: string = '';
    private preposition: string = '';

    constructor(modalService: ModalService) {
        super(modalService, 'DoneForm');
        this.displayLogs = true;
        this.logEventTextFormatting = 'color: maroon; background-color:white';
    }

    //public eventHandler(event: IEvent): void {
    //    super.eventHandler(<ISetEvent>event);
    //    if (event.destination == 'DoneForm') {
    //        this.setGrammar();
    //        this.setNames();
    //    }
    //}

    private setGrammar(): void {
        switch (this.formAction) {
            case 'add':
                this.verb = 'added';
                this.preposition = 'to';
                break;
            case 'remove':
                this.verb = 'removed';
                this.preposition = 'from';
                break;
            case 'edit':
                this.verb = 'updated';
                this.preposition = 'in';
                break;
            default:
                this.verb = 'performed operation on';
                break;
        }
    }

    private setNames(): void {
        //switch (this.componentName) {
        //    case 'DBField':
        //        this.componentParent = {
        //            name: this.component.dbTable.name,
        //            componentType: 'table'
        //        }
        //        break;
        //    case 'DBTable':
        //        this.componentParent = {
        //            name: this.component.dbSchema.name,
        //            componentType: 'schema'
        //        }
        //        break;
        //    case 'DBSchema':
        //        this.componentParent = {
        //            name: this.component.type,
        //            componentType: 'database'
        //        }
        //        break;
        //}
    }

    public closeForm(): void {
        this.componentParent = null;
        this.verb = '';
        super.closeForm();
    }
}