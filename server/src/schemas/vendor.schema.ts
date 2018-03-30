import { Schema } from 'mongoose';

export var vendorSchema: Schema = new Schema({
    name: String,
    state: { type: String, enum: ['Active', 'Deleted'] },
    notes: { type: String }
});