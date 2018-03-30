import { Model, Document } from 'mongoose';

import { ObjectId } from 'Radar-shared/interfaces/base.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';

// TODO: put these definitions & schemas together somehow to make adding methods work
// (export the model instead, using a DMT/ Compass connection [like in passport config])

export interface IDocument extends Document {
    _id: ObjectId;
}

export interface IScriptStatus extends Models.IScriptStatus, IDocument { }

export interface ICompassProject extends Models.ICompassProject, IDocument { }

export interface IVendor extends Models.IVendor, IDocument { }

export interface ISystem extends Models.ISystem, IDocument { }

export interface IClient extends Models.IClient, IDocument { }

export interface IFacility extends Models.IFacility, IDocument { }

export interface ISubfacility extends Models.ISubfacility, IDocument { }

export interface IDatabase extends Models.IDatabase, IDocument { }

export interface IUser extends Models.IUser, IDocument { }

export interface IRole extends Models.IRole, IDocument { }

export interface IScriptEvent extends Models.Script.IScriptEvent, IDocument { }

export interface IModel {
    ScriptStatus: Model<IScriptStatus>;
    ScriptEvent: Model<IScriptEvent>;

    CompassProject: Model<ICompassProject>;
    Vendor: Model<IVendor>;
    System: Model<ISystem>;
    Client: Model<IClient>;
    Facility: Model<IFacility>;
    Subfacility: Model<ISubfacility>;
    Database: Model<IDatabase>;
    User: Model<IUser>;
    Role: Model<IRole>;
}