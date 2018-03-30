import Mongoose = require('mongoose');
Mongoose.Promise = global.Promise;
import { Request, Response, NextFunction } from 'express';
import * as Passport from 'passport';
import * as PassportLocal from 'passport-local';
import * as GoogleAuth from 'passport-google-oauth20';
import * as BCrypt from 'bcrypt-nodejs';
import * as _ from 'lodash';

import { Models } from 'Radar-shared/interfaces/components.interface';

import { IUser } from 'interfaces/models.interface';

import { userSchema } from 'schemas/user.schema';

type authCallback = (request: Request, response: Response, next: NextFunction) => void;

const COMPASS_CONNECTION: Mongoose.Connection = Mongoose.createConnection('mongodb://localhost/' + 'projectstatus');
const USER_MODEL = COMPASS_CONNECTION.model<IUser>('User', userSchema, 'users');
const LOCAL_STRATEGY = PassportLocal.Strategy;
const CLIENT_ID: string = '490241700144-vu58m7imtvqmpv11gb5k3cg56gaod28h.apps.googleusercontent.com';
const CLIENT_SECRET: string = '5zJ1waBGbNaU68EOTFDRDOa1';
const LOCALHOST_URL: string = 'http://localhost:7070/auth/google/callback';
const LIVE_URL: string = 'https://radar.dataemerge.com/auth/google/callback';
const BASE_URL: string = 'dataemerge.com';

var isValidPassword: (user: Models.IUser, password: string) => boolean = (user: Models.IUser, password: string): boolean => {
    return user.local.password != null && BCrypt.compareSync(password, user.local.password);
};

Passport['serializeUser']((user, done) => {
    done(undefined, user['id']);
});

Passport['deserializeUser']((id, done) => {
    USER_MODEL.findById(id, (error, user) => {
        done(error, user);
    });
});

Passport['use'](new PassportLocal.Strategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
}, async (request: any, email: string, password: string, done: Function): Promise<any> => {
    var user: Models.IUser = await USER_MODEL.findOne({ 'local.email': email }, (error: any): void => {
        if (error) {
            return done(error);
        }
    }).exec();

    if (!user || !isValidPassword(user, password)) {
        return done(null, false);
    } else {
        return done(null, user);
    }
}));

Passport['use'](new GoogleAuth.Strategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: __dirname.split('/').indexOf('www') == -1 ? LOCALHOST_URL : LIVE_URL,
    passReqToCallback: true // allows us to pass back the entire request to the callback
}, async (request: any, token: any, refreshToken: any, profile: any, done: Function): Promise<any> => {
    if (profile._json.hd !== BASE_URL && profile._json.domain !== BASE_URL) {
        return done(null, false);
    }

    // try to find the user based on their google id
    var hasErrored: boolean = false;
    var findError: any;
    var user: IUser = await USER_MODEL.findOne({ 'google.id': profile.id }, (error: any): void => {
        if (error) {
            findError = error;
            hasErrored = true;
        }
    }).exec();

    var onError: (error: any) => void = (error: any): void => {
        if (error) {
            throw error;
        }
    }

    if (!hasErrored) {
        if (user) {
            // update user with latest google information
            user.displayName = profile.displayName;
            user.google.token = token;
            user.google.name = profile.displayName;
            user.google.email = profile.emails[0].value;
            user.imageURL = profile._json.image.url;

            await (<any>user).save((error: any): void => {
                if (error) {
                    throw error;
                }
            });

            return done(null, user);
        } else {
            // couldn't find by google id
            user = await USER_MODEL.findOne({ displayName: profile.displayName }, onError).exec();

            if (user) {
                // exists as a local DE DataEmerge user
                user.google.id = profile.id;
                user.google.token = token;
                user.google.name = profile.displayName;
                user.google.email = profile.emails[0].value;
                user.local.email = profile.emails[0].value;
                user.imageURL = profile._json.image.url;

                await (<any>user).save(onError);

                return done(null, user);
            } else {
                // when DE user logs in for the first time, create a new profile
                var newUser: any = {};
                newUser.google.id = profile.id;
                newUser.google.token = token;
                newUser.google.name = profile.displayName;
                newUser.google.email = profile.emails[0].value; // use first email
                newUser.displayName = profile.displayName;
                newUser.state = 'Active';
                newUser.phone = null;
                newUser.accessLevel = 0;
                newUser.accessEntity = null;
                newUser.isSuperUser = false;
                newUser.imageURL = profile._json.image.url;

                await USER_MODEL.create(newUser, onError);

                return done(null, newUser);
            }
        }
    } else {
        return done(findError);
    }
}));

export var isAuthenticated: authCallback = (request: Request, response: Response, next: NextFunction): void => {
    if (request.isAuthenticated()) {
        next();
    } else {
        response.redirect('/login');
    }
};

export var isAuthorized: authCallback = (request: Request, response: Response, next: NextFunction): void => {
    const provider: string = request.path.split('/').slice(-1)[0];

    if (_.find(request.user.tokens, { kind: provider })) {
        next();
    } else {
        response.redirect(`/auth/${provider}`);
    }
};