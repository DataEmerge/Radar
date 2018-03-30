import { Query } from 'mongoose';

import { ObjectId, ErrorCallback } from 'Radar-shared/interfaces/base.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';

import * as DocumentModels from 'interfaces/models.interface';
import * as EventInterfaces from 'interfaces/events.interface';

import * as Components from 'Radar-shared/classes/components';

import * as Events from 'classes/events';

import { BaseController } from 'controllers/base.controller';

import Request = EventInterfaces.Socket.Fetch.Request;

/**
 *  Class that processes fetch requests given to it by the event handler.
 *  
 *  Mostly just executes queries and returns the results.
 *  If a database error occurs, an error is logged to the console and an error event is sent back up the process chain.
 *  Otherwise, an event with the query results is sent back up the process chain (usually to be sent to the client).
 *  Either way, an event is then sent to the queue controller to request the next event in the queue.
 * 
 *  Some population of certain properties that are ObjectIds or computed happens, like for scriptStatuses and Compass projects.
 * 
 *  The event handler process is passed into each method just to ensure that the IPC is consistent. Since this controller is an instance class, it's
 *      probably unnecessary, but it works this way.
 */
export class FetchController extends BaseController {
    constructor(private models: DocumentModels.IModel) {
        super('FetchController', ['yellow']);
        this.displayLogs = true;
    }

    public async fetchCompassProjects(process: NodeJS.Process, event: Request.IFetchCompassProjectRequestEvent, fromQueue: boolean = true): Promise<void | Models.ICompassProject> {
        const COMPASS_PROJECT_PROJECTION: string = 'name referenceNum client facility subfacility vendor system database version roles';

        if (fromQueue) {
            this.log('Fetching current Compass projects' + (event.compassProjectID ? 'with _id ' + event.compassProjectID : ''));
        }

        var __this: FetchController = this;
        var logError: ErrorCallback = (error: any): void => {
            if (error) {
                __this.logError('Error fetching current Compass projects' + (event.compassProjectID ? ' with _id ' + event.compassProjectID : '') + ':', error);
                process.send(new Events.Socket.FetchCompassProjectErrorEvent(event.socketID, event.compassProjectID));
            }
        };

        var options: any = { state: 'Current' };
        if (event.compassProjectID) {
            options._id = event.compassProjectID;
        }

        var compassProjectDocs: DocumentModels.ICompassProject[] = await this.models.CompassProject.find(options, COMPASS_PROJECT_PROJECTION, logError).exec();
        if (fromQueue) {
            this.log('Found', compassProjectDocs.length, 'Compass project(s) matching query:', options);
        }

        var compassProjects: Models.ICompassProject[] = [];
        for (var i: number = 0; i < compassProjectDocs.length; i++) {
            var compassProject: Models.ICompassProject = new Components.CompassProject(compassProjectDocs[i]._id);
            var compassProjectObject: Models.ICompassProject = <Models.ICompassProject>(<any>compassProjectDocs[i]).toObject();

            for (var prop in compassProjectObject) {
                if (compassProjectObject.hasOwnProperty(prop)) {
                    compassProject[prop] = compassProjectObject[prop];
                }
            }

            compassProjects.push(await this.populateCompassProject(compassProject, compassProjectObject, logError));
        }
        if (fromQueue && compassProjects.length > 0) {
            this.log('Populated', compassProjects.length, 'Compass project(s)');
        }

        if (event.compassProjectID) {
            if (compassProjectDocs.length == 1) {
                if (fromQueue) {
                    process.send(new Events.Socket.FetchCompassProjectResponseEvent(event.socketID, [compassProjects[0]]));
                } else {
                    return compassProjects[0];
                }
            } else {
                this.logError('Error: an invalid number of Compass projects (' + compassProjectDocs.length + ') was found; there\'s probably either some inconsistency in the database IDs or the wrong ID(s) were passed');
                logError('^');
            }
        } else {
            process.send(new Events.Socket.FetchCompassProjectResponseEvent(event.socketID, compassProjects));
        }

        if (fromQueue) {
            process.send(new Events.Internal.DoneHandlingEvent(event.constructor.name, event.socketID));
        }
    }

    private async populateCompassProject(compassProject: Models.ICompassProject, compassProjectObject: Models.ICompassProject, logError: ErrorCallback): Promise<Models.ICompassProject> {
        if (compassProjectObject.client) {
            if (await this.models.Client.count(compassProjectObject.client, logError).exec() > 0) {
                compassProject.client = <Models.IClient>(await this.models.Client.findById(compassProjectObject.client, logError).exec()).toObject();
            } else {
                logError('no client found for project ' + compassProjectObject._id);
            }
        }
        if (compassProjectObject.facility) {
            if (await this.models.Facility.count(compassProjectObject.facility, logError).exec() > 0) {
                compassProject.facility = <Models.IFacility>(await this.models.Facility.findById(compassProjectObject.facility, logError).exec()).toObject();
            } else {
                logError('no facility found for project ' + compassProjectObject._id);
            }
        }
        if (compassProjectObject.subfacility) {
            if (await this.models.Subfacility.count(compassProjectObject.subfacility, logError).exec() > 0) {
                compassProject.subfacility = <Models.ISubfacility>(await this.models.Subfacility.findById(compassProjectObject.subfacility, logError).exec()).toObject();
            } else {
                logError('no subfacility found for project ' + compassProjectObject._id);
            }
        }
        if (compassProjectObject.vendor) {
            if (await this.models.Vendor.count(compassProjectObject.vendor, logError).exec() > 0) {
                compassProject.vendor = <Models.IVendor>(await this.models.Vendor.findById(compassProjectObject.vendor, logError).exec()).toObject();
            } else {
                logError('no vendor found for project ' + compassProjectObject._id);
            }
        }
        if (compassProjectObject.system) {
            if (await this.models.System.count(compassProjectObject.system, logError).exec() > 0) {
                compassProject.system = <Models.ISystem>(await this.models.System.findById(compassProjectObject.system, logError).exec()).toObject();
            } else {
                logError('no system found for project ' + compassProjectObject._id);
            }
        }
        if (compassProjectObject.database) {
            if (await this.models.Database.count(compassProjectObject.database, logError).exec() > 0) {
                compassProject.database = <Models.IDatabase>(await this.models.Database.findById(compassProjectObject.database, logError).exec()).toObject();
            } else {
                logError('no database found for project ' + compassProjectObject._id);
            }
        }
        if (compassProjectObject.roles) {
            if (await this.models.Role.count(compassProjectObject.roles, logError).exec() > 0) {
                var roles: Models.IRole[] = <Models.IRole[]>await this.models.Role.find({ _id: { $in: compassProjectObject.roles } }, logError).lean().exec();
                for (var i: number = 0; i < roles.length; i++) {
                    roles[i].user = <Models.IUser>(await this.models.User.findById(roles[i].user).exec()).toObject();
                }
                compassProject.roles = roles;
            } else {
                logError('no roles found for project ' + compassProjectObject._id);
            }
        }

        return compassProject;
    }

    public async fetchScriptEvents(process: NodeJS.Process, event: Request.IFetchScriptEventsRequestEvent): Promise<void> {
        this.log('Fetching script events' + (event._project ? ' for Compass project ' + event._project : ''));

        var __this: FetchController = this;
        var logError: ErrorCallback = (error: any): void => {
            if (error) {
                __this.logError('Error fetching script events:', error);
                process.send(new Events.Socket.FetchScriptEventsErrorEvent(event.socketID));
            }
        };

        var options: any = {};
        if (event._project) {
            options._project = event._project;
        }
        var scriptEvents: Models.Script.IScriptEvent[] = <Models.Script.IScriptEvent[]>await this.models.ScriptEvent.find(options, logError).lean().exec();
        this.log('Found', scriptEvents.length, 'script event' + (scriptEvents.length != 1 ? 's' : ''));

        process.send(new Events.Socket.FetchScriptEventsResponseEvent(event.socketID, scriptEvents, event._project));
        process.send(new Events.Internal.DoneHandlingEvent(event.constructor.name, event.socketID));
    }

    public async fetchScriptStatuses(process: NodeJS.Process, event: Request.IFetchScriptStatusesRequestEvent): Promise<void> {
        this.log('Fetching script statuses');

        var __this: FetchController = this;
        var logError: ErrorCallback = (error: any): void => {
            if (error) {
                __this.logError('Error fetching script statuses:', error);
                process.send(new Events.Socket.FetchScriptStatusesErrorEvent(event.socketID));
            }
        };

        var scriptStatuses: Models.IScriptStatus[] = <Models.IScriptStatus[]>await this.models.ScriptStatus.find(logError).lean().exec();
        this.log('Found', scriptStatuses.length, 'script status' + (scriptStatuses.length != 1 ? 'es' : ''));
        
        for (var i: number = 0; i < scriptStatuses.length; i++) {
            await this.calcScriptStatusComputedProps(process, event.socketID, scriptStatuses[i]);
        }
        if (scriptStatuses.length > 0) {
            this.log('Populated', scriptStatuses.length, 'script status' + (scriptStatuses.length != 1 ? 'es' : ''));
        }

        process.send(new Events.Socket.FetchScriptStatusesResponseEvent(event.socketID, scriptStatuses));
        process.send(new Events.Internal.DoneHandlingEvent(event.constructor.name, event.socketID));
    }

    private async calcScriptStatusComputedProps(process: NodeJS.Process, socketID: string, scriptStatus: Models.IScriptStatus): Promise<void> {
        var __this: FetchController = this;
        var logError: ErrorCallback = (error: any): void => {
            if (error) {
                __this.logError('Error fetching script statuses:', error);
                process.send(new Events.Socket.FetchScriptStatusesErrorEvent(socketID));
            }
        };

        var scriptEvents: Models.Script.IScriptEvent[] = <Models.Script.IScriptEvent[]>await this.models.ScriptEvent.find({ _project: scriptStatus._project }, logError).lean().exec();

        // calculate last down time
        if (scriptStatus.status == 'Stopped' || scriptStatus.status == 'Errored') {
            for (var i: number = scriptEvents.length - 1; i > 0; i--) {
                if (scriptEvents[i].className == 'OnOperationStopEvent') {
                    scriptStatus.downTime = scriptEvents[i].timestamp;
                    break;
                }
            }
        }

        // calculate number of restarts
        var numRestarts: number = 0;
        var stopEventFound: boolean = false;
        for (var i: number = 0; i < scriptEvents.length; i++) {
            if (!stopEventFound && scriptEvents[i].className == 'OnOperationStopEvent') {
                stopEventFound = true;
            } else if (stopEventFound && scriptEvents[i].className == 'OnOperationStartEvent') {
                numRestarts++;
                stopEventFound = false;
            }
        }
        scriptStatus.restarts = numRestarts;

        scriptStatus._project = <Models.ICompassProject>await this.fetchCompassProjects(process, new Events.Socket.FetchCompassProjectRequestEvent(socketID, <ObjectId>scriptStatus._project), false);
    }

    public async fetchCurrentUser(process: NodeJS.Process, event: Request.IFetchCurrentUserRequestEvent): Promise<void> {
        var passport = event.passport;
        this.log('Fetching current user', passport ? passport.user : '');

        if (passport != null && passport.user != null) {
            var user: DocumentModels.IUser = await this.models.User.findById(passport.user).exec();
            this.log('Found current user:', user.displayName);
            process.send(new Events.Socket.FetchCurrentUserResponseEvent(event.socketID, user));
        } else {
            this.logError('Error: passport (' + passport + ') is null' + (passport ? ' or passport.user (' + passport.user + ') is null' : ''));
            process.send(new Events.Socket.FetchCurrentUserErrorEvent(event.socketID, event.passport));
        }

        process.send(new Events.Internal.DoneHandlingEvent(event.constructor.name, event.socketID));
    }
}