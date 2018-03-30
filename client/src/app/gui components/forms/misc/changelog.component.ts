import { Component, Input } from '@angular/core';

import { BaseForm } from 'app/gui components/forms/baseForm.component';

import { ModalModule } from 'app/gui components/modal/modal.module';

import { ModalService } from 'app/services/modal.service';

@Component({ selector: 'changelog', templateUrl: './changelog.component.html' })
export class Changelog extends BaseForm {
    constructor(modalService: ModalService) {
        super(modalService, 'Changelog');
        this.displayLogs = true;
        this.logEventTextFormatting = 'color:rgb(171, 171, 171); background-color:white';
    }
}