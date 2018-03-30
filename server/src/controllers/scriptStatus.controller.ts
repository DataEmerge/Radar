import { Query, Schema } from 'mongoose';

import { ObjectId, ErrorCallback } from 'Radar-shared/interfaces/base.interface';
import { IEvent } from 'Radar-shared/interfaces/events.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';

import * as EventInterfaces from 'interfaces/events.interface';
import * as DocumentModels from 'interfaces/models.interface';

import * as Components from 'Radar-shared/classes/components';

import * as Events from 'classes/events';

import { BaseController } from 'controllers/base.controller';

import ProjectEvents = EventInterfaces.Socket.Updates.Project;
import ScriptEvents = EventInterfaces.Socket.Script;

const KEEP_ALIVE_TIMEOUT_SECONDS: number = 60;

/**
 *  Class that processes scriptEvents given to it by the event handler.
 *  
 *  Mostly just inserts the events into the database.
 *  If a database error occurs, an error is logged to the console and an error event is sent back up the process chain.
 *  Otherwise, a script status update event is sent back up the process chain (usually to be sent to the client).
 *  Either way, an event is then sent to the queue controller to request the next event in the queue.

 *  The event handler process is passed into each method just to ensure that the IPC is consistent. Since this controller is an instance class, it's
 *      probably unnecessary, but it works this way.
 */
export class ScriptStatusController extends BaseController {
    private keepAliveTimers: { [projectID: string]: NodeJS.Timer } = {};

    constructor(private models: DocumentModels.IModel) {
        super('ScriptStatusController', ['cyan']);
        this.displayLogs = true;
    }

    public async onOperationStart(process: NodeJS.Process, event: ScriptEvents.IOnOperationStartEvent): Promise<void> {
        var __this: ScriptStatusController = this;
        var logError: ErrorCallback = (error: any): void => {
            if (error) {
                __this.logError('Error:', error);
                process.send(new Events.Socket.UpdateScriptStatusErrorEvent(event.socketID, scriptStatusDoc._id, {}));
            }
        };

        this.log('Received OnOperationStartEvent [' + event.operation + '] from API for Compass project', event._project);
        var scriptStatusDoc: DocumentModels.IScriptStatus = await this.models.ScriptStatus.findOne({ _project: event._project }, logError).exec();

        if (scriptStatusDoc) {
            if (!scriptStatusDoc.isRunning) {
                var currentUnits: Models.unitType[] = this.findCurrentUnits(scriptStatusDoc.units);
                if (currentUnits.length == 0) {
                    await this.updateScriptStatusToRunning(process, scriptStatusDoc, event, logError);
                } else {
                    await this.updateScriptStatusToUnknown(process, scriptStatusDoc, event.socketID, logError, 'script is already processing ' + scriptStatusDoc.units[scriptStatusDoc.units.length - 1]);
                }
            } else {
                await this.updateScriptStatusToUnknown(process, scriptStatusDoc, event.socketID, logError, 'script is already running');
            }
        } else {
            await this.createNewScriptStatus(process, event, logError); // if no doc found, assuming first event received for this project, so create new timer and new status
        }

        process.send(new Events.Internal.DoneHandlingEvent(event.constructor.name, event.socketID));
    }

    public async onOperationStop(process: NodeJS.Process, event: ScriptEvents.IOnOperationStopEvent): Promise<void> {
        var __this: ScriptStatusController = this;
        var logError: ErrorCallback = (errors: any[]): void => {
            if (errors && errors.length > 1 && errors[0]) {
                __this.logError('Error:', ...errors);
                process.send(new Events.Socket.UpdateScriptStatusErrorEvent(event.socketID, scriptStatusDoc._id, {}));
            }
        };

        this.log('Received OnOperationStopEvent from API for Compass project', event._project);
        var scriptStatusDoc: DocumentModels.IScriptStatus = await this.models.ScriptStatus.findOne({ _project: event._project }, logError).exec();

        if (scriptStatusDoc) {
            if (scriptStatusDoc.isRunning) {
                this.clearKeepAliveTimer(event._project.toString());
                await this.updateScriptStatusToCompleted(process, scriptStatusDoc, event, logError);
            } else {
                await this.updateScriptStatusToUnknown(process, scriptStatusDoc, event.socketID, logError, 'script is not running');
            }
        }

        process.send(new Events.Internal.DoneHandlingEvent(event.constructor.name, event.socketID));
    }

    public async onUnitStart(process: NodeJS.Process, event: ScriptEvents.IOnUnitStartEvent): Promise<void> {
        var __this: ScriptStatusController = this;
        var logError: ErrorCallback = (error: any): void => {
            if (error) {
                __this.logError('Error:', error);
                process.send(new Events.Socket.UpdateScriptStatusErrorEvent(event.socketID, scriptStatusDoc._id, {}));
            }
        };

        this.log('Received OnUnitStartEvent [' + event.unitName + '] from API for Compass project', event._project);
        var scriptStatusDoc: DocumentModels.IScriptStatus = await this.models.ScriptStatus.findOne({ _project: event._project }, logError).exec();

        if (scriptStatusDoc) {
            if (scriptStatusDoc.isRunning) {
                var unit: Models.unitType = this.findUnit(scriptStatusDoc.units, event.unitName);
                if (unit && !unit.isProcessing) {
                    await this.updateScriptStatusToProcessing(process, scriptStatusDoc, event, logError);
                } else {
                    var message: string = unit ? 'script is already processing ' + event.unitName : ' unknown unit name "' + event.unitName + '"';
                    await this.updateScriptStatusToUnknown(process, scriptStatusDoc, event.socketID, logError, message);
                }
            } else {
                await this.updateScriptStatusToUnknown(process, scriptStatusDoc, event.socketID, logError, 'script is not running');
            }
        }

        process.send(new Events.Internal.DoneHandlingEvent(event.constructor.name, event.socketID));
    }

    public async onUnitStop(process: NodeJS.Process, event: ScriptEvents.IOnUnitStopEvent): Promise<void> {
        var __this: ScriptStatusController = this;
        var logError: ErrorCallback = (error: any): void => {
            if (error) {
                __this.logError('Error:', error);
                process.send(new Events.Socket.UpdateScriptStatusErrorEvent(event.socketID, scriptStatusDoc._id, {}));
            }
        };

        this.log('Received OnUnitStopEvent [' + event.unitName + '] from API for Compass project', event._project);
        var scriptStatusDoc: DocumentModels.IScriptStatus = await this.models.ScriptStatus.findOne({ _project: event._project }, logError).exec();

        if (scriptStatusDoc) {
            if (scriptStatusDoc.isRunning) {
                var unit: Models.unitType = this.findUnit(scriptStatusDoc.units, event.unitName);
                if (unit && unit.isProcessing) {
                    await this.updateScriptStatusToNotProcessing(process, scriptStatusDoc, event, logError);
                } else {
                    var message: string = unit ? 'script is not processing ' + event.unitName : ' unknown unit name "' + event.unitName + '"';
                    await this.updateScriptStatusToUnknown(process, scriptStatusDoc, event.socketID, logError, message);
                }
            } else {
                await this.updateScriptStatusToUnknown(process, scriptStatusDoc, event.socketID, logError, 'script is not running');
            }
        }

        process.send(new Events.Internal.DoneHandlingEvent(event.constructor.name, event.socketID));
    }

    public async onUnitError(process: NodeJS.Process, event: ScriptEvents.IOnUnitErrorEvent): Promise<void> {
        var __this: ScriptStatusController = this;
        var logError: ErrorCallback = (error: any): void => {
            if (error) {
                __this.logError('Error:', error);
                process.send(new Events.Socket.UpdateScriptStatusErrorEvent(event.socketID, scriptStatusDoc._id, {}));
            }
        };

        this.log('Received OnUnitErrorEvent [' + event.unitName + '] from API for Compass project', event._project);
        var scriptStatusDoc: DocumentModels.IScriptStatus = await this.models.ScriptStatus.findOne({ _project: event._project }, logError).exec();

        if (scriptStatusDoc) {
            if (scriptStatusDoc.isRunning) {
                var unit: Models.unitType = this.findUnit(scriptStatusDoc.units, event.unitName);
                if (unit && unit.isProcessing) {
                    await this.updateScriptStatusToErrored(process, scriptStatusDoc, event, logError);
                } else {
                    var message: string = unit ? 'script is not processing ' + event.unitName : ' unknown unit name "' + event.unitName + '"';
                    await this.updateScriptStatusToUnknown(process, scriptStatusDoc, event.socketID, logError, message);
                }
            } else {
                await this.updateScriptStatusToUnknown(process, scriptStatusDoc, event.socketID, logError, 'script is not running');
            }
        }

        process.send(new Events.Internal.DoneHandlingEvent(event.constructor.name, event.socketID));
    }

    public async onKeepAlive(process: NodeJS.Process, event: ScriptEvents.IKeepAliveEvent): Promise<void> {
        this.log('Received KeepAliveEvent from API for Compass project', event._project);
        this.setKeepAliveTimer(process, <any>event._project, event.socketID);
        process.send(new Events.Internal.DoneHandlingEvent(event.constructor.name, event.socketID));
    }

    private async updateScriptStatusToRunning(process: NodeJS.Process, scriptStatusDoc: DocumentModels.IScriptStatus, event: ScriptEvents.IOnOperationStartEvent, logError: ErrorCallback): Promise<void> {
        scriptStatusDoc.isRunning = true;
        scriptStatusDoc.operation = event.operation;
        scriptStatusDoc.description = event.description;

        var numRestarts: number = await this.calculateNumRestarts(<ObjectId>scriptStatusDoc._project, logError);

        if (event.fromBeginning === true || event.fromBeginning == null) {
            // if fresh start from the beginning, reset units list entirely
            scriptStatusDoc.units = [];
            this.resetUnits(event, scriptStatusDoc, false);

            scriptStatusDoc.totalBytes = event.estimatedBytes > 0 ? event.estimatedBytes : null;
            scriptStatusDoc.totalUnits = event.estimatedUnits > 0 ? event.estimatedUnits : null;
        } else {
            this.resetUnits(event, scriptStatusDoc, true); // if not starting from the beginning, reset all the units to process to unprocessed state, and incorporate any new units
            numRestarts++; // also assume it's a resume event if not starting from the beginning
        }

        scriptStatusDoc.downTime = null;
        scriptStatusDoc.stopDate = null;

        scriptStatusDoc.status = 'Running';
        scriptStatusDoc.startDate = event.timestamp;
        scriptStatusDoc.lastUpdated = Date.now();
        await scriptStatusDoc.save(logError);

        process.send(new Events.Socket.UpdateScriptStatusEvent(event.socketID, scriptStatusDoc._id, {
            isRunning: scriptStatusDoc.isRunning,
            operation: scriptStatusDoc.operation,
            status: scriptStatusDoc.status,
            lastUpdated: scriptStatusDoc.lastUpdated,
            units: scriptStatusDoc.units,
            restarts: numRestarts,
            totalBytes: scriptStatusDoc.totalBytes,
            totalUnits: scriptStatusDoc.totalUnits,
            downTime: scriptStatusDoc.downTime,
            stopDate: scriptStatusDoc.stopDate,
            startDate: scriptStatusDoc.startDate
        }));
    }

    private async updateScriptStatusToCompleted(process: NodeJS.Process, scriptStatusDoc: DocumentModels.IScriptStatus, event: ScriptEvents.IOnOperationStopEvent, logError: ErrorCallback): Promise<void> {
        if (scriptStatusDoc.status != 'Errored') {
            scriptStatusDoc.status = event.isFinished ? 'Completed' : 'Stopped';
        }

        for (var i: number = 0; i < scriptStatusDoc.units.length; i++) {
            scriptStatusDoc.units[i].isProcessing = false;
        }

        scriptStatusDoc.isRunning = false;
        scriptStatusDoc.stopDate = Date.now();
        scriptStatusDoc.lastUpdated = Date.now();
        await scriptStatusDoc.save(logError);

        process.send(new Events.Socket.UpdateScriptStatusEvent(event.socketID, scriptStatusDoc._id, {
            isRunning: scriptStatusDoc.isRunning,
            status: scriptStatusDoc.status,
            lastUpdated: scriptStatusDoc.lastUpdated,
            downTime: Date.now()
        }));
    }

    private async updateScriptStatusToProcessing(process: NodeJS.Process, scriptStatusDoc: DocumentModels.IScriptStatus, event: ScriptEvents.IOnUnitStartEvent, logError: ErrorCallback): Promise<void> {
        var unit: Models.unitType = this.findUnit(scriptStatusDoc.units, event.unitName);
        unit.isProcessing = true;

        scriptStatusDoc.lastUpdated = Date.now();
        await scriptStatusDoc.save(logError);

        process.send(new Events.Socket.UpdateScriptStatusEvent(event.socketID, scriptStatusDoc._id, {
            isRunning: scriptStatusDoc.isRunning,
            lastUpdated: scriptStatusDoc.lastUpdated,
            units: scriptStatusDoc.units
        }));
    }

    private async updateScriptStatusToNotProcessing(process: NodeJS.Process, scriptStatusDoc: DocumentModels.IScriptStatus, event: ScriptEvents.IOnUnitStopEvent, logError: ErrorCallback): Promise<void> {
        var unit: Models.unitType = this.findUnit(scriptStatusDoc.units, event.unitName);
        unit.isProcessing = false;
        unit.bytesProcessed = event.bytesProcessed;

        var onUnitStartEvents: DocumentModels.IScriptEvent[] = await this.models.ScriptEvent.find({
            _project: event._project,
            unitName: event.unitName,
            className: 'OnUnitStartEvent'
        }, logError).exec();

        if (onUnitStartEvents.length > 0) {
            onUnitStartEvents.sort((event1: DocumentModels.IScriptEvent, event2: DocumentModels.IScriptEvent): number => { return event1.timestamp - event2.timestamp; });
            var lastOnUnitStartEvent: DocumentModels.IScriptEvent = onUnitStartEvents[onUnitStartEvents.length - 1];
            unit.timeElapsed = event.timestamp - lastOnUnitStartEvent.timestamp;
        } else {
            unit.timeElapsed = -1;
            logError('Error: no unit start event found for unit ' + event.unitName);
        }

        scriptStatusDoc.unitsProcessed++;
        scriptStatusDoc.bytesProcessed += event.bytesProcessed;
        scriptStatusDoc.lastUpdated = Date.now();

        await scriptStatusDoc.save(logError);

        process.send(new Events.Socket.UpdateScriptStatusEvent(event.socketID, scriptStatusDoc._id, {
            lastUpdated: scriptStatusDoc.lastUpdated,
            units: scriptStatusDoc.units,
            bytesProcessed: scriptStatusDoc.bytesProcessed,
            unitsProcessed: scriptStatusDoc.unitsProcessed
        }));
    }

    private async updateScriptStatusToErrored(process: NodeJS.Process, scriptStatusDoc: DocumentModels.IScriptStatus, event: ScriptEvents.IOnUnitErrorEvent, logError: ErrorCallback): Promise<void> {
        var currentUnits: Models.unitType[] = this.findCurrentUnits(scriptStatusDoc.units);
        var erroredUnit: Models.unitType = this.findUnit(currentUnits, event.unitName);
        erroredUnit.isProcessing = false;

        var onUnitStartEvents: DocumentModels.IScriptEvent[] = await this.models.ScriptEvent.find({
            _project: event._project,
            unitName: event.unitName,
            className: 'OnUnitStartEvent'
        }, logError).exec();

        if (onUnitStartEvents.length > 0) {
            onUnitStartEvents.sort((event1: DocumentModels.IScriptEvent, event2: DocumentModels.IScriptEvent): number => { return event1.timestamp - event2.timestamp; });
            var lastOnUnitStartEvent: DocumentModels.IScriptEvent = onUnitStartEvents[onUnitStartEvents.length - 1];
            erroredUnit.timeElapsed = event.timestamp - lastOnUnitStartEvent.timestamp;
        } else {
            erroredUnit.timeElapsed = -1;
            logError('Error: no unit start event found for unit ' + event.unitName);
        }

        scriptStatusDoc.status = 'Errored';
        scriptStatusDoc.errorList.push(event.errorMessage);
        scriptStatusDoc.lastUpdated = Date.now();
        await scriptStatusDoc.save(logError);

        process.send(new Events.Socket.UpdateScriptStatusEvent(event.socketID, scriptStatusDoc._id, {
            status: scriptStatusDoc.status,
            lastUpdated: scriptStatusDoc.lastUpdated,
            units: scriptStatusDoc.units,
            errorList: scriptStatusDoc.errorList
        }));
    }

    private async updateScriptStatusToUnknown(process: NodeJS.Process, scriptStatusDoc: DocumentModels.IScriptStatus, socketID: string, logError: ErrorCallback, ...errorMessages: string[]): Promise<void> {
        logError(...errorMessages);
        scriptStatusDoc.status = 'Unknown';
        scriptStatusDoc.lastUpdated = Date.now();
        await scriptStatusDoc.save(logError);

        process.send(new Events.Socket.UpdateScriptStatusEvent(socketID, scriptStatusDoc._id, {
            status: scriptStatusDoc.status,
            lastUpdated: scriptStatusDoc.lastUpdated
        }));
    }

    private async createNewScriptStatus(process: NodeJS.Process, event: ScriptEvents.IOnOperationStartEvent, logError: ErrorCallback): Promise<void> {
        this.setKeepAliveTimer(process, <any>event._project, event.socketID); // <-- event._project will come in as a string, not an ObjectId, so casting to make the compiler happy

        var scriptStatus: Models.IScriptStatus = new Components.ScriptStatus(null, event._project, event.operation, 'Running');

        if (event.estimatedBytes > 0) {
            scriptStatus.totalBytes = event.estimatedBytes;
        }
        if (event.estimatedUnits > 0) {
            scriptStatus.totalUnits = event.estimatedUnits;
        }

        scriptStatus.startDate = Date.now();
        scriptStatus.lastUpdated = Date.now();
        scriptStatus.isRunning = true;

        // add all the units
        for (var i: number = 0; i < event.unitNames.length; i++) {
            scriptStatus.units.push({
                unitName: event.unitNames[i],
                isProcessing: false,
                bytesProcessed: null,
                timeElapsed: null
            });
        }

        delete scriptStatus._id;
        await this.models.ScriptStatus.create(scriptStatus, async (error: any, newScriptStatus: DocumentModels.IScriptStatus): Promise<void> => {
            if (!error) {
                process.send(new Events.Socket.UpdateScriptStatusEvent(event.socketID, newScriptStatus._id, newScriptStatus.toObject()));
            } else {
                logError(error);
            }
        });
    }

    private async calculateNumRestarts(_project: ObjectId, logError: ErrorCallback): Promise<number> {
        var numRestarts: number = 0;
        var stopEventFound: boolean = false;
        var scriptEvents: Models.Script.IScriptEvent[] = <Models.Script.IScriptEvent[]>await this.models.ScriptEvent.find({ _project: _project }, logError).lean().exec();

        for (var i: number = 0; i < scriptEvents.length; i++) {
            if (!stopEventFound && scriptEvents[i].className == 'OnOperationStopEvent') {
                stopEventFound = true;
            } else if (stopEventFound && scriptEvents[i].className == 'OnOperationStartEvent' && !(<Models.Script.IOnOperationStartEvent>scriptEvents[i]).fromBeginning) {
                numRestarts++;
                stopEventFound = false;
            }
        }

        return numRestarts;
    }

    private resetUnits(event: ScriptEvents.IOnOperationStartEvent, scriptStatusDoc: DocumentModels.IScriptStatus, incorporateNewUnits: boolean): void {
        for (var i: number = 0; i < event.unitNames.length; i++) {
            if (!incorporateNewUnits) {
                var unit: Models.unitType = this.findUnit(scriptStatusDoc.units, event.unitNames[i]);
                if (unit) {
                    unit.bytesProcessed = null;
                    unit.timeElapsed = null;
                }
            } else {
                scriptStatusDoc.units.push({
                    unitName: event.unitNames[i],
                    isProcessing: false,
                    bytesProcessed: null,
                    timeElapsed: null
                });
            }
        }
    }

    private findCurrentUnits(units: Models.unitType[]): Models.unitType[] {
        var currentUnits: Models.unitType[] = [];
        for (var i: number = 0; i < units.length; i++) {
            if (units[i].isProcessing) {
                currentUnits.push(units[i]);
            }
        }
        return currentUnits;
    }

    private findUnit(units: Models.unitType[], unitName: string): Models.unitType {
        return units.find((unit: Models.unitType): boolean => { return unit.unitName == unitName; });
    }

    private async setKeepAliveTimer(process: NodeJS.Process, _project: string, socketID: string): Promise<void> {
        this.clearKeepAliveTimer(_project);
        var __this: ScriptStatusController = this;
        this.keepAliveTimers[_project] = setTimeout(async (): Promise<void> => { __this.onKeepAliveExpire(process, _project, socketID); }, 1000 * KEEP_ALIVE_TIMEOUT_SECONDS);
    }

    private clearKeepAliveTimer(_project: string): void {
        clearTimeout(this.keepAliveTimers[_project]);
        delete this.keepAliveTimers[_project];
    }

    private async onKeepAliveExpire(process: NodeJS.Process, _project: string, socketID: string): Promise<void> {
        this.log('KeepAlive timeout expired for Compass project', _project);

        var __this: ScriptStatusController = this;
        var logError: ErrorCallback = (error: any): void => {
            if (error) {
                __this.logError('Error:', error);
            }
        };
        var scriptStatusDoc: DocumentModels.IScriptStatus = await this.models.ScriptStatus.findOne({ _project: _project }, 'units _project', logError).exec();

        // send onUnitError for each current unit
        var currentUnits: Models.unitType[] = this.findCurrentUnits(scriptStatusDoc.units);
        for (var i: number = 0; i < currentUnits.length; i++) {
            var onUnitErrorEvent: ScriptEvents.IOnUnitErrorEvent = new Events.Socket.OnUnitErrorEvent(socketID, <any>_project, Date.now(), currentUnits[i].unitName, 'KeepAlive timeout expired');
            this.onUnitError(process, onUnitErrorEvent);
        }

        // send onOperationStop
        var onOperationStopEvent: ScriptEvents.IOnOperationStopEvent = new Events.Socket.OnOperationStopEvent(socketID, <any>_project, Date.now(), false);
        this.onOperationStop(process, onOperationStopEvent);
    }

    private getCurrentUnitNames(scriptStatusDoc: DocumentModels.IScriptStatus): string[] {
        var currentUnits: Models.unitType[] = this.findCurrentUnits(scriptStatusDoc.units);
        var currentUnitNames: string[] = [];
        for (var i: number = 0; i < currentUnits.length; i++) {
            currentUnitNames.push(currentUnits[i].unitName);
        }
        return currentUnitNames;
    }
}