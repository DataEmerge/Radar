import * as EventInterfaces from 'app/interfaces/events.interface';

export type serviceType = 'AppService' | 'FilterService' | 'ScriptStatusService' | 'ModalService' | 'ClientService';

export interface IService { }

export interface IInternalService extends IService { }