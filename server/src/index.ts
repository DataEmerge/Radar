import * as HTTP from 'http';
import * as HTTPS from 'https';
import * as Debug from 'debug';

import { App } from 'src/app';

import { ServerBase } from 'classes/serverBase';

import * as EventInterfaces from 'interfaces/events.interface';

//const debug: Debug.IDebugger = Debug('server:index');

const PORT: number = 9013;
const LOG_VALUE_ALIASES: string[] = ['true', 'false', 't', 'f', 'on', 'off'];
const LOG_COMMAND_ALIASES = {
    states: ['states', 'state'],
    all: ['all'],
    app: ['app', 'App'],
    queueController: ['queue', 'queuecontroller', 'eventqueue'],
    eventHandler: ['event', 'eventhandler', 'events'],
    scriptStatusController: ['script', 'scripts', 'statuses', 'scriptstatus', 'scriptstatuses', 'scriptStatuses', 'status', 'scriptStatusController', 'scriptstatuscontroller'],
    fetchController: ['fetch', 'fetching', 'get', 'fetchcontroller'],
    mongoose: ['db', 'database', 'mongoose', 'mongo', 'mongodb', 'query'],
    reset: ['reset', 'default', 'defaults']
};

/**
 *  Class that is run to start the app; its primary functionality is to run app.js and give the user some more flexible control through commands.
 *  Note: the commands here aren't available when the app is run from pm2, and the console colors don't work there either.
 *  It's not super cohesive, but it's not going to be used much.
 */
class Server extends ServerBase {
    private isRunning: boolean = false;
    private app: App;
    private stdin: NodeJS.Socket = process.openStdin();
    private server: HTTP.Server | HTTPS.Server;
    private commandsList: ICommandsList = {
        clear: { aliases: ['cls', 'clear'], action: { function: console.log, args: ['\x1Bc'] }, description: 'Clears the console' },
        restart: { aliases: ['rs', 'restart'], action: { function: this.restart, args: [] }, description: 'Restarts the app' },
        start: { aliases: ['start'], action: { function: this.start, args: [] }, description: 'Starts the app' },
        stop: { aliases: ['stop', 's'], action: { function: this.stop, args: [] }, description: 'Stops the app' },
        quit: { aliases: ['q', 'quit'], action: { function: this.quit, args: [] }, description: 'Stops the app and exit the process' },
        logs: { aliases: ['log', 'logs', 'displayLogs', 'showLogs', 'debug'], action: { function: this.logs }, description: 'Reports the logging state, resets, or turns logging on or off for a specified class or group of classes' },
        help: { aliases: ['help'], action: { function: this.showHelp }, description: 'Displays help for accepted commands' },
    };

    constructor() {
        super('Server', ['grey']);
        this.stdin.addListener('data', (data: any): void => { this.onUserInput((<string>data.toString()).trim().split(' ')); });
        this.start();
    }

    private start(): void {
        if (!this.isRunning) {
            this.isRunning = true;
            this.log('Starting server');
            this.app = new App();
            this.app.express.set('port', PORT);
            
            if (__dirname.split('/')[0] !== 'var' && __dirname.split('/')[1] !== 'var') {
                HTTP.createServer(this.app.express)
            } else {
                HTTPS.createServer(<HTTPS.ServerOptions>this.app.express);
            }

            this.server = this.app.express.listen(PORT);

            var __this: Server = this;
            this.server.on('error', (error: NodeJS.ErrnoException): void => { __this.onError(error); });
            this.server.on('listening', (): void => { __this.onListening(); });
            this.app.setHTTPServer(this.server);
        } else {
            this.log('Server already started');
        }
    }

    private restart(): void {
        this.log('Restarting server...');
        this.stop();
        this.start();
    }

    private stop(): void {
        this.log('Stopping server...');
        this.app.stop();
        this.server.close();
        this.isRunning = false;
        this.log('Server has stopped');
    }

    private quit(): void {
        this.stop();
        this.log('Quitting process');
        this.log('Buh-bye! :D');
        process.exit();
    }

    private onUserInput(input: string[]): void {
        if (input) {
            var inputCommand: string = input[0].toLowerCase();
            if (inputCommand.length > 0) {
                input.shift();
                var inputArgs: string[] = input.map((inputArg: string): string => { return inputArg.toLowerCase(); });

                for (var command in this.commandsList) {
                    if (this.commandsList.hasOwnProperty(command)) {
                        var commandOption = this.commandsList[command];
                        if (commandOption.aliases.indexOf(inputCommand) != -1) {
                            if (commandOption.action.args && inputArgs.length > 0) {
                                this.logError('Error: ' + command + ' does not accept arguments; type \"help ' + command + '\" for help');
                                return;
                            }

                            commandOption.action.function.call(this, ...(commandOption.action.args ? commandOption.action.args : inputArgs));
                            return;
                        }
                    }
                }

                this.logError('Error: unknown command; type \"help\" for a list of commands');
            }
        }
    }

    private logs(logCommand: string, value: string): void {
        if (logCommand) {
            for (var alias in LOG_COMMAND_ALIASES) {
                if (LOG_COMMAND_ALIASES.hasOwnProperty(alias)) {
                    if (LOG_COMMAND_ALIASES[alias].indexOf(logCommand) != -1) {
                        if (value == 'true' || value == 't' || value == 'on') {
                            this.app.logs(<EventInterfaces.Internal.logClasses>alias, true);
                            return;
                        } else if (value == 'false' || value == 'f' || value == 'off') {
                            this.app.logs(<EventInterfaces.Internal.logClasses>alias, false);
                            return;
                        } else if (alias == 'reset') {
                            this.app.logs(alias);
                            return;
                        } else if (alias == 'states') {
                            this.log('Log states:');
                            this.app.logs(alias);
                            return;
                        } else {
                            this.logError('Error: invalid value for argument \"displayLogs\"; type \"help logs\" for a list of argument options');
                            return;
                        }
                    }
                }
            }

            this.logError('Error: invalid value for argument \"logCommand\"; type \"help logs\" for a list of argument options');
        } else {
            this.log('Log states:');
            this.app.logs('states');
        }
    }

    private showHelp(inputCommand: string, ...options: string[]): void {
        if (inputCommand) {
            for (var command in this.commandsList) {
                if (this.commandsList.hasOwnProperty(command)) {
                    var commandOption = this.commandsList[command];
                    if (commandOption.aliases.indexOf(inputCommand) != -1) {
                        this.log('Command:', command);
                        this.log('Aliases:', commandOption.aliases.join(', '));
                        this.log(commandOption.description);

                        if (command == 'logs') {
                            if (options.length == 1) {
                                for (var className in LOG_COMMAND_ALIASES) {
                                    if (LOG_COMMAND_ALIASES.hasOwnProperty(className)) {
                                        for (var i: number = 0; i < LOG_COMMAND_ALIASES[className].length; i++) {
                                            if (LOG_COMMAND_ALIASES[className][i] == options[0]) {
                                                this.log('Arguments: [className: string] [value: boolean | string]');
                                                this.log('\tclassName:', Object.keys(LOG_COMMAND_ALIASES).join(', '));
                                                this.log('\tvalue:', LOG_VALUE_ALIASES.join(', '));
                                                this.log('');
                                                this.log('\tAliases for ' + options[0] + ':', LOG_COMMAND_ALIASES[className].join(', '));
                                                return;
                                            }
                                        }
                                    }
                                }
                                this.logError('Error: no help for \"logs', ...options, '\"');
                            } else if (options == null || options.length == 0) {
                                this.log('Arguments: [className: string] [value: boolean | string]');
                                this.log('\tclassName:', Object.keys(LOG_COMMAND_ALIASES).join(', '));
                                this.log('\tvalue:', LOG_VALUE_ALIASES.join(', '));
                            } else {
                                this.logError('Error: no help for \"logs', ...options, '\"');
                            }
                        }
                    }
                }
            }
        } else {
            var helpTopics: string[] = Object.keys(this.commandsList);
            helpTopics.splice(helpTopics.indexOf('help'), 1);
            this.log('Help topics available:', helpTopics.join(', '));
        }
    }

    private onError(error: NodeJS.ErrnoException): void {
        if (error.syscall == 'listen') {
            switch (error.code) {
                case 'EACCES':
                    this.logError('Error: Port ' + PORT + ' requires elevated privileges');
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    this.logError('Error: Port ' + PORT + ' is already in use');
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        } else {
            throw error;
        }
    }

    private onListening(): void {
        //debug('Listening on Port ' + PORT);
        this.log('Listening on Port', PORT);
    }
}

interface IAction {
    function: Function;
    args?: string[];
}

interface ICommand {
    aliases: string[];
    action: IAction;
    description: string;
}

interface ICommandsList {
    [command: string]: ICommand;
}

const server: Server = new Server();