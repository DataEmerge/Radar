import { Schema } from 'mongoose';

var unitSchema: Schema = new Schema({
    unitName: String,
    isProcessing: Boolean,
    timeElapsed: Number,
    bytesProcessed: Number
}, { _id: false });

export var scriptStatusSchema: Schema = new Schema({
    _project: Schema.Types.ObjectId,
    status: { type: String, enum: ['Running', 'Stopped', 'Errored', 'Completed', 'Unknown'] },
    totalBytes: Number,
    totalUnits: Number,
    startDate: Number,
    stopDate: Number,
    errorList: [String],
    bytesProcessed: Number,
    unitsProcessed: Number,
    operation: { type: String, enum: ['Extract', 'Reports'] },
    lastUpdated: Number,
    units: [unitSchema],
    isRunning: Boolean,
    description: String
});