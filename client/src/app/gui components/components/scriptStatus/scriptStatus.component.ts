import { Component, Input, ChangeDetectorRef } from '@angular/core';
import * as RadialProgressChart from 'radial-progress-chart-mod';
import 'rxjs/add/operator/takeUntil';

import * as Base from 'Radar-shared/interfaces/base.interface';

import * as EventInterfaces from 'app/interfaces/events.interface';
import * as ComponentInterfaces from 'app/interfaces/components.interface';

import * as Components from 'app/classes/components';

import * as Events from 'app/classes/events';

import { BaseComponent } from 'app/gui components/components/base.component';

import { ScriptStatusService } from 'app/services/scriptStatus.service';
import { ModalService } from 'app/services/modal.service';

import ObjectId = Base.ObjectId;
import Models = ComponentInterfaces.Models;
import GUI = ComponentInterfaces.GUI;

type quotientRemainder = { quotient: number, remainder: number };

const SECONDS_PER_UPDATE: number = 5;
const FLASH_DURATION_SEC: number = 0.5;
const INITIAL_UPDATE_DELAY_MS: number = 100;

@Component({ selector: 'scriptStatus', templateUrl: './scriptStatus.component.html' })
export class ScriptStatus extends BaseComponent implements GUI.IScriptStatus {
    @Input() private clientID: ObjectId;

    private UNITS_GRAPH_ICON: string = '\uf1c6'; // fa-file-archive-o
    private UNITS_GRAPH_FG_COLOR: string = '#E90B3A';
    private UNITS_GRAPH_BG_COLOR: string = '#aa082b';

    private BYTES_GRAPH_ICON: string = '\uf1c0'; // fa-database
    private BYTES_GRAPH_FG_COLOR: string = '#A0FF03';
    private BYTES_GRAPH_BG_COLOR: string = '#6eb300';

    private TIME_GRAPH_ICON: string = '\uf073'; // fa-calendar
    private TIME_GRAPH_FG_COLOR: string = '#1AD5DE';
    private TIME_GRAPH_BG_COLOR: string = '#1399a0';

    private estimatedCompletionDate: number;
    private graph;

    private estimatedTimeLeft: number;
    private timer: NodeJS.Timer;
    private dataExtractorName: string;
    private currentUnitNames: string[] = [];
    private isFlashing: boolean = false;
    private matchesFilter: boolean = true;
    private graphValues: number[] = [0, 0, 0]; // outermost -> innermost

    public isRunning: boolean;
    public _project: Models.ICompassProject;
    public status: EventInterfaces.Socket.Script.scriptStatusType;
    public totalBytes: number;
    public totalUnits: number;
    public startDate: number;
    public stopDate: number;
    public errorList: string[] = [];
    public bytesProcessed: number;
    public unitsProcessed: number;
    public operation: Models.operationType;
    public lastUpdated: number;
    public units: Models.unitType[] = [];
    public downTime: number;
    public restarts: number;
    public description: string;

    constructor(
        private scriptStatusService: ScriptStatusService,
        private modalService: ModalService,
        private changeDetectorRef: ChangeDetectorRef) {
        super('ScriptStatus');
        this.displayLogs = true;
        this.logEventTextFormatting = 'color:lightblue';

        this.changeDetectorRef.detach();
        this.isExpanded = true;
    }

    public ngOnInit(): void {
        this.subscribeToServices();

        this.setProperties(this.scriptStatusService.nextScriptStatus(this.clientID));

        this.scriptStatusService.broadcastEvent(new Events.Internal.CallEvent(this.clientID, { onScriptStatusExpanded: { scriptStatusID: this._id, isExpanded: this.isExpanded } }));
        this.setDataExtractor();

        if (this.status != 'Stopped' && this.status != 'Errored') {
            this.currentUnitNames = this.findCurrentUnitNames();
            this.calculateCompletionDate();
        }

        this.setGraphValues();

        var __this: ScriptStatus = this;
        setTimeout((): void => {
            __this.setTimer();
            __this.update();
            __this.filter(null);
        });

        this.isPopulated = true; // assuming that this has all its properties, let the component render
    }

    public ngOnDestroy(): void {
        this.clearTimer();
        super.ngOnDestroy();
    }

    private subscribeToServices(): void {
        this.scriptStatusService.broadcast.takeUntil(this.ngUnsubscribe).subscribe((event: EventInterfaces.Internal.IInternalEvent): void => { this.eventHandler(event); });
    }

    private setTimer(): void {
        var __this: ScriptStatus = this;
        this.timer = setInterval((): void => { __this.update(); }, SECONDS_PER_UPDATE * 1000);
    }

    private clearTimer(): void {
        clearInterval(this.timer);
    }

    protected eventHandler(event: EventInterfaces.Internal.IInternalEvent): void {
        var matchesID: boolean = this.isPopulated && (event.destination == this._id || (<ObjectId[]>event.destination).includes(this._id));
        var allScriptStatuses: boolean = this.isPopulated && event.destination == 'allScriptStatuses';

        if (matchesID || allScriptStatuses) {
            if (event instanceof Events.Internal.CallEvent) {
                this.callMethods(event.methods);
            } else if (event instanceof Events.Internal.UpdateScriptStatusEvent) {
                this.modalService.sendEventToForm(new Events.Internal.CallEvent('EventLogForm', { getScriptStatus: { _id: this._id } }));
                this.update(event);
            } else {
                this.logError('[Error] Unhandled event type:', event);
            }
        }
    }

    private update(event?: EventInterfaces.Internal.Updates.IUpdateScriptStatusEvent): void {
        if (event) {
            this.updateProps(this, event.props);
            this.flash();
        }

        this.calculateCompletionDate();
        if (this.status == 'Stopped' || this.status == 'Errored') {
            this.estimatedCompletionDate = null;
        }

        this.currentUnitNames = this.findCurrentUnitNames();
        this.estimatedTimeLeft = this.estimatedCompletionDate ? this.estimatedCompletionDate - Date.now() : -1;
        this.setGraphValues();

        this.onChanges();
    }

    private onChanges(): void {
        this.changeDetectorRef.reattach();
        this.changeDetectorRef.detectChanges();

        var __this: ScriptStatus = this;
        setTimeout((): void => {
            __this.changeDetectorRef.detach();
        });
    }

    private expand(makeExpanded: boolean = null): void {
        var hasChanged: boolean = false;
        if (makeExpanded == null) {
            this.isExpanded = !this.isExpanded;
            hasChanged = true;
        } else if (makeExpanded != this.isExpanded) {
            this.isExpanded = makeExpanded;
            hasChanged = true;
        }

        this.scriptStatusService.broadcastEvent(new Events.Internal.CallEvent(this.clientID, { onScriptStatusExpanded: { scriptStatusID: this._id, isExpanded: this.isExpanded } }));
        if (hasChanged) {
            this.update(null);
        }
    }

    private setGraphValues(): void {
        var timeLeftPercentage: number = this.calcBytesLeftPercentage();
        this.graphValues = [this.calcUnitsLeftPercentage(), this.calcBytesLeftPercentage(), timeLeftPercentage >= 0 && timeLeftPercentage <= 1 ? timeLeftPercentage : 0];
    }

    private setDataExtractor(): void {
        if (this._project && this._project.roles) {
            this.dataExtractorName = (<Models.IUser>this._project.roles.find((role: Models.IRole): boolean => {
                return role.name.toLowerCase() == 'data extractor' || role.name.toLowerCase() == 'extractor';
            }).user).displayName;
        }
    }

    private calculateCompletionDate(): void {
        var useBytes: boolean = this.allProcessedUnitsHaveBytes() && this.totalBytes > 0;
        var averageAverageRate: number = this.getAverageAverageRate(this.getAverageRates(useBytes)); // in bytes per ms or units per ms

        if (averageAverageRate > 0) {
            var estimatedTotalMS: number = (useBytes ? this.totalBytes : this.totalUnits) / averageAverageRate;
            this.estimatedCompletionDate = this.startDate + estimatedTotalMS;
        } else {
            this.estimatedCompletionDate = null; // unknown if no onUnitStopEvents have been received yet
        }
    }

    private allProcessedUnitsHaveBytes(): boolean {
        for (var i: number = 0; i < this.units.length; i++) {
            if (this.units[i].timeElapsed != null) {
                if (this.units[i].bytesProcessed == null) {
                    return false; // if not, use units instead
                }
            } else {
                break; // stop at first unit not processed
            }
        }

        return true;
    }

    private getAverageRates(useBytes: boolean): number[] {
        var averageRates: number[] = []; 
        for (var i: number = 0; i < this.units.length; i++) {
            var unit: Models.unitType = this.units[i];
            if (unit.timeElapsed != null) {
                averageRates.push((useBytes ? unit.bytesProcessed : 1) / unit.timeElapsed);
            } else {
                break;
            }
        }
        return averageRates;
    }

    private getAverageAverageRate(averageRates: number[]): number {
        var averageRatesSum: number = 0;
        for (var i: number = 0; i < averageRates.length; i++) {
            averageRatesSum += averageRates[i];
        }
        return averageRatesSum / averageRates.length;
    }

    private formatDuration(totalMS: number, complete: boolean = true): string {
        const DAYS_UNIT_LABEL: string = 'd';
        const HOURS_UNIT_LABEL: string = 'h';
        const MINUTES_UNIT_LABEL: string = 'm';
        const SECONDS_UNIT_LABEL: string = 's';

        const MS_IN_ONE_SECOND: number = 1000;
        const MS_IN_ONE_MINUTE: number = MS_IN_ONE_SECOND * 60;
        const MS_IN_ONE_HOUR: number = MS_IN_ONE_MINUTE * 60;
        const MS_IN_ONE_DAY: number = MS_IN_ONE_HOUR * 24;

        var dayQuotientRemainder: quotientRemainder = this.getQuotientAndRemainder(totalMS, MS_IN_ONE_DAY);
        var hourQuotientRemainder: quotientRemainder = this.getQuotientAndRemainder(dayQuotientRemainder.remainder, MS_IN_ONE_HOUR);
        var minuteQuotientRemainder: quotientRemainder = this.getQuotientAndRemainder(hourQuotientRemainder.remainder, MS_IN_ONE_MINUTE);
        var secondQuotientRemainder: quotientRemainder = this.getQuotientAndRemainder(minuteQuotientRemainder.remainder, MS_IN_ONE_SECOND);

        var numDays: number = dayQuotientRemainder.quotient;
        var numHours: number = hourQuotientRemainder.quotient;
        var numMinutes: number = minuteQuotientRemainder.quotient;
        var numSeconds: number = secondQuotientRemainder.quotient;

        if (totalMS > MS_IN_ONE_DAY) {
            if (!complete) {
                numDays = Math.round(10 * (totalMS / MS_IN_ONE_DAY)) / 10;
            }
            return numDays + DAYS_UNIT_LABEL + (complete ? ', ' + numHours + HOURS_UNIT_LABEL + ', ' + numMinutes + MINUTES_UNIT_LABEL : '');

        } else if (totalMS > MS_IN_ONE_HOUR) {
            if (!complete) {
                numHours = Math.round(10 * (totalMS / MS_IN_ONE_HOUR)) / 10;
            }
            return numHours + HOURS_UNIT_LABEL + (complete ? ', ' + numMinutes + MINUTES_UNIT_LABEL : '');

        } else if (totalMS > MS_IN_ONE_MINUTE) {
            if (!complete) {
                numMinutes = Math.round(10 * (totalMS / MS_IN_ONE_MINUTE)) / 10;
            }
            return numMinutes + MINUTES_UNIT_LABEL + (complete ? ', ' + numSeconds + SECONDS_UNIT_LABEL : '');

        } else {
            return numSeconds + SECONDS_UNIT_LABEL;
        }
    }

    private getQuotientAndRemainder(dividend: number, divisor: number): quotientRemainder {
        if (divisor != 0) {
            var remainder: number = dividend % divisor;
            return { quotient: (dividend - remainder) / divisor, remainder: remainder };
        }
        return { quotient: 0, remainder: divisor };
    }

    private formatBytes(numBytes: number, units: boolean = false): string {
        const TERABYTES_UNIT_LABEL: string = 'TB';
        const GIGABYTES_UNIT_LABEL: string = 'GB';
        const MEGABYTES_UNIT_LABEL: string = 'MB';
        const KILOBYTES_UNIT_LABEL: string = 'KB';
        const BYTES_UNIT_LABEL: string = 'B';

        const BYTES_IN_ONE_KILOBYTE: number = 1024;
        const BYTES_IN_ONE_MEGABYTE: number = BYTES_IN_ONE_KILOBYTE * 1024;
        const BYTES_IN_ONE_GIGABYTE: number = BYTES_IN_ONE_MEGABYTE * 1024;
        const BYTES_IN_ONE_TERABYTE: number = BYTES_IN_ONE_GIGABYTE * 1024;

        if (numBytes > BYTES_IN_ONE_TERABYTE) {
            return (units ? '' : (Math.round(100 * (numBytes / BYTES_IN_ONE_TERABYTE)) / 100)) + (units ? TERABYTES_UNIT_LABEL : '');
        } else if (numBytes > BYTES_IN_ONE_GIGABYTE) {
            return (units ? '' : (Math.round(100 * (numBytes / BYTES_IN_ONE_GIGABYTE)) / 100)) + (units ? GIGABYTES_UNIT_LABEL : '');
        } else if (numBytes > BYTES_IN_ONE_MEGABYTE) {
            return (units ? '' : (Math.round(100 * (numBytes / BYTES_IN_ONE_MEGABYTE)) / 100)) + (units ? MEGABYTES_UNIT_LABEL : '');
        } else if (numBytes > BYTES_IN_ONE_KILOBYTE) {
            return (units ? '' : (Math.round(100 * (numBytes / BYTES_IN_ONE_KILOBYTE)) / 100)) + (units ? KILOBYTES_UNIT_LABEL : '');
        } else {
            return (units ? '' : Math.round(numBytes)) + (units ? BYTES_UNIT_LABEL : '');
        }
    }

    private showErrors(): void {
        this.modalService.showForm('EventLogForm');

        var __this: ScriptStatus = this;
        setTimeout((): void => {
            // filter to just errors by default
            __this.modalService.sendEventToForm(new Events.Internal.SetEvent('EventLogForm', { selectedClassNames: ['OnUnitError'] }));
            __this.modalService.sendEventToForm(new Events.Internal.CallEvent('EventLogForm', { getScriptStatus: { _id: __this._id } }));
        });
    }

    private showEventLog(): void {
        this.modalService.showForm('EventLogForm');

        var __this: ScriptStatus = this;
        setTimeout((): void => {
            __this.modalService.sendEventToForm(new Events.Internal.CallEvent('EventLogForm', { getScriptStatus: { _project: __this._id } }));
        });
    }

    private dateNow(): number {
        return Date.now();
    }

    private newDateFromNumber(ms: number): Date {
        return new Date(ms);
    }

    private dateParse(date: string): number {
        return Date.parse(date);
    }

    private calcTimeLeftPercentage(): number {
        return this.estimatedCompletionDate != null ? Math.round(((this.estimatedTimeLeft - this.startDate) / (this.estimatedCompletionDate - this.startDate)) * 100) / 100 : 0;
    }

    private calcBytesLeftPercentage(): number {
        return this.totalBytes != null ? Math.round((this.bytesProcessed / this.totalBytes) * 100) / 100 : 0;
    }

    private calcUnitsLeftPercentage(): number {
        return this.totalUnits != null ? Math.round((this.unitsProcessed / this.totalUnits) * 100) / 100 : 0;
    }

    private findCurrentUnitNames(): string[] {
        var currentUnitNames: string[] = [];
        for (var i: number = 0; i < this.units.length; i++) {
            if (this.units[i].isProcessing) {
                currentUnitNames.push(this.units[i].unitName);
            }
        }
        return currentUnitNames;
    }

    private findUnit(unitName: string): Models.unitType {
        return this.units.find((unit: Models.unitType): boolean => { return unit.unitName == unitName; });
    }

    private flash(): void {
        this.isFlashing = true;
        this.changeDetectorRef.detectChanges();

        var __this: ScriptStatus = this;
        setTimeout((): void => {
            __this.isFlashing = false;
            __this.changeDetectorRef.detectChanges();
        }, (FLASH_DURATION_SEC / 2) * 1000);
    }

    private filter(filters: any): void {
        this.update();

        for (var prop in filters) {
            if (filters.hasOwnProperty(prop)) {
                this.matchesFilter = this.processFilterProp(prop, filters);

                if (!this.matchesFilter) {
                    break;
                }
            }
        }

        if (this.matchesFilter) {
            this.scriptStatusService.broadcastEvent(new Events.Internal.CallEvent(this.clientID, { incrementNumScriptStatusesMatchingFilter: null }));
        }

        this.onChanges();
    }

    private processFilterProp(prop: string, filters: any): boolean {
        switch (prop) {
            case 'referenceNum':
                return this.checkStringFilterMatch(filters.referenceNum, this._project.referenceNum, prop);
            case 'facility':
                return this.checkStringFilterMatch(filters.facility, this._project.facility.name, prop);
            case 'subfacility':
                return this.checkStringFilterMatch(filters.subfacility, this._project.subfacility.name, prop);
            case 'projectName':
                return this.checkStringFilterMatch(filters.projectName, this._project.name, prop);
            case 'status':
                return this.checkStatusFilterMatch(filters);
            case 'estimatedCompletionDate':
                return this.checkEstimatedCompletionDateFilterMatch(filters);
            default:
                this.logError('Error: unknown filter prop name (' + prop + ')');
                return false;
        }
    }

    private checkStringFilterMatch(propToCheck: Base.Primitive, projectProp: Base.Primitive, propName: string): boolean {
        return propToCheck == '' || this.stringFuzzyIncludes(projectProp.toString(), propToCheck.toString());
    }

    private checkStatusFilterMatch(filters: any): boolean {
        var matchesStatus: boolean = false;
        var allUnchecked: boolean = true;

        for (var i: number = 0; i < filters.status.options.length; i++) {
            var statusOption: any = filters.status.options[i];
            if (statusOption.checked) {
                allUnchecked = false;
                if (statusOption.name == this.status) {
                    matchesStatus = true;
                    break;
                }
            }
        }

        return matchesStatus || allUnchecked;
    }

    private checkEstimatedCompletionDateFilterMatch(filters: any): boolean {
        if (filters.estimatedCompletionDate) {
            var isInFuture: boolean = this.estimatedCompletionDate >= Date.now();
            var isBeforeFilteredDate: boolean = this.estimatedCompletionDate <= filters.estimatedCompletionDate.getTime();
            return isInFuture && isBeforeFilteredDate;
        } else {
            return true;
        }
    }
}