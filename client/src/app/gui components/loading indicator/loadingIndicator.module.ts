import { CommonModule } from '@angular/common'; // imported instead of BrowserModule because this is a feature module, not the root module of the app
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { LoadingIndicator } from './loadingIndicator.component';

/** Feature module for the set of data uploaded from a file containing the schemas that define the configuration of a database system. */
@NgModule({
    /** The view classes that belong to this module (components, directives, and pipes). */
    declarations: [LoadingIndicator],
    /** The subset of declarations that should be visible and usable in the component templates of other modules. */
    exports: [LoadingIndicator],
    /** Other modules whose exported classes are needed by component templates declared in this module. */
    imports: [
        NgbModule,
        CommonModule
    ],
    /** Creators of services that this module contributes to the global collection of services; they become accessible in all parts of the app. */
    providers: []
    // no bootstrap property because this isn't the root module of the app
})
export class LoadingIndicatorModule { }