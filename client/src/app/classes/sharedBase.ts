import * as Moment from 'moment-timezone';

import { ObjectId, ISocketObject, UtilInspectType } from 'Radar-shared/interfaces/base.interface';
import { IEvent, EventType } from 'Radar-shared/interfaces/events.interface';

import { Event, Socket } from './sharedEvents';
import { SocketObject } from './components';

export const UTIL_INSPECT_STYLES: UtilInspectType = {
    number: 'yellow',
    boolean: 'cyan',
    string: 'green',
    date: 'magenta',
    regexp: 'red',
    null: 'bold',
    undefined: 'bold',
    special: 'cyan',
    name: 'grey'
};

/**
 *  Base class containing utility methods for event and class construction, object and string manipulation, and other miscellanous actions.
 */
export abstract class SharedBase {
    protected displayLogs: boolean = true;

    constructor(public className: string = 'Base') {

    }

    protected abstract log(...args: any[]): void;

    protected abstract logEvent(...args: any[]): void;

    protected abstract logWarn(...args: any[]): void;

    protected abstract logError(...args: any[]): void;

    protected abstract getNewEvent(eventType: EventType, className, ...args: any[]): IEvent;

    protected abstract getEventConstructor(eventType: EventType, className: string): Function;

    protected abstract getNewComponent(className, ...args: any[]): IEvent;

    protected abstract getComponentConstructor(className: string): Function;

    protected constructEvent(eventObject: any, eventType: EventType): IEvent {
        var className: string = eventObject.className;
        var socketID: string = eventObject.socketID;

        if (className && ((eventType == 'Socket' && socketID) || eventType == 'Internal')) {
            var args: any[] = this.getConstructorArgs(this.getEventConstructor(eventType, className), eventObject);
            var event: IEvent = this.getNewEvent(eventType, className, ...args);

            // assign non-parameter properties
            for (var prop in eventObject) {
                if (eventObject.hasOwnProperty(prop) && !this.isConstructorParam(prop, this.getEventConstructor(eventType, className))) {
                    event[prop] = eventObject[prop];
                }
            }

            if (event instanceof Event) {
                return event;
            } else {
                this.logError('Error: could not construct event from', eventObject);
                return null;
            }
        } else {
            this.logError('Error: could not construct event from object; either no class name or no socketID available in', eventObject);
            return null;
        }
    }

    private isConstructorParam(param: string, func: Function): boolean {
        var classToStringLines: string[] = (<Function>func).toString().split('\n');

        for (var i: number = 0; i < classToStringLines.length; i++) {
            var line: string = classToStringLines[i];

            if (line.includes(') {')) {
                return false;
            }

            if (line.includes(param)) {
                return true;
            }
        }

        return false;
    }

    private constructSocketObject(socketObjectObject: any): ISocketObject {
        var className: string = socketObjectObject.className;
        if (className) {
            var args: any[] = this.getConstructorArgs(this.getComponentConstructor(className), socketObjectObject);
            var socketObject = this.getNewComponent(className, ...args);

            // assign non-parameter properties
            for (var prop in socketObjectObject) {
                if (socketObjectObject.hasOwnProperty(prop) && !this.isConstructorParam(prop, this.getComponentConstructor(className))) {
                    socketObject[prop] = socketObjectObject[prop];
                }
            }

            if (socketObject instanceof Socket.SocketEvent || socketObject instanceof SocketObject) {
                return socketObject;
            } else {
                this.logError('Error: could not construct socketObject from', socketObjectObject);
                return null;
            }
        } else {
            this.logError('Error: could not construct socketObject; no class name available in', socketObjectObject);
            return null;
        }
    }

    private getConstructorArgs(constructor: Function, componentObject: any): any[] {
        var lines: string[] = constructor.toString().split('\n');

        // note: depending on second line of class to be constructor function header
        var constructorLine: string = lines[1];

        // note: depending on format "constructor(param1, param2 = defaultValue) {" for constructor line
        var params: string[] = this.getParamNames(constructorLine);

        var defaultedParams: { [name: string]: any } = this.getDefaultedParams(constructorLine);
        var props: string[] = Object.keys(componentObject);

        // add args for all parameters
        var args: any[] = [];
        for (var i: number = 0; i < params.length; i++) {
            args.push(componentObject[params[i]]);
        }

        // pop any args for a defaulted parameter that already have the default value, stopping at first non-defaulted parameter arg
        for (var i: number = params.length - 1; i >= 0; i--) {
            var param: string = params[i];
            var isDefaulted: boolean = Object.keys(defaultedParams).indexOf(param) != -1;
            if (isDefaulted) {
                var sameAsDefaultValue: boolean = this.equalObjects(defaultedParams[param], componentObject[param]);
                if (sameAsDefaultValue) {
                    args.pop();
                }
            } else {
                break;
            }
        }

        // construct any args that are socket objects or arrays of socket objects
        for (var i: number = 0; i < args.length; i++) {
            if (args[i] && args[i].hasOwnProperty('className')) {
                args[i] = this.constructSocketObject(args[i]);
            } else if (Array.isArray(args[i])) {
                for (var j: number = 0; j < args[i].length; j++) {
                    var argIJ: any = args[i][j];
                    if (args[i][j] && args[i][j].hasOwnProperty('className')) {
                        args[i][j] = this.constructSocketObject(args[i][j]);
                    }
                }
            }
        }

        return args;
    }

    private getConstructorParams(constructorLine: string): string[] {
        return constructorLine.substring(constructorLine.indexOf('(') + 1, constructorLine.length - 3).split(', ');
    }

    private getParamNames(constructorLine: string): string[] {
        var paramNames: string[] = [];
        var params: string[] = this.getConstructorParams(constructorLine);
        for (var i: number = 0; i < params.length; i++) {
            paramNames.push(params[i].indexOf('=') == -1 ? params[i] : params[i].substring(0, params[i].indexOf('=') - 1));
        }
        return paramNames;
    }

    private getDefaultedParams(constructorLine: string): { [name: string]: any } {
        var defaultedParams: any = {};
        var params: string[] = this.getConstructorParams(constructorLine);

        if (params) {
            for (var i: number = 0; i < params.length; i++) {
                var param: string = params[i];
                var equalsIndex: number = param.indexOf('=');

                if (equalsIndex != -1) {
                    var paramName: string = param.substring(0, equalsIndex - 1);
                    var defaultValue: any = this.parseFromString(param.substring(equalsIndex + 2));
                    defaultedParams[paramName] = defaultValue;
                }
            }
        }

        return defaultedParams;
    }

    protected abstract equalObjects(o1: any, o2: any): boolean;

    protected isObjectId(id: ObjectId | string): boolean {
        if (id.hasOwnProperty('toHexString')) {
            return true;
        } else if (typeof id == 'string') {
            return id.length == 24 && (parseInt(id, 16).toString() === id);
        } else {
            return false;
        }
    }

    private isObject(value: any): boolean {
        return typeof value == 'object' && !Array.isArray(value);
    }

    private isArray(value: any): boolean {
        return Array.isArray(value);
    }

    private isPrimitive(value: any): boolean {
        return typeof value != 'object';
    }

    private isString(value: any): boolean {
        return typeof value == 'string';
    }

    private isBoolean(value: any): boolean {
        return typeof value == 'boolean';
    }

    private isNumber(value: any): boolean {
        return typeof value == 'number';
    }

    private stringify(value: any): string {
        return JSON.stringify(value);
    }

    protected stringFuzzyIncludes(parent: string, child: string): boolean {
        return parent.toLowerCase().includes(child.toLowerCase());
    }

    protected pascalCaseWithSeparators(name: string): string {
        const separators: string[] = [' ', '_'];

        if (name) {
            name = name[0].toUpperCase() + name.substring(1).toLowerCase();

            for (var i: number = 0; i < name.length; i++) {
                if (separators.indexOf(name[i]) != -1 && i < name.length - 1) {
                    var tempName: string = name.substring(0, i + 1) + name[i + 1].toUpperCase();

                    if (i + 2 < name.length) {
                        tempName += name.substring(i + 2);
                    }

                    name = tempName;
                }
            }
        }

        return name;
    }

    protected pascalCaseWithSpaces(name: string): string {
        var prettyName: string = '';

        if (name && name.length > 0) {
            prettyName += name[0].toUpperCase();

            for (var i: number = 1; i < name.length; i++) {
                if (name[i] === name[i].toUpperCase()) {
                    prettyName += ' ';
                }

                prettyName += name[i];
            }
        }

        return prettyName;
    }

    protected copy(source: any): any {
        if (typeof source != 'object' || source == null) {
            return source;
        }

        var copy: any = new source.constructor();
        this.updateProps(copy, source);

        return copy;
    }

    protected parseFromString(value: string): any {
        try {
            return JSON.parse(value);
        } catch (error) {
            return value;
        }
    }

    protected updateProps(props: any): void;
    protected updateProps(object: any, props: any): void;
    protected updateProps(object: any, props: any, ...extraConditions: boolean[]): void;

    protected updateProps(param1: any, param2?: any, ...extraConditions: boolean[]): void {
        switch (arguments.length) {
            case 0:
                this.logError('Error: no parameters passed to updateObjectProps');
                break;
            case 1:
                this.updateObjectProps(this, param1, ...[]);
                break;
            case 2:
                this.updateObjectProps(param1, param2, ...[]);
                break;
            default:
                this.updateObjectProps(param1, param2, ...extraConditions);
                break;
        }
    }

    private updateObjectProps(object: any, props: any, ...extraConditions: boolean[]): void {
        for (var prop in props) {
            if (props.hasOwnProperty(prop) && this.evaluateExtraConditions(...extraConditions)) {
                object[prop] = this.copy(props[prop]);
            }
        }
    }

    private evaluateExtraConditions(...extraConditions: boolean[]): boolean {
        for (var i: number = 0; i < extraConditions.length; i++) {
            if (!extraConditions[i]) {
                return false;
            }
        }

        return true;
    }

    protected formatDate(msDate: number): string {
        if (msDate != null) {
            var isDST: boolean = Moment.tz(new Date(msDate), 'America/New_York').isDST();
            var timezone: string = isDST ? 'EDT' : 'EST';
            var date: Date = new Date(Date.parse(Moment.tz(new Date(msDate), 'America/New_York').format()));
            var hours: number = date.getHours();
            if (hours > 12) {
                hours -= 12;
            }
            var minutes: number = date.getMinutes();

            var formattedDate: string =
                this.getWeekday(date.getDay()) + ' ' +
                this.getMonth(date.getMonth()) + ' ' +
                date.getDate() + ' ' +
                (hours == 0 ? '12' : (hours < 10 ? '0' + hours : hours)) + ':' +
                (minutes == 0 ? '00' : (minutes < 10 ? '0' + minutes : minutes)) +
                (date.getHours() >= 12 ? ' PM' : ' AM') + ' ' +
                timezone;
            return formattedDate;
        } else {
            return '';
        }
    }

    private getWeekday(weekdayNumber: number): string {
        switch (weekdayNumber) {
            case 0: return 'Sun';
            case 1: return 'Mon';
            case 2: return 'Tue';
            case 3: return 'Wed';
            case 4: return 'Thu';
            case 5: return 'Fri';
            case 6: return 'Sat';
            default:
                this.logError('Error: invalid weekday number (' + weekdayNumber + ')');
                return 'INVALID_WEEKDAY';
        }
    }

    private getMonth(monthNumber: number): string {
        switch (monthNumber) {
            case 0: return 'Jan';
            case 1: return 'Feb';
            case 2: return 'Mar';
            case 3: return 'Apr';
            case 4: return 'May';
            case 5: return 'Jun';
            case 6: return 'Jul';
            case 7: return 'Aug';
            case 8: return 'Sep';
            case 9: return 'Oct';
            case 10: return 'Nov';
            case 11: return 'Dec';
            default:
                this.logError('Error: invalid month number (' + monthNumber + ')');
                return 'INVALID_MONTH';
        }
    }
}