﻿import { CommonModule } from '@angular/common'; // imported instead of BrowserModule because this is a feature module, not the root module of the app
import { NgModule } from '@angular/core';

import { OnContainerClickedDirective } from './onContainerClicked.directive';

@NgModule({
    /** The view classes that belong to this module (components, directives, and pipes). */
    declarations: [OnContainerClickedDirective],
    /** The subset of declarations that should be visible and usable in the component templates of other modules. */
    exports: [OnContainerClickedDirective],
    /** Other modules whose exported classes are needed by component templates declared in this module. */
    imports: [
        CommonModule
    ],
    /** Creators of services that this module contributes to the global collection of services; they become accessible in all parts of the app. */
    providers: []
    // no bootstrap property because this isn't the root module of the app
})
export class OnContainerClickedModule { }