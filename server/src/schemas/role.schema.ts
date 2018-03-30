import { Schema } from 'mongoose';

export var roleSchema: Schema = new Schema({
    name: String,
    state: { type: String, enum: ['Active', 'Inactive', 'Deleted'] },
    user: Schema.Types.ObjectId,
    project: Schema.Types.ObjectId
});