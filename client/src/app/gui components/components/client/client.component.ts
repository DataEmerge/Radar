import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import 'rxjs/add/operator/takeUntil';

import * as Base from 'Radar-shared/interfaces/base.interface';

import * as EventInterfaces from 'app/interfaces/events.interface';
import * as ComponentInterfaces from 'app/interfaces/components.interface';

import * as Components from 'app/classes/components';

import * as Events from 'app/classes/events';

import { BaseComponent } from 'app/gui components/components/base.component';

import { ClientService } from 'app/services/client.service';
import { ScriptStatusService } from 'app/services/scriptStatus.service';

import ObjectId = Base.ObjectId;
import Models = ComponentInterfaces.Models;
import GUI = ComponentInterfaces.GUI;

@Component({ selector: 'client', templateUrl: './client.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class Client extends BaseComponent implements GUI.IClient {
    public _id: ObjectId;
    public name: string;
    public state: Models.clientState;
    public contactPerson: ObjectId;
    public scriptStatuses: {}[] = [];
    private expandedScriptStatuses: ObjectId[] = [];

    private numScriptStatuses: number = 0;
    private numScriptStatusesMatchingFilters: number = 0;
    private allScriptStatusesExpanded: number = 1; // -1 for none expanded, 0 for mixed, 1 for all expanded

    constructor(
        private clientService: ClientService,
        private scriptStatusService: ScriptStatusService,
        private changeDetectorRef: ChangeDetectorRef) {
        super('Client');
        this.displayLogs = true;
        this.logEventTextFormatting = 'color:lightblue';

        this.isExpanded = true;
    }

    public ngOnInit(): void {
        this.subscribeToServices();
        this.setProperties(this.clientService.nextClient());
        this.scriptStatusService.bufferScriptStatuses(this._id);
        this.setScriptStatuses();
        this.isPopulated = true; // allow the scriptStatusList container to render and the ngFor to run
    }

    public ngOnDestroy(): void {
        super.ngOnDestroy();
    }

    private subscribeToServices(): void {
        this.clientService.broadcast.takeUntil(this.ngUnsubscribe).subscribe((event: EventInterfaces.Internal.IInternalEvent): void => { this.eventHandler(event); });
        this.scriptStatusService.broadcast.takeUntil(this.ngUnsubscribe).subscribe((event: EventInterfaces.Internal.IInternalEvent): void => { this.eventHandler(event); });
    }

    protected eventHandler(event: EventInterfaces.Internal.IInternalEvent): void {
        var matchesID: boolean = this.isPopulated && (event.destination == this._id || (<ObjectId[]>event.destination).includes(this._id));
        var allClients: boolean = this.isPopulated && event.destination == 'allClients';

        if (matchesID || allClients) {
            this.changeDetectorRef.markForCheck();

            if (event instanceof Events.Internal.SetEvent) {
                this.setProperties(event.props);
            } else if (event instanceof Events.Internal.CallEvent) {
                this.callMethods(event.methods);
            } else {
                this.logError('[Error] Unhandled event type:', event);
            }
        }
    }

    private setScriptStatuses(): void {
        this.numScriptStatuses = this.scriptStatusService.getScriptStatusesCount(this._id);
        for (var i: number = 0; i < this.numScriptStatuses; i++) {
            this.scriptStatuses.push({}); // make empty array for ngFor to iterate through and construct scriptStatus components
        }
    }

    private expand(clickEvent: MouseEvent, makeExpanded?: boolean): void {
        var hasChanged: boolean = false;
        if (clickEvent) {
            var expandScriptStatusesButton: HTMLElement = document.getElementById('expandScriptStatusesButton-' + this._id);
            if (expandScriptStatusesButton) {
                if (!this.isDescendant(<Element>clickEvent.target, expandScriptStatusesButton)) {
                    this.isExpanded = !this.isExpanded;
                    this.expandedScriptStatuses = [];
                    hasChanged = true;
                }
            } else {
                this.logError('Error: no expand script statuses button found for client _id', this._id);
            }
        } else {
            this.isExpanded = makeExpanded;
            hasChanged = true;
        }

        if (hasChanged) {
            this.clientService.broadcastEvent(new Events.Internal.CallEvent('AppComponent', { onClientExpanded: { clientID: this._id, expanded: this.isExpanded } }));

            if (this.isExpanded) {
                this.allScriptStatusesExpanded = 1;
                this.clientService.broadcastEvent(new Events.Internal.CallEvent('AppComponent', { onFiltersChange: null }));
                this.scriptStatusService.bufferScriptStatuses(this._id);
            }
        }
    }

    private onScriptStatusExpanded(scriptStatusID: ObjectId, isExpanded: boolean): void {
        if (isExpanded) {
            this.expandedScriptStatuses.push(scriptStatusID);
        } else {
            this.expandedScriptStatuses.splice(this.expandedScriptStatuses.findIndex((_id: ObjectId): boolean => { return scriptStatusID == _id; }), 1);
        }

        if (this.expandedScriptStatuses.length == 0) {
            this.allScriptStatusesExpanded = -1;
        } else if (this.expandedScriptStatuses.length == this.scriptStatuses.length) {
            this.allScriptStatusesExpanded = 1;
        } else {
            this.allScriptStatusesExpanded = 0;
        }
    }

    private expandAllScriptStatuses(): void {
        var makeExpanded: boolean = this.allScriptStatusesExpanded != 0 ? this.allScriptStatusesExpanded < 1 : false;
        this.scriptStatusService.broadcastEvent(new Events.Internal.CallEvent('allScriptStatuses', { expand: { makeExpanded: makeExpanded } }));
    }

    private incrementNumScriptStatusesMatchingFilter(): void {
        this.numScriptStatusesMatchingFilters++;
        this.clientService.broadcastEvent(new Events.Internal.CallEvent('AppComponent', { incrementNumScriptStatusesMatchingFilter: null }));
    }
}