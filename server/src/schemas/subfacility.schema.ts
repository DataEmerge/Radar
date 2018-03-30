import { Schema } from 'mongoose';

export var subfacilitySchema: Schema = new Schema({
    name: String,
    state: { type: String, enum: ['Active', 'Inactive', 'Deleted'] },
    contactPerson: Schema.Types.ObjectId,
    _parent: Schema.Types.ObjectId
});