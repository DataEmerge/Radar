import { ObjectId, ISocketObject } from 'Radar-shared/interfaces/base.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';
import * as EventInterfaces from 'Radar-shared/interfaces/events.interface';

export abstract class SocketObject implements ISocketObject {
    constructor(public className: string = 'SocketObject') {

    }
}

/**
 *  Class for a ScriptStatus object used serverside and in Mongo.
 */
export class ScriptStatus extends SocketObject implements Models.IScriptStatus {
    public isRunning: boolean = false;
    public isProcessing: boolean = false;
    public currentUnit: string = null;
    public errorList: string[] = [];
    public totalBytes: number = -1;
    public totalUnits: number = -1;
    public bytesProcessed: number = 0;
    public unitsProcessed: number = 0;
    public startDate: number;
    public stopDate: number;
    public lastUpdated: number;
    public units: Models.unitType[] = [];
    public downTime: number;
    public restarts: number;
    public description: string;

    constructor(
        public _id: ObjectId,
        public _project: ObjectId | Models.ICompassProject,
        public operation: Models.operationType,
        public status: EventInterfaces.Socket.Script.scriptStatusType) {
        super('ScriptStatus');
    }
}

export abstract class Project extends SocketObject implements Models.IProject {
    public state: string = 'Current';

    constructor(public className: string = 'Project', public _id: ObjectId) {
        super(className);
    }
}

export class CompassProject extends Project implements Models.ICompassProject {
    public lastUpdated: Date;
    public state: Models.compassProjectState;
    public SOWDescription: string;
    public status: Models.compassProjectStatus;
    public name: string;
    public database: Models.IDatabase;
    public system: Models.ISystem;
    public referenceNum: number;
    public client: Models.IClient;
    public facility: Models.IFacility;
    public subfacility: Models.ISubfacility;
    public vendor: Models.IVendor;
    public version: string;
    public roles: Models.IRole[];

    constructor(_id: ObjectId) {
        super('CompassProject', _id);
    }
}