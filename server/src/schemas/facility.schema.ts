import { Schema } from 'mongoose';

export var facilitySchema: Schema = new Schema({
    name: String,
    state: { type: String, enum: ['Active', 'Inactive', 'Deleted'] },
    contactPerson: Schema.Types.ObjectId
});