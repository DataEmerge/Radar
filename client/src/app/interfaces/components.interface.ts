import { ObjectId } from 'Radar-shared/interfaces/base.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';

export { Models as Models };

export namespace GUI {
    export interface IBaseComponent {
        isExpanded: boolean;
    }

    export interface IScriptStatus extends IBaseComponent, Models.IScriptStatus {

    }

    export interface IClient extends IBaseComponent, IClientObject {

    }
}

export interface IClientObject extends Models.IClient {
    scriptStatuses: {}[];
}