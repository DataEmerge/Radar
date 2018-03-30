import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ScriptStatusModule } from './scriptStatus/scriptStatus.module';

export const providers: any[] = [ScriptStatusModule];

@NgModule({
    /** The view classes that belong to this module (components, directives, and pipes). */
    declarations: [

    ],
    /** The subset of declarations that should be visible and usable in the component templates of other modules. */
    exports: [

    ],
    /** Other modules whose exported classes are needed by component templates declared in this module. */
    imports: [
        CommonModule,
        ScriptStatusModule
    ],
    /** Creators of services that this module contributes to the global collection of services; they become accessible in all parts of the app. */
    providers: []
    // no bootstrap property because this isn't the root module of the app
})
export class Components {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: Components,
            providers: providers
        };
    }
}