import Mongoose = require('mongoose');
Mongoose.Promise = global.Promise;

import { ServerBase } from 'classes/serverBase';
import * as Events from 'classes/events';

import { IEvent } from 'Radar-shared/interfaces/events.interface';

import * as EventInterfaces from 'interfaces/events.interface';
import * as DocumentModels from 'interfaces/models.interface';

import { FetchController } from 'controllers/fetch.controller';
import { ScriptStatusController } from 'controllers/scriptStatus.controller';

import * as Models from 'interfaces/models.interface';

import { scriptStatusSchema } from 'src/schemas/scriptStatus.schema';

import { compassProjectSchema } from 'schemas/compassProject.schema';
import { clientSchema } from 'schemas/client.schema';
import { facilitySchema } from 'schemas/facility.schema';
import { subfacilitySchema } from 'schemas/subfacility.schema';
import { vendorSchema } from 'schemas/vendor.schema';
import { systemSchema } from 'schemas/system.schema';
import { databaseSchema } from 'schemas/database.schema';
import { userSchema } from 'schemas/user.schema';
import { roleSchema } from 'schemas/role.schema';
import { scriptEventSchema } from 'schemas/scriptEvent.schema';

import Errors = EventInterfaces.Socket.Errors;
import Updates = EventInterfaces.Socket.Updates;
import Script = EventInterfaces.Socket.Script;

const LOCALHOST_PATH: string = 'mongodb://localhost/';
const RADAR_DB_NAME: string = 'Radar';
const COMPASS_DB_NAME: string = 'projectstatus';

/**
 *  Class that handles ScriptEvents received by the app's express server and sent from the queue controller.
 *  Makes the connections to the Mongo databases and routes events to the appropriate controller based on the event type.
 *  
 *  Forked from the queue controller process to run asynchronously (see the app and the queue controller for the explanations as to why and how,
 *      respectively). It has an instance of each of the controllers (not forked processes), since it receives one event at a time.
 *  
 *  After handling an event, it sends either the original event or an error event back up to the queue controller.
 */
class EventHandler extends ServerBase {
    private fetchController: FetchController;
    private scriptStatusController: ScriptStatusController;

    private models: Models.IModel = Object();
    private RadarConnection: Mongoose.Connection;
    private CompassConnection: Mongoose.Connection;

    constructor(private process: NodeJS.Process) {
        super('EventHandler', ['green']);
        this.displayLogs = false;

        var __this: EventHandler = this;
        this.process.on('message', (message: any): void => {
            __this.onQueueControllerMessage(message);
        });

        this.createMongooseConnections();
        this.setModels();

        this.fetchController = new FetchController(this.models);
        this.scriptStatusController = new ScriptStatusController(this.models);
        this.process.send(new Events.Internal.ReadyEvent('eventHandler'));
    }

    private createMongooseConnections(): void {
        this.RadarConnection = Mongoose.createConnection(LOCALHOST_PATH + RADAR_DB_NAME);
        this.log('Connected to ' + LOCALHOST_PATH + RADAR_DB_NAME);

        this.CompassConnection = Mongoose.createConnection(LOCALHOST_PATH + COMPASS_DB_NAME);
        this.log('Connected to ' + LOCALHOST_PATH + COMPASS_DB_NAME);
    }

    private setModels(): void {
        this.models.ScriptStatus = this.RadarConnection.model<Models.IScriptStatus>('ScriptStatus', scriptStatusSchema, 'scriptstatuses');
        this.models.ScriptEvent = this.RadarConnection.model<Models.IScriptEvent>('ScriptEvent', scriptEventSchema, 'scriptevents');

        this.models.CompassProject = this.CompassConnection.model<Models.ICompassProject>('CompassProject', compassProjectSchema, 'projects');
        this.models.Vendor = this.CompassConnection.model<Models.IVendor>('Vendor', vendorSchema, 'vendors');
        this.models.System = this.CompassConnection.model<Models.ISystem>('System', systemSchema, 'systems');
        this.models.Client = this.CompassConnection.model<Models.IClient>('Client', clientSchema, 'clients');
        this.models.Facility = this.CompassConnection.model<Models.IFacility>('Facility', facilitySchema, 'facilities');
        this.models.Subfacility = this.CompassConnection.model<Models.ISubfacility>('Subfacility', subfacilitySchema, 'subfacilities');
        this.models.Database = this.CompassConnection.model<Models.IDatabase>('Database', databaseSchema, 'databases');
        this.models.User = this.CompassConnection.model<Models.IUser>('User', userSchema, 'users');
        this.models.Role = this.CompassConnection.model<Models.IRole>('Role', roleSchema, 'roles');
    }

    private onQueueControllerMessage(message: IEvent): void {
        var event: IEvent = this.parseEvent(message);
        this.log('Received', event ? event.constructor.name : 'message', 'from QueueController', event ? '' : ':' + message);

        if (event) {
            this.handleEvent(event);
        } else {
            this.logError('Error: unable to handle non-event message');
            // TODO: handle error here better
            // TODO: handle error in queueController
            this.process.send(new Events.Socket.ErrorEvent('ErrorEvent', (<EventInterfaces.Socket.ISocketEvent>event).socketID, 'Bad message: ' + message + ' resulted in event ' + event));
            this.process.send(new Events.Internal.DoneHandlingEvent(event.className, (<EventInterfaces.Socket.ISocketEvent>event).socketID));
        }
    }

    private async handleEvent(event: IEvent): Promise<void> {
        if (event instanceof Events.Socket.SocketEvent) {
            if (!this.handleSocketEvent(event)) {
                // TODO: handle error here better
                //process.send(new Events.Socket.ErrorEvent('ErrorEvent', (<EventInterfaces.Socket.ISocketEvent>event).socketID, 'Error handling ' + event.constructor.name + ': ' + error));
                this.logError('Error handling ' + event.constructor.name + '; ^');
            }
        } else if (event instanceof Events.Internal.InternalEvent) {
            this.handleInternalEvent(event);
        } else {
            this.logError('Error: server shouldn\'t receive an abstract Event:', event);
        }
    }

    private handleInternalEvent(event: EventInterfaces.Internal.IInternalEvent): void {
        if (event instanceof Events.Internal.LogsEvent) {
            this.handleLogsEvent(event);
        } else {
            this.logError('Error: unhandled internal event type;', event);
        }
    }

    private handleLogsEvent(event: EventInterfaces.Internal.ILogsEvent): void {
        if (event.logs.hasOwnProperty('all')) {
            this.displayLogs = true;
            this.log('EventHandler logging turned', event.logs.all ? 'on' : 'off');
            this.fetchController.showLogs(event.logs.all);
            
            if (event.logs.all == false) {
                this.log('Mongoose logging turned', event.logs.all ? 'on' : 'off');
                Mongoose.set('debug', event.logs.all);
            }
            this.displayLogs = event.logs.all;
        } else if (event.logs.hasOwnProperty('eventHandler')) {
            this.displayLogs = true;
            this.log('EventHandler logging turned', event.logs.eventHandler ? 'on' : 'off');
            this.displayLogs = event.logs.eventHandler;
        } else if (event.logs.hasOwnProperty('fetchController')) {
            this.fetchController.showLogs(event.logs.fetchController);
        } else if (event.logs.hasOwnProperty('mongoose')) {
            var displayLogs: boolean = this.displayLogs;
            this.displayLogs = true;
            this.log('Mongoose logging turned', event.logs.mongoose ? 'on' : 'off');
            this.displayLogs = displayLogs;
            Mongoose.set('debug', event.logs.mongoose);
        } else if (event.logs.hasOwnProperty('states')) {
            this.logState();
            this.fetchController.showLogs();
        }
        console.log('');
    }

    private handleSocketEvent(event: EventInterfaces.Socket.ISocketEvent): boolean {
        if (event instanceof Events.Socket.FetchEvent) {
            return this.handleFetchEvent(event);
        } else if (event instanceof Events.Socket.ErrorEvent) {
            return this.handleErrorEvent(event);
        } else if (event instanceof Events.Socket.UpdateEvent) {
            return this.handleUpdateEvent(event);
        } else if (event instanceof Events.Socket.ScriptEvent) {
            return this.handleScriptEvent(event);
        } else {
            this.logError('Error: server shouldn\'t receive an abstract SocketEvent:', event);
            return false;
        }
    }

    private handleFetchEvent(event: EventInterfaces.Socket.Fetch.IFetchEvent): boolean {
        if (event instanceof Events.Socket.FetchRequestEvent) {
            if (event instanceof Events.Socket.FetchCurrentUserRequestEvent) {
                this.fetchController.fetchCurrentUser(this.process, event);
            } else if (event instanceof Events.Socket.FetchScriptStatusesRequestEvent) {
                this.fetchController.fetchScriptStatuses(this.process, event);
            } else if (event instanceof Events.Socket.FetchScriptEventsRequestEvent) {
                this.fetchController.fetchScriptEvents(this.process, event);
            } else if (event instanceof Events.Socket.FetchCompassProjectRequestEvent) {
                this.fetchController.fetchCompassProjects(this.process, event);
            } else {
                this.logError('Error: server shouldn\'t receive an abstract FetchRequestEvent:', event);
                return false;
            }
        } else if (event instanceof Events.Socket.FetchResponseEvent) {
            this.logError('Error: server shouldn\'t receive a FetchResponseEvent:', event);
            return false;
        } else {
            this.logError('Error: server shouldn\'t receive an abstract FetchEvent:', event);
            return false;
        }
        return true;
    }
    
    private handleErrorEvent(event: Errors.IErrorEvent): boolean {
        if (event instanceof Events.Socket.ClientErrorEvent) {
            return this.handleClientErrorEvent(event);
        } else if (event instanceof Events.Socket.ServerErrorEvent) {
            this.logError('Error: server shouldn\'t receive a ServerErrorEvent:', event);
            return false;
        } else {
            this.logError('Error: server shouldn\'t receive an abstract ErrorEvent:', event);
            return false;
        }
    }

    private handleClientErrorEvent(event: Errors.Client.IClientErrorEvent): boolean {
        // TODO: handle client error event
        return true;
    }

    private handleUpdateEvent(event: Updates.IUpdateEvent): boolean {
        this.logError('Error: server shouldn\'t receive an UpdateEvent:', event);
        return false;
    }

    private handleScriptEvent(event: Script.IScriptEvent): boolean {
        if (event instanceof Events.Socket.OnOperationStartEvent) {
            this.scriptStatusController.onOperationStart(this.process, event);
        } else if (event instanceof Events.Socket.OnOperationStopEvent) {
            this.scriptStatusController.onOperationStop(this.process, event);
        } else if (event instanceof Events.Socket.OnUnitStartEvent) {
            this.scriptStatusController.onUnitStart(this.process, event);
        } else if (event instanceof Events.Socket.OnUnitErrorEvent) {
            this.scriptStatusController.onUnitError(this.process, event);
        } else if (event instanceof Events.Socket.OnUnitStopEvent) {
            this.scriptStatusController.onUnitStop(this.process, event);
        } else if (event instanceof Events.Socket.KeepAliveEvent) {
            this.scriptStatusController.onKeepAlive(this.process, event);
        } else {
            this.logError('Error: server shouldn\'t receive an abstract ScriptEvent:', event);
            return false;
        }
        return true;
    }
}

const eventHandler: EventHandler = new EventHandler(process);