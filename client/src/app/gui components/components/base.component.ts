import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Subject } from 'rxjs/Subject';

import { ObjectId } from 'Radar-shared/interfaces/base.interface';
import { Models } from 'Radar-shared/interfaces/components.interface';

import { GUI } from 'app/interfaces/components.interface';
import * as EventInterfaces from 'app/interfaces/events.interface';

import { ClientBase } from 'app/classes/clientBase';
import * as Events from 'app/classes/events';

@Component({})
export abstract class BaseComponent extends ClientBase implements GUI.IBaseComponent {
    @Input() protected darkTheme: boolean = true;

    protected ngUnsubscribe: Subject<any> = new Subject<any>();
    protected isPopulated: boolean = false;
    protected keyupEventChars: string = ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`1234567890-=~!@#$%^&*()_+[]\\;\',./{}|:\"<>?';

    public isExpanded: boolean = false;
    public _id: ObjectId;

    public ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }
    
    protected abstract eventHandler(event: EventInterfaces.Internal.IInternalEvent): void;
}