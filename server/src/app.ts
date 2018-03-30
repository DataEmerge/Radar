import * as Express from 'express';
import * as Path from 'path';
import * as SocketIO from 'socket.io';
import * as SocketIO_Client from 'socket.io-client';
import * as ExpressSocketIOSession from 'express-socket.io-session';
import * as HTTP from 'http';
import * as HTTPS from 'https';
import * as Passport from 'passport';
import * as ExpressSession from 'express-session';
import * as MongoDBStore from 'connect-mongodb-session';
import * as Child_Process from 'child_process';

import { IEvent } from 'Radar-shared/interfaces/events.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';

import * as EventInterfaces from 'interfaces/events.interface';

import { ServerBase } from 'classes/serverBase';
import * as Events from 'classes/events';

import * as PassportConfig from 'config/passport.config';

const MONGO_STORE = MongoDBStore(ExpressSession);
const SESSION_NUM_HOURS: number = 3;
const MONGO_STORE_URI: string = 'mongodb://localhost/sessions';
const EXPRESS_SESSION_SECRET: string = 'Moving Legacy D4T4';
const CLIENT_DIST_PATH: string = __dirname.substring(0, __dirname.indexOf('server') - 1) + '/client/dist';
const APP_TITLE: string = 'Radar';
const LOCAL_DEV_URL: string = 'http://localhost:4200';
const API_PORT: number = 9002;

/**
 *  Primary class of the server side of the Radar app; runs a web socket server facilitate communication with the clientside app, connects as a
 *      client to the API app's web socket server to receive events from it, and runs an Express server to host the login page and serve the
 *      clientside app after authentication.
 * 
 *  How it works:
 *      The Express stuff is fairly straightforward: it creates a server on the specified port and validates any incoming requests.
 *      The validation goes through ./config/passport.config.ts, to do all the Google login stuff.
 *      If the Google login stuff comes back and is all hunky-dory, then it sends ../../client/src/index.html, and the rest of the clientside app
 *          creation happens from there (see client folder documentation).
 *
 *      Additionally, this class functions as a SocketIO client to API's web socket server, across which is receives events.
 *
 *      On construction, this also class forks a Node process that is uses as an asynchronous queue controller.
 *      The reason for this is so that the Express server can continue receiving requests while the events are processed asynchronously, because we
 *          don't know how Express or SocketIO buffer things. This queue system can handle about 2000 events thrown at it at once before it rolls
 *          over, so it should be more than fine for what we're putting it through here.
 *
 *      Once received and validated, a script event object is created from the given properties, and is then sent to the queue controller process.
 *      From there, the queue's scriptStatusController process updates the corresponding ScriptStatus, then sends the event back up the process
 *          chain. The event is then emitted across the web socket to clients (note: there is no buffer for this; we're depending on the monitoring
 *          scripts to buffer the requests sent to API and on the Radar client to buffer things internally).
 */
export class App extends ServerBase {
    private APISocketURL: string = 'http://localhost:' + API_PORT;
    private socket: SocketIOClient.Socket;
    private socketOptions: SocketIOClient.ConnectOpts = {};
    private displaySocketLogs: boolean = false;
    private isRunning: boolean = true;

    private generalRoomName: string = 'lobby';
    private io: SocketIO.Server;
    private queueController: Child_Process.ChildProcess;
    private displayEventLogs: boolean = false;
    private mongoStore: MongoDBStore;
    private session: Express.RequestHandler;
    private server: HTTP.Server | HTTPS.Server;

    public express: Express.Application;

    constructor() {
        super('App', ['white']);
        this.displayLogs = true;

        this.express = Express();
        this.configureMiddleware();
        this.configureRoutes();

        this.queueController = Child_Process.fork('./dist/controllers/queue.controller');

        var __this: App = this;
        this.queueController.on('message', (message: any): void => {
            __this.onQueueControllerMessage(message);
        });
    }

    private initializeClientSocket(): void {
        this.socket = SocketIO_Client(this.APISocketURL, this.socketOptions);
        this.log('Waiting for API connection...');

        var __this: App = this;
        this.socket.on('connect', (): void => {
            __this.log('Connected to API', '[' + __this.socket.id + ']');
            console.log();
        });

        this.socket.on('disconnect', (): void => {
            if (__this.isRunning) {
                __this.logError('Error: disconnected from API; waiting for reconnection...');
            }
        });

        this.socket.on('eventFromAPI', (eventObject: any): void => {
            __this.onAPIEvent(eventObject);
        });
    }

    private onAPIEvent(eventObject: any): void {
        var event: EventInterfaces.Socket.Script.IScriptEvent = <EventInterfaces.Socket.Script.IScriptEvent>this.constructEvent(eventObject, 'Socket');
        this.logEvent('App received a(n)', event.constructor.name, 'event from API for Compass project', event._project);
        if (event) {
            this.queueController.send(event);
        } else {
            this.logError('Error: could not construct event from', event);
            // TODO: send error to app here to notify user
        }
    }

    public stop(): void {
        this.isRunning = false;
        this.io.close();
        this.socket.close();
        this.queueController.kill();
    }

    public logs(className: EventInterfaces.Internal.logClasses, value?: boolean) {
        switch (className) {
            case 'reset':
                this.displayLogs = true;
                this.queueController.send(new Events.Internal.LogsEvent({ all: true }));
                this.queueController.send(new Events.Internal.LogsEvent({ mongoose: false }));
                this.log('All logging reset');
                break;
            case 'states':
                this.logState();
                this.queueController.send(new Events.Internal.LogsEvent({ states: null }));
                break;
            case 'app':
                this.displayLogs = true;
                this.log('App logging turned', value ? 'on' : 'off');
                this.displayLogs = value;
                break;
            case 'all':
                this.displayLogs = true;
                this.log('All logging ' + (value ? '(except Mongo) ' : '') + 'turned', value ? 'on' : 'off');
                this.displayLogs = value;
                this.queueController.send(new Events.Internal.LogsEvent({ all: value }));
                break;
            default:
                var props: EventInterfaces.Internal.logValues = {};
                props[className] = value;
                this.queueController.send(new Events.Internal.LogsEvent(props));
                break;
        }
    }

    private configureMiddleware(): void {
        this.mongoStore = new MONGO_STORE({
            uri: MONGO_STORE_URI,
            collection: 'Radar' // TODO: should this be Compass? since sessions are there
        });

        this.session = ExpressSession({
            secret: EXPRESS_SESSION_SECRET,
            cookie: { maxAge: 1000 * 60 * 60 * SESSION_NUM_HOURS },
            store: this.mongoStore,
            resave: true,
            saveUninitialized: true
        });

        this.express.use(this.session);
        this.express.use(Passport['initialize']());
        this.express.use(Passport['session']());

        this.express.use(Express.static(CLIENT_DIST_PATH, { index: false })); // expose client dist directory

        this.express.set('views', Path.join(__dirname, '../views'));
        this.express.set('view engine', 'ejs');
    }

    private configureRoutes(): void {
        var router: Express.Router = Express.Router();
        router.get('/login', (request: any, response: any, next: any): void => {
            response.render('login.ejs', { title: APP_TITLE });
        });

        // send to google for auth (profile gets basic info including name; email gets their emails)
        router.get('/auth/google', Passport['authenticate']('google', {
            scope: ['profile', 'email']
        }));

        // callback after google has authenticated the user
        router.get('/auth/google/callback', Passport['authenticate']('google', {
            successRedirect: '/',
            failureRedirect: '/login'
        }));

        router.get('/logout', (request: any, response: any, next: any): void => {
            // TODO: do logout stuff?
            response.render('login.ejs', { title: APP_TITLE });
        });

        router.get('*', PassportConfig.isAuthenticated, (request: any, response: any, next: any): void => {
            response.sendFile(CLIENT_DIST_PATH + '/index.html');
        });

        this.express.use('/', router);
    }

    public setHTTPServer(httpServer: HTTP.Server | HTTPS.Server): void {
        this.server = httpServer;
    }

    private configureServerSocket(httpServer: HTTP.Server | HTTPS.Server): void {
        this.io = SocketIO(httpServer);
        this.io.use(ExpressSocketIOSession(this.session));

        var __this: App = this;
        this.io.on('connection', (socket: SocketIO.Socket): void => {
            var passport = socket.handshake['session'].passport;
            var hasUser: boolean = passport && passport.user;
            var getUserName: (passport: any) => string = (passport: any): string => {
                return hasUser ? ' (' + passport.user + ')' : '';
            };

            if (hasUser || socket.handshake.headers.origin == LOCAL_DEV_URL) {
                __this.log('Client' + getUserName(passport), socket.client.id, 'connected');
                __this.addSocketToRoom(socket, __this.generalRoomName);

                if (hasUser) {
                    __this.queueController.send(new Events.Socket.FetchCurrentUserRequestEvent(socket.id, socket.handshake['session'].passport));
                }

                socket.on('disconnect', (): void => {
                    __this.log('Client' + getUserName(passport), socket.client.id, 'disconnected');
                });

                socket.on('eventFromClient', (eventObject: any, ...otherArgs: any[]): void => {
                    __this.log('Client' + getUserName(passport), socket.client.id, 'sent a(n)', eventObject.className);
                    __this.onSocketEvent(socket.id, eventObject, ...otherArgs);
                });
            } else {
                console.log('disconnecting');
                // TODO: send message to client first about disconnect
                socket.disconnect(true);
            }
        });
    }

    private addSocketToRoom(socket: SocketIO.Socket, roomName: string): void {
        var __this: App = this;
        socket.join(roomName, (error: any): void => {
            if (!error) {
                __this.log('Client', socket.client.id, 'joined ' + roomName);
                // TODO: send some sort of validation message to client?
            } else {
                __this.logError('Error joining room:', error);
                // TODO: send error event to client
            }
        });
    }

    private onSocketEvent(socketID: string, eventObject: any, ...otherArgs: any[]): void {
        var event: EventInterfaces.Socket.ISocketEvent = <EventInterfaces.Socket.ISocketEvent>this.parseEvent(eventObject);
        if (this.displayEventLogs) {
            this.log('Received ' + event.constructor.name + ' from client', socketID); // TODO: log the name of the user who's logged in on the client that sent the event
        }
        this.queueController.send(event);
    }

    private onQueueControllerMessage(message: IEvent): void {
        var event: IEvent = this.parseEvent(message);
        if (this.displayEventLogs) {
            this.log('Received', event ? event.constructor.name : 'message', 'from QueueController', event ? '' : ':' + message);
        }

        if (event instanceof Events.Socket.SocketEvent) {
            var isResponse: boolean = event instanceof Events.Socket.FetchResponseEvent;
            var isServerError: boolean = event instanceof Events.Socket.ServerErrorEvent;
            var isUpdate: boolean = event instanceof Events.Socket.UpdateEvent;
            if (isResponse || isServerError || isUpdate) {
                if (isUpdate) {
                    this.io.sockets.to(this.generalRoomName).emit('eventFromServer', event);
                } else {
                    this.emitEvent(this.io.sockets.connected[(<EventInterfaces.Socket.ISocketEvent>event).socketID], event);
                }
            }
        } else if (event instanceof Events.Internal.InternalEvent) {
            this.handleInternalEvent(event);
        } else {
            this.logError('Error: unhandled event type;', event);
        }
    }

    private handleInternalEvent(event: EventInterfaces.Internal.IInternalEvent): void {
        if (event instanceof Events.Internal.ReadyEvent) {
            if (event.readyClassName == 'queueController') {
                this.log('App is ready');
                this.initializeClientSocket();
                this.configureServerSocket(this.server);
            } else {
                this.logError('Error: unhandled controller class name;', event);
            }
        } else {
            this.logError('Error: unhandled internal event type;', event);
        }
    }

    // TODO: make scope more comprehensive (be able to send to multiple clients in room, and multiple rooms)
    private emitEvent(socket: SocketIO.Socket, event: IEvent): void {
        socket.emit('eventFromServer', event);
    }

    private sendEventToClientsInRoom(socketID: string, roomName: string, event: EventInterfaces.Socket.ISocketEvent): void {
        this.io.sockets.sockets[socketID].to(roomName).emit('eventFromServer', event);
    }

    private logSocket(...args: any[]): void {
        if (this.displaySocketLogs) {
            this.log(...args);
        }
    }

    private logSocketError(...args: any[]): void {
        if (this.displaySocketLogs) {
            this.logError(...args);
        }
    }
}