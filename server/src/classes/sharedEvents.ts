import * as Util from 'util';

import { ISocketObject, ObjectId, UtilInspectType } from 'Radar-shared/interfaces/base.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';
import * as EventInterfaces from 'Radar-shared/interfaces/events.interface';

import { UTIL_INSPECT_STYLES } from './sharedBase';

import ISocket = EventInterfaces.Socket;
import Request = ISocket.Fetch.Request;
import Response = ISocket.Fetch.Response;
import Script = ISocket.Script;

Util.inspect.styles = UTIL_INSPECT_STYLES;
const INDENT_SPACES: number = 4;

export abstract class Event implements EventInterfaces.IEvent {
    constructor(public className: string = 'Event') {

    }

    [Util.inspect.custom](depth: number, options: Util.InspectOptions): string {
        var indent: string = ' '.repeat(INDENT_SPACES);

        var result: string = this.className + ' {\n' + indent;
        var inspected: string = Util.inspect(this.getProps(), options);

        inspected = inspected.replace(/{ /g, '').replace(/ }/g, '');
        result += inspected.replace(/\n  /g, '\n' + indent) + '\n}';

        return result;
    }

    private getProps(): any {
        var props: any = {};
        for (var prop in this) {
            if (this.hasOwnProperty(prop)) {
                props[prop] = this[prop];
            }
        }

        return props;
    }

    public toString(): string {
        var json: string = JSON.stringify(this, null, '\t');
        return this.className + ' ' + json.substring(0, json.length - 2) + '\n}';
    }
}

export namespace Socket {
    export abstract class SocketEvent extends Event implements ISocket.ISocketEvent, ISocketObject {
        constructor(className: string = 'SocketEvent', public socketID: string) {
            super(className);
        }
    }

    export abstract class FetchEvent extends SocketEvent implements ISocket.Fetch.IFetchEvent {
        constructor(className: string = 'FetchEvent', socketID: string) {
            super(className, socketID);
        }
    }

    export abstract class FetchRequestEvent extends FetchEvent implements Request.IFetchRequestEvent {
        constructor(className: string = 'FetchRequestEvent', socketID: string) {
            super(className, socketID);
        }
    }

    export class FetchCurrentUserRequestEvent extends FetchRequestEvent implements Request.IFetchCurrentUserRequestEvent {
        constructor(socketID: string, public passport: any) {
            super('FetchCurrentUserRequestEvent', socketID);
        }
    }

    export class FetchScriptStatusesRequestEvent extends FetchRequestEvent implements Request.IFetchScriptStatusesRequestEvent {
        constructor(socketID: string, public scriptStatusID?: ObjectId) {
            super('FetchScriptStatusesRequestEvent', socketID);
        }
    }

    export class FetchScriptEventsRequestEvent extends FetchRequestEvent implements Request.IFetchScriptEventsRequestEvent {
        constructor(socketID: string, public _project?: ObjectId) {
            super('FetchScriptEventsRequestEvent', socketID);
        }
    }

    export class FetchCompassProjectRequestEvent extends FetchRequestEvent implements Request.IFetchCompassProjectRequestEvent {
        constructor(socketID: string, public compassProjectID?: ObjectId) {
            super('FetchCompassProjectRequestEvent', socketID);
        }
    }

    export abstract class FetchResponseEvent extends FetchEvent implements Response.IFetchResponseEvent {
        constructor(className: string = 'FetchResponseEvent', socketID: string) {
            super(className, socketID);
        }
    }

    export class FetchCurrentUserResponseEvent extends FetchResponseEvent implements Response.IFetchCurrentUserResponseEvent {
        constructor(socketID: string, public currentUser: Models.IUser) {
            super('FetchCurrentUserResponseEvent', socketID);
        }
    }

    export class FetchScriptStatusesResponseEvent extends FetchResponseEvent implements Response.IFetchScriptStatusesResponseEvent {
        constructor(
            socketID: string,
            public scriptStatuses: Models.IScriptStatus[],
            public scriptStatusID?: ObjectId) {
            super('FetchScriptStatusesResponseEvent', socketID);
        }
    }

    export class FetchScriptEventsResponseEvent extends FetchResponseEvent implements Response.IFetchScriptEventsResponseEvent {
        constructor(
            socketID: string,
            public scriptEvents: Models.Script.IScriptEvent[],
            public _project?: ObjectId) {
            super('FetchScriptEventsResponseEvent', socketID);
        }
    }

    export class FetchCompassProjectResponseEvent extends FetchResponseEvent implements Response.IFetchCompassProjectResponseEvent {
        constructor(
            socketID: string,
            public compassProjects: Models.ICompassProject[],
            public compassProjectID?: ObjectId) {
            super('FetchCompassProjectResponseEvent', socketID);
        }
    }

    export class ErrorEvent extends SocketEvent implements ISocket.Errors.IErrorEvent {
        constructor(
            className: string = 'ErrorEvent',
            socketID: string,
            public errorMessage?: string) {
            super(className, socketID);
        }
    }

    export class ServerErrorEvent extends ErrorEvent implements ISocket.Errors.Server.IServerErrorEvent {
        constructor(className: string = 'ServerErrorEvent', socketID: string) {
            super(className, socketID);
        }
    }

    export class FetchErrorEvent extends ServerErrorEvent implements ISocket.Errors.Server.Fetch.IFetchErrorEvent {
        constructor(className: string = 'FetchErrorEvent', socketID: string) {
            super(className, socketID);
        }
    }

    export class FetchCurrentUserErrorEvent extends FetchErrorEvent implements ISocket.Errors.Server.Fetch.IFetchCurrentUserErrorEvent {
        constructor(socketID: string, public passport: any) {
            super('FetchCurrentUserErrorEvent', socketID);
        }
    }

    export class FetchScriptStatusesErrorEvent extends FetchErrorEvent implements ISocket.Errors.Server.Fetch.IFetchScriptStatusesErrorEvent {
        constructor(socketID: string, public scriptStatusID?: ObjectId) {
            super('FetchCompassProjectErrorEvent', socketID);
        }
    }

    export class FetchScriptEventsErrorEvent extends FetchErrorEvent implements ISocket.Errors.Server.Fetch.IFetchScriptEventsErrorEvent {
        constructor(socketID: string, public _project?: ObjectId) {
            super('FetchCompassProjectErrorEvent', socketID);
        }
    }

    export class FetchCompassProjectErrorEvent extends FetchErrorEvent implements ISocket.Errors.Server.Fetch.IFetchCompassProjectErrorEvent {
        constructor(socketID: string, public compassProjectID?: ObjectId) {
            super('FetchCompassProjectErrorEvent', socketID);
        }
    }

    export class UpdateErrorEvent extends ErrorEvent implements ISocket.Errors.Server.Update.IUpdateErrorEvent {
        constructor(className: string = 'UpdateErrorEvent', socketID: string) {
            super(className, socketID);
        }
    }

    export class ProjectErrorEvent extends UpdateErrorEvent implements ISocket.Errors.Server.Update.Project.IProjectErrorEvent {
        constructor(className: string = 'ProjectErrorEvent', socketID: string) {
            super(className, socketID);
        }
    }

    export class UpdateProjectErrorEvent extends ProjectErrorEvent implements ISocket.Errors.Server.Update.Project.IUpdateProjectErrorEvent {
        constructor(socketID: string) {
            super('UpdateProjectErrorEvent', socketID);
        }
    }

    export class UpdateScriptStatusErrorEvent extends UpdateErrorEvent implements ISocket.Errors.Server.Update.IUpdateScriptStatusErrorEvent {
        constructor(socketID: string,
            public _id: ObjectId,
            public props: any) {
            super('UpdateScriptStatusErrorEvent', socketID);
        }
    }

    export abstract class ClientErrorEvent extends ErrorEvent implements ISocket.Errors.Client.IClientErrorEvent {
        constructor(className: string = 'ClientErrorEvent', socketID: string) {
            super(className, socketID);
        }
    }

    export abstract class UpdateEvent extends SocketEvent implements ISocket.Updates.IUpdateEvent {
        constructor(className: string = 'UpdateEvent', socketID: string) {
            super(className, socketID);
        }
    }

    export abstract class ProjectEvent extends UpdateEvent implements ISocket.Updates.Project.IProjectEvent {
        constructor(className: string = 'ProjectEvent', socketID: string) {
            super(className, socketID);
        }
    }

    export class UpdateProjectEvent extends ProjectEvent implements ISocket.Updates.Project.IUpdateProjectEvent {
        constructor(socketID: string) {
            super('UpdateProjectEvent', socketID);
        }
    }

    export class UpdateScriptStatusEvent extends UpdateEvent implements ISocket.Updates.IUpdateScriptStatusEvent {
        constructor(socketID: string,
            public _id: ObjectId,
            public props: any) {
            super('UpdateScriptStatusEvent', socketID);
        }
    }

    export abstract class ScriptEvent extends SocketEvent implements Script.IScriptEvent {
        constructor(
            public className: EventInterfaces.Socket.Script.scriptEventType = 'ScriptEvent',
            public socketID: string,
            public _project: ObjectId,
            public timestamp: number) {
            super(className, socketID);
        }
    }

    export class OnOperationStartEvent extends ScriptEvent implements Script.IOnOperationStartEvent {
        constructor(
            socketID: string,
            _project: ObjectId,
            timestamp: number,
            public operation: Models.operationType,
            public estimatedBytes: number,
            public estimatedUnits: number,
            public unitNames: string[],
            public fromBeginning?: boolean,
            public description?: string) {
            super('OnOperationStopEvent', socketID, _project, timestamp);
        }
    }

    export class OnOperationStopEvent extends ScriptEvent implements Script.IOnOperationStopEvent {
        constructor(
            socketID: string,
            _project: ObjectId,
            timestamp: number,
            public isFinished: boolean) {
            super('OnOperationStopEvent', socketID, _project, timestamp);
        }
    }

    export abstract class UnitEvent extends ScriptEvent implements Script.IUnitEvent {
        constructor(
            className: EventInterfaces.Socket.Script.scriptEventType = 'UnitEvent',
            socketID: string,
            _project: ObjectId,
            timestamp: number,
            public unitName: string) {
            super(className, socketID, _project, timestamp);
        }
    }

    export class OnUnitStartEvent extends UnitEvent implements Script.IOnUnitStartEvent {
        constructor(
            socketID: string,
            _project: ObjectId,
            unitName: string,
            timestamp: number) {
            super('OnUnitStartEvent', socketID, _project, timestamp, unitName);
        }
    }

    export class OnUnitStopEvent extends UnitEvent implements Script.IOnUnitStopEvent {
        constructor(
            socketID: string,
            _project: ObjectId,
            unitName: string,
            timestamp: number,
            public bytesProcessed: number) {
            super('OnUnitStopEvent', socketID, _project, timestamp, unitName);
        }
    }

    export class OnUnitErrorEvent extends UnitEvent implements Script.IOnUnitErrorEvent {
        constructor(
            socketID: string,
            _project: ObjectId,
            timestamp: number,
            unitName: string,
            public errorMessage: string) {
            super('OnUnitErrorEvent', socketID, _project, timestamp, unitName);
        }
    }

    export class KeepAliveEvent extends ScriptEvent implements Script.IKeepAliveEvent {
        constructor(
            socketID: string,
            _project: ObjectId,
            timestamp: number) {
            super('KeepAliveEvent', socketID, _project, timestamp);
        }
    }
}