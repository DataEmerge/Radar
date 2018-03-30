import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import * as Moment from 'moment-timezone';

import { ObjectId } from 'Radar-shared/interfaces/base.interface';
import * as EventInterfaces from 'Radar-shared/interfaces/events.interface';

import { Models } from 'app/interfaces/components.interface';

import { BaseForm } from 'app/gui components/forms/baseForm.component';

import { ModalModule } from 'app/gui components/modal/modal.module';
import { MultiselectModule } from 'app/gui components/forms/multiselect/multiselect.module';

import { ModalService } from 'app/services/modal.service';
import { ScriptStatusService } from 'app/services/scriptStatus.service';
import { AppService } from 'app/services/app.service';

const MAIN_COL_MAX_LETTERS: number = 25;

@Component({ selector: 'eventLogForm', templateUrl: './eventLogForm.component.html' })
export class EventLogForm extends BaseForm implements OnInit {
    private scriptStatus: Models.IScriptStatus;
    private _scriptEvents: Models.Script.IScriptEvent[] = [];
    private set scriptEvents(scriptEvents: Models.Script.IScriptEvent[]) {
        this._scriptEvents = scriptEvents;
        this.isLoading = false;
        this.onScriptEventsChange();
    }
    private get scriptEvents(): Models.Script.IScriptEvent[] {
        return this._scriptEvents;
    }

    private isLoading: boolean = true;
    private mainColumnWidth: number = -1;
    private sortProp: string = 'timestamp';
    private reverseSort: boolean = false;
    private classNames: EventInterfaces.Socket.Script.scriptEventType[] = [
        'OnOperationStartEvent',
        'OnOperationStopEvent',
        'OnUnitErrorEvent',
        'OnUnitStartEvent',
        'OnUnitStopEvent'
    ];
    private selectedClassNames: EventInterfaces.Socket.Script.scriptEventType[] = [];

    private startFilterDate: Date;
    private endFilterDate: Date;
    private isReconstructingStartDatepicker: boolean = false;
    private isReconstructingEndDatepicker: boolean = false;

    constructor(
        modalService: ModalService,
        private scriptStatusService: ScriptStatusService,
        private appService: AppService,
        private changeDetectorRef: ChangeDetectorRef) {
        super(modalService, 'EventLogForm');
        this.displayLogs = true;
        this.logEventTextFormatting = 'color:maroon; background-color:white';
    }

    public ngOnInit(): void {
        super.ngOnInit();
        var __this: EventLogForm = this;
        setTimeout((): void => {
            var oneLetterWidth: number = document.getElementById('font-size-template').offsetWidth;
            __this.mainColumnWidth = MAIN_COL_MAX_LETTERS * oneLetterWidth;

            setTimeout((): void => {
                __this.changeDetectorRef.detach();
            }, 100);
        }, 10);
    }

    private getScriptStatus(_id: ObjectId): void {
        this.scriptStatus = this.scriptStatusService.getScriptStatus(_id);
        this.appService.requestScriptEvents((<Models.ICompassProject>this.scriptStatus._project)._id);
    }

    public closeForm(): void {
        super.closeForm();
        return undefined;
    }
   
    private getObjectProps(obj: Models.Script.IScriptEvent, isEvent: boolean = true): any[] {
        var details: any[] = [];
        var excludedProps: string[] = ['_project', 'className', 'socketID', 'timestamp', '_id', '__v'];

        for (var prop in obj) {
            if (obj.hasOwnProperty(prop) && ((isEvent && !excludedProps.includes(prop)) || !isEvent)) {
                details.push({
                    name: prop,
                    value: obj[prop]
                });
            }
        }

        return details;
    }

    private formatDetailValue(value: any): any {
        if (typeof value == 'string') {
            return '\"' + value + '\"';
        } else if (typeof value == 'undefined') {
            return 'undefined';
        }

        return value;
    }

    private getClassNameFontColor(className: EventInterfaces.Socket.Script.scriptEventType): string {
        switch (className) {
            case 'OnOperationStartEvent': return 'font-blue';
            case 'OnOperationStopEvent': return 'font-orange';
            case 'OnUnitStartEvent': return 'font-green';
            case 'OnUnitStopEvent': return 'font-green-b';
            case 'OnUnitErrorEvent': return 'font-red';
        }
    }

    private getDetailValueFontColor(value: any): string {
        switch (typeof value) {
            case 'string': return value == 'undefined' ? 'font-undefined' : 'font-string';
            case 'number': return 'font-number';
            case 'boolean': return 'font-boolean';
            case 'undefined': return 'font-undefined';
            default: return value == null ? 'font-null' : '';
        }
    }

    private onScriptEventsChange(doUpdate: boolean = true): void {
        if (this.startFilterDate == null) {
            this.isReconstructingStartDatepicker = true;
            var __this: EventLogForm = this;
            setTimeout((): void => { __this.isReconstructingStartDatepicker = false; });
        }

        if (this.endFilterDate == null) {
            this.isReconstructingEndDatepicker = true;
            var __this: EventLogForm = this;
            setTimeout((): void => { __this.isReconstructingEndDatepicker = false; });
        }

        if (doUpdate) {
            this.onChanges();
        }
    }

    private onChanges(): void {
        this.changeDetectorRef.reattach();
        this.changeDetectorRef.detectChanges();

        var __this: EventLogForm = this;
        setTimeout((): void => { __this.changeDetectorRef.detach(); });
    }

    private matchesFilter(scriptEvent: Models.Script.IScriptEvent): boolean {
        var matches: boolean = true;
        if (this.selectedClassNames.length > 0 && !this.selectedClassNames.includes(scriptEvent.className)) {
            matches = false;
        } else if (this.startFilterDate && this.endFilterDate && (this.startFilterDate.getTime() >= scriptEvent.timestamp || scriptEvent.timestamp >= this.endFilterDate.getTime())) {
            matches = false;
        }

        return matches;
    }

    private sortBy(sortProp: string): void {
        if (this.sortProp == sortProp) {
            this.reverseSort = !this.reverseSort;
        } else {
            this.sortProp = sortProp;
            this.reverseSort = false;
        }

        this.sortScriptEvents(this.sortProp);
        this.onScriptEventsChange();
    }

    private sortScriptEvents(sortProp: string): void {
        var __this: EventLogForm = this;
        this.scriptEvents.sort((event1: Models.Script.IScriptEvent, event2: Models.Script.IScriptEvent): number => {
            switch (sortProp) {
                case 'timestamp':
                    return event1.timestamp - event2.timestamp;
                case 'className':
                    return event1.className.localeCompare(event2.className);
                default:
                    __this.logError('Error: unrecognized scriptEvent sortProp (' + sortProp + ')');
                    return 0;
            }
        });

        if (this.reverseSort) {
            this.scriptEvents.reverse();
        }
    }
}