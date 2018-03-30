import { Component, ViewChild } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

import { ObjectId } from 'Radar-shared/interfaces/base.interface';

import * as EventInterfaces from 'app/interfaces/events.interface';
import * as ComponentInterfaces from 'app/interfaces/components.interface';
import { formType, modalType } from 'app/interfaces/form.interface';

import * as Components from 'app/classes/components';

import { ClientBase } from 'app/classes/clientBase';
import * as Events from 'app/classes/events';

import { AppService } from 'app/services/app.service';
import { ScriptStatusService } from 'app/services/scriptStatus.service';
import { ClientService } from 'app/services/client.service';
import { ModalService } from 'app/services/modal.service';

import Models = ComponentInterfaces.Models;
import GUI = ComponentInterfaces.GUI;
import IClient = ComponentInterfaces.IClientObject;

const INACTIVITY_RELOAD_TIMEOUT_SEC: number = 300;
const DEFAULT_FILTERS: any = {
    status: {
        isExpanded: false,
        options: [
            { name: 'Running', checked: false, color: 'blue' },
            { name: 'Stopped', checked: false, color: 'orange' },
            { name: 'Completed', checked: false, color: 'green' },
            { name: 'Unknown', checked: false, color: 'purple' },
            { name: 'Errored', checked: false, color: 'red' }
        ],
        allChecked: false
    },
    estimatedCompletionDate: null,
    referenceNum: '',
    facility: '',
    subfacility: '',
    projectName: '',
};

/**
 *  Root component class for the Radar client app.
 *
 *  Manages the filters for the scriptStatuses. Also manages the forms and controls the dark theme setting for the rest of the app.
 *  Once the AppService is ready, it requests the ScriptStatuses from the server. When they arrive and the ClientService and the ScriptStatusService
 *      have processed them, the page view is allowed to render.
 */
@Component({ selector: 'app-root', templateUrl: './app.component.html' })
export class AppComponent extends ClientBase {
    private numClients: number = 0;
    private allClientsExpanded: number = 1; // -1 for none expanded, 0 for mixed, 1 for all expanded
    private numScriptStatuses: number = 0;
    private numScriptStatusesMatchingFilters: number = 0;

    private isLoading: boolean = true;
    private appServiceIsReady: boolean = false;
    private scriptStatusServiceIsReady: boolean = false;
    private isReconstructingDatepicker: boolean = false;

    private _darkTheme: boolean = true;
    private set darkTheme(darkTheme: boolean) {
        this._darkTheme = darkTheme;
        this.scriptStatusService.broadcastEvent(new Events.Internal.CallEvent('allScriptStatuses', { update: null }));
    };
    private get darkTheme(): boolean {
        return this._darkTheme;
    };

    private errorMessages: string[] | string[][] = [];

    private formLayers: formType[] = [];
    private formsShown: {[formName in formType]: boolean } = {
        EventLogForm: false,
        BaseForm: false,
        Changelog: false,
        DoneForm: false
    };

    private clients: IClient[] = [];
    private expandedClients: ObjectId[] = [];

    private _filters: any = DEFAULT_FILTERS;
    private set filters(filters: any) {
        this._filters = filters;
        this.onFiltersChange();
    };
    private get filters(): any {
        return this._filters;
    };

    private currentUser: Models.IUser;
    private inactivityTimer: NodeJS.Timer;
    private ngUnsubscribe: Subject<any> = new Subject<any>();
    private static __this: AppComponent;

    constructor(
        private appService: AppService,
        private scriptStatusService: ScriptStatusService,
        private clientService: ClientService,
        private modalService: ModalService) {
        super('AppComponent');
        this.displayLogs = false;
        this.logEventTextFormatting = 'color:violet';

        AppComponent.__this = this;
    }

    public ngOnInit(): void {
        this.subscribeToServices(); // ScriptStatusService is constructed before AppComponent is initialized
        this.appService.onAppReady();

        //setTimeout((): void => {
        //    AppComponent.__this.resetTimer();
        //    window.onmousemove = AppComponent.__this.resetTimer;
        //    window.onmousedown = AppComponent.__this.resetTimer;
        //    window.onclick = AppComponent.__this.resetTimer;
        //    window.onscroll = AppComponent.__this.resetTimer;
        //    window.onkeypress = AppComponent.__this.resetTimer;
        //});
    }

    public ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    private subscribeToServices(): void {
        var __this: AppComponent = this;
        var onServiceEvent: (event: EventInterfaces.Internal.IInternalEvent) => void = (event: EventInterfaces.Internal.IInternalEvent): void => { __this.eventHandler(event); };

        this.appService.broadcast.takeUntil(this.ngUnsubscribe).subscribe(onServiceEvent);
        this.scriptStatusService.broadcast.takeUntil(this.ngUnsubscribe).subscribe(onServiceEvent);
        this.clientService.broadcast.takeUntil(this.ngUnsubscribe).subscribe(onServiceEvent);
        this.modalService.broadcast.takeUntil(this.ngUnsubscribe).subscribe(onServiceEvent);
    }

    private eventHandler(event: EventInterfaces.Internal.IInternalEvent): void {
        if (event.destination == 'AppComponent') {
            this.logEvent('AppComponent received an event:', event);
            if (event instanceof Events.Internal.InternalEvent) {
                if (event instanceof Events.Internal.SetEvent) {
                    this.setProperties(event.props);
                } else if (event instanceof Events.Internal.CallEvent) {
                    this.callMethods(event.methods);
                } else if (event instanceof Events.Internal.ReadyEvent) {
                    this.onReady(event);
                } else {
                    this.logError('Error: unhandled internal event type;', event);
                }
            } else {
                this.logError('Error: unhandled event type;', event);
            }
        }
    }

    private onReady(event: EventInterfaces.Internal.IReadyEvent): void {
        switch (event.sender) {
            case 'AppService':
                this.onAppServiceReady();
                break;
            case 'ScriptStatusService':
                this.onScriptStatusServiceReady();
                break;
        }
    }

    private onAppServiceReady(): void {
        this.appServiceIsReady = true;
        this.appService.requestScriptStatuses();
    }

    private onScriptStatusServiceReady(): void {
        this.scriptStatusServiceIsReady = true;
        this.isLoading = false;
    }

    private resetTimer(): void {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout((): void => {
            AppComponent.__this.reloadScriptStatuses();
        }, INACTIVITY_RELOAD_TIMEOUT_SEC * 1000);
    }

    private reloadScriptStatuses(): void {
        // TODO: make sure this works (probably other flags that have to be cleared?)
        this.clientService.setClients([]);
        this.scriptStatusService.setScriptStatuses([]);
        this.appService.requestScriptStatuses();
        this.resetTimer();
    }

    private clientComparator(client1: IClient, client2: IClient): number {
        if (client1.name > client2.name) {
            return -1;
        } else if (client1.name == client2.name) {
            return 0;
        } else if (client1.name < client2.name) {
            return 1;
        }
    }

    private onClientExpanded(clientID: ObjectId, isExpanded: boolean): void {
        if (isExpanded) {
            this.expandedClients.push(clientID);
        } else {
            this.expandedClients.splice(this.expandedClients.findIndex((_id: ObjectId): boolean => { return clientID == _id; }), 1);
        }

        if (this.expandedClients.length == 0) {
            this.allClientsExpanded = -1;
        } else if (this.expandedClients.length == this.clients.length) {
            this.allClientsExpanded = 1;
        } else {
            this.allClientsExpanded = 0;
        }
    }
    
    private expandAllClients(): void {
        var makeExpanded: boolean = this.allClientsExpanded != 0 ? this.allClientsExpanded < 1 : false
        this.clientService.broadcastEvent(new Events.Internal.CallEvent('allClients', { expand: { clickEvent: null, makeExpanded: makeExpanded } }));
    }

    private showForm(formName: formType): void {
        if (this.formsShown.hasOwnProperty(formName)) {
            this.formsShown[formName] = true;
            this.formLayers.push(formName);
            this.modalService.showModal(<modalType>(formName));
        } else {
            this.logError('Error: AppComponent cannot show ' + formName + '; either AppComponent doesn\'t have access to it or it doesn\'t exist');
            // TODO: show error form here?
        }
    }

    private closeForms(formNames: formType | formType[]): void {
        // pass [] to formNames in order to close only topmost form, null to close all, or specify one or more form names
        if (formNames) {
            if (Array.isArray(formNames)) {
                if (formNames.length == 0) {
                    this.closeForm(this.formLayers[this.formLayers.length - 1]);
                } else {
                    for (var i: number = 0; i < formNames.length; i++) {
                        if (!this.closeForm(formNames[i])) {
                            break;
                        }
                    }
                }
            } else if (typeof formNames == 'string') {
                this.closeForm(formNames);
            } else {
                this.logError('Error: unhandled formNames type:', formNames);
            }
        } else {
            for (var i: number = this.formLayers.length - 1; i >= 0; i--) {
                this.closeForm(this.formLayers.pop());
            }
        }
    }

    private closeForm(formName: formType, event?: KeyboardEvent): boolean {
        if (event) {

        } else {
            if (this.formLayers.indexOf(formName) != -1 && this.formsShown[formName]) {
                this.formsShown[formName] = false;
                this.formLayers.splice(this.formLayers.indexOf(formName), 1);
            } else {
                this.logError('Error: cannot close form that isn\'t open;', formName, this.formsShown, this.formLayers);
                // TODO: show error form here?
                return false;
            }
        }
        return true;
    }

    private onStatusFiltersChange(source?: string): void {
        if (source == 'all') {
            for (var i: number = 0; i < this.filters.status.options.length; i++) {
                this.filters.status.options[i].checked = this.filters.status.allChecked;
            }
        } else {
            var allChecked: boolean = true;
            for (var i: number = 0; i < this.filters.status.options.length; i++) {
                if (!this.filters.status.options[i].checked) {
                    allChecked = false;
                    break;
                }
            }
            this.filters.status.allChecked = allChecked;
        }
        this.onFiltersChange();
    }

    private incrementNumScriptStatusesMatchingFilter(): void {
        this.numScriptStatusesMatchingFilters++;
    }

    private onFiltersChange(): void {
        this.numScriptStatusesMatchingFilters = 0;
        this.clientService.broadcastEvent(new Events.Internal.SetEvent('allClients', { numScriptStatusesMatchingFilters: 0 }));
        this.scriptStatusService.broadcastEvent(new Events.Internal.CallEvent('allScriptStatuses', { filter: { filters: this.filters } }));

        if (this.filters.estimatedCompletionDate == null) {
            this.isReconstructingDatepicker = true;
            var __this: AppComponent = this;
            setTimeout((): void => { __this.isReconstructingDatepicker = false; });
        }
    }

    private clearAllFilters(): void {
        this.filters = DEFAULT_FILTERS;
    }
}