import { Schema } from 'mongoose';

export var systemSchema: Schema = new Schema({
    name: String,
    _vendor: Schema.Types.ObjectId,
    calculations: Object,
    experience: String,
    notes: String,
    state: { type: String, enum: ['Active', 'Pending', 'Deleted'] }
});