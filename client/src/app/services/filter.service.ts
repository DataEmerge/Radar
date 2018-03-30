import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

import { ObjectId } from 'Radar-shared/interfaces/base.interface';
import * as EventInterfaces from 'app/interfaces/events.interface';
import * as ComponentInterfaces from 'app/interfaces/components.interface';
import { IService } from 'app/interfaces/service.interface';

import * as Components from 'app/classes/components';

import { ClientBase } from 'app/classes/clientBase';

import { AppService } from 'app/services/app.service';

import Request = EventInterfaces.Socket.Fetch.Request;

@Injectable()
export class FilterService extends ClientBase implements IService {
    //private sourceFilters: { [filter: string]: string } = {
    //    dbFieldName: '',
    //    dbTableName: '',
    //    dbFieldNotesComments: ''
    //};
    //private targetFilters: { [filter: string]: string } = {
    //    dbFieldName: '',
    //    dbTableName: '',
    //    dbFieldNotesComments: ''
    //};

    constructor() {
        super('FilterService');
        this.logEventTextFormatting = 'background-color:green; color:white';
        this.displayLogs = true;
    }

    //public setFilters(filters: { [filter: string]: string }, dataType: ComponentInterfaces.Models.dataType): void {
    //    for (var filter in filters) {
    //        if (filters.hasOwnProperty(filter)) {
    //            this[dataType.toLowerCase() + 'Filters'][filter] = filters[filter];
    //        }
    //    }
    //}

    //public dbSchemaFilter(dataType: ComponentInterfaces.Models.dataType): Request.Filter.IFetchDBSchemaFilter {
    //    var filter: Request.Filter.IFetchDBSchemaFilter = {};
    //    if (this[dataType.toLowerCase() + 'Filters'].dbTableName != '') {
    //        filter.dbTableName = this[dataType.toLowerCase() + 'Filters'].dbTableName;
    //    }
    //    if (this[dataType.toLowerCase() + 'Filters'].dbFieldName != '') {
    //        filter.dbFieldName = this[dataType.toLowerCase() + 'Filters'].dbFieldName;
    //    }
    //    if (this[dataType.toLowerCase() + 'Filters'].dbFieldNotesComments != '') {
    //        filter.dbFieldNotesComments = this[dataType.toLowerCase() + 'Filters'].dbFieldNotesComments;
    //    }
    //    return filter;
    //}
}