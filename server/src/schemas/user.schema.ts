import { Schema } from 'mongoose';

export var userSchema: Schema = new Schema({
    state: { type: String, enum: ['Active', 'Deleted'] },
    displayName: String,
    phone: String,
    accessLevel: Number, // 0 = Admin | 1 = Client | 2 = Facility | 3 = Subfacility
    accessEntity: Schema.Types.ObjectId,
    isSuperUser: Boolean,
    imageURL: String,
    local: { // local user
        email: String,
        password: String,
        name: String
    },
    google: { // google auth user
        id: String,
        token: String,
        email: String,
        name: String
    }
});