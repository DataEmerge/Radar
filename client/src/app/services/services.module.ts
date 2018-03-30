import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppService } from './app.service';
import { FilterService } from './filter.service';
import { ModalService } from './modal.service';
import { ScriptStatusService } from './scriptStatus.service';
import { ClientService } from './client.service';

export const providers = [
    AppService,
    FilterService,
    ModalService,
    ScriptStatusService,
    ClientService
];

@NgModule({
    /** The view classes that belong to this module (components, directives, and pipes). */
    declarations: [],
    /** The subset of declarations that should be visible and usable in the component templates of other modules. */
    exports: [],
    /** Other modules whose exported classes are needed by component templates declared in this module. */
    imports: [
        CommonModule
    ],
    /** Creators of services that this module contributes to the global collection of services; they become accessible in all parts of the app. */
    providers: []
    // no bootstrap property because this isn't the root module of the app
})
export class Services {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: Services,
            providers: providers
        };
    }
}