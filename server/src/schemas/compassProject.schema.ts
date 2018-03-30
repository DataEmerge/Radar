import { Schema } from 'mongoose';

export var compassProjectSchema: Schema = new Schema({
    lastUpdated: Date,
    state: { type: String, enum: ['Quoted', 'Canceled Quote', 'Current', 'Archived', 'Canceled', 'Deleted'] },
    SOWDescription: String,
    status: { type: String, enum: ['On Target', 'On Hold', 'Low Risk', 'High Risk', 'Completed'] },
    name: String,
    database: Schema.Types.ObjectId,
    system: Schema.Types.ObjectId,
    referenceNum: Number,
    client: Schema.Types.ObjectId,
    facility: Schema.Types.ObjectId,
    subfacility: Schema.Types.ObjectId,
    vendor: Schema.Types.ObjectId,
    version: String
});