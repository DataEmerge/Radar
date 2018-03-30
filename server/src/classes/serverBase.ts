import * as JSONStableStringify from 'json-stable-stringify';
import * as Colors from 'colors';
import * as Util from 'util';

import { UtilInspectColor } from 'Radar-shared/interfaces/base.interface';
import { EventType, IEvent } from 'Radar-shared/interfaces/events.interface';

import * as EventInterfaces from 'interfaces/events.interface';

import { SharedBase, UTIL_INSPECT_STYLES } from 'classes/sharedBase';
import * as Components from 'classes/components';

import * as Events from 'classes/events';

const MAX_CLASSNAME_LETTERS: number = 50;
const DEFAULT_LOG_COLOR: UtilInspectColor = 'white';
const WARN_LOG_COLOR: UtilInspectColor = 'yellow';
const ERROR_LOG_COLOR: UtilInspectColor = 'red';
const EVENT_LOG_COLOR: UtilInspectColor = 'white'; // TODO: choose me?
const LINE_LOG_COLOR: UtilInspectColor = 'grey';
Util.inspect.styles = UTIL_INSPECT_STYLES;

/**
 *  Base class containing logging and event utility methods used across the server app.
 */
export class ServerBase extends SharedBase {
    constructor(public className: string = 'ServerBase', private logColors: string[] = ['white']) {
        super(className);
        if (className == 'Server') {
            console.log();
        }
        this.log('Contructing ' + className);
    }

    protected getNewEvent(eventType: EventType, className, ...args: any[]): IEvent {
        return new Events[eventType][className](...args);
    }

    protected getEventConstructor(eventType: EventType, className: string): Function {
        return Events[eventType][className];
    }

    protected getNewComponent(className, ...args: any[]): IEvent {
        if (Components[className]) {
            return new Components[className](...args);
        } else if (Events.Internal[className]) {
            return new Events.Internal[className](...args);
        } else if (Events.Socket[className]) {
            return new Events.Socket[className](...args);
        }
    }

    protected getComponentConstructor(className: string): Function {
        if (Components[className]) {
            return Components[className];
        } else if (Events.Internal[className]) {
            return Events.Internal[className];
        } else if (Events.Socket[className]) {
            return Events.Socket[className];
        }
    }

    protected equalObjects(o1: any, o2: any): boolean {
        return JSONStableStringify(o1) === JSONStableStringify(o2);
    }

    protected parseEvent(message: any): IEvent {
        if (Events.Internal[message.className]) {
            return this.constructEvent(message, 'Internal');
        } else if (Events.Socket[message.className]) {
            return this.constructEvent(message, 'Socket');
        } else {
            return null;
        }
    }

    protected log(...args: any[]): void {
        if (this.displayLogs) {
            this.consoleLog(DEFAULT_LOG_COLOR, ...args);
        }
    }

    protected logEvent(...args: any[]): void {
        this.log(...args); // TODO: change logs in places to event logs (like server/socket events) and format output here differently
    }

    protected logWarn(...args: any[]): void {
        if (this.displayLogs) {
            this.consoleLog(WARN_LOG_COLOR, ...args);
        }
    }

    protected logError(...args: any[]): void {
        this.consoleLog(ERROR_LOG_COLOR, ...args); // always log errors
    }

    private consoleLog(color: UtilInspectColor, ...args: any[]): void {
        var indent: string = ' '.repeat(MAX_CLASSNAME_LETTERS);
        var resultLines: string[] = this.formatArgs(color, ...args).join(' ').split('\n');

        for (var i: number = 1; i < resultLines.length; i++) {
            var lineColor: UtilInspectColor = color;
            if (lineColor == DEFAULT_LOG_COLOR) {
                lineColor = LINE_LOG_COLOR;
            }
            resultLines[i] = indent + Colors[lineColor]('| ') + resultLines[i];
        }

        console.log(this.formatTimestamp(), this.formatClassName(color), resultLines.join('\n'));
    }

    private formatTimestamp(): string {
        return Colors.white('[') + Colors.grey(this.formatDate(Date.now())) + Colors.white(']');
    }

    private formatClassName(color: UtilInspectColor): string {
        const TIMESTAMP_CHAR_COUNT: number = 25;
        var className: string = this.getClassLogColors()('[' + this.className + ']');
        for (var i: number = TIMESTAMP_CHAR_COUNT; i < MAX_CLASSNAME_LETTERS - (this.className.length + 2); i++) {
            className += ' ';
        }

        var lineColor: UtilInspectColor = color;
        if (lineColor == DEFAULT_LOG_COLOR) {
            lineColor = LINE_LOG_COLOR;
        }
        className += Colors[lineColor]('|');

        return className;
    }

    private formatArgs(color: UtilInspectColor, ...args: any[]): string[] {
        return args.map((arg: any): string => {
            return typeof arg == 'string' ? Colors[color](arg) : Util.inspect(arg, false, null, true);
        });
    }

    private getClassLogColors(): Function {
        return this.logColors.slice(1).reduce((prevStyle: any, nextStyle: string): string => {
            return prevStyle[nextStyle];
        }, Colors[this.logColors[0]]);
    }
    
    protected logState(): void {
        var displayLogs: boolean = this.displayLogs;
        this.displayLogs = true;
        this.log(displayLogs);
        this.displayLogs = displayLogs;
    }
}