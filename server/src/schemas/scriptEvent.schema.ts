import { Schema } from 'mongoose';

export var scriptEventSchema: Schema = new Schema({
    className: { type: String, enum: ['OnOperationStartEvent', 'OnOperationStopEvent', 'OnUnitStartEvent', 'OnUnitStopEvent', 'OnUnitErrorEvent'] },
    _project: Schema.Types.ObjectId,
    operation: { type: String, enum: ['Extract', 'Reports'] },
    estimatedBytes: Number,
    estimatedUnits: Number,
    isFinished: Boolean,
    bytesProcessed: Number,
    unitName: String,
    errorMessage: String,
    timestamp: Number,
    description: String,
    fromBeginning: Boolean
});