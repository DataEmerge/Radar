import { CommonModule } from '@angular/common'; // imported instead of BrowserModule because this is a feature module, not the root module of the app
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';

import { ScriptStatus } from './scriptStatus.component';

import { LoadingIndicatorModule } from 'app/gui components/loading indicator/loadingIndicator.module';
import { ProgressGraphModule } from 'app/gui components/components/progressGraph/progressGraph.module';
import { ScriptStatusService } from 'app/services/scriptStatus.service';

@NgModule({
    /** The view classes that belong to this module (components, directives, and pipes). */
    declarations: [ScriptStatus],
    /** The subset of declarations that should be visible and usable in the component templates of other modules. */
    exports: [ScriptStatus],
    /** Other modules whose exported classes are needed by component templates declared in this module. */
    imports: [
        FormsModule,
        NgbModule,
        CommonModule,
        LoadingIndicatorModule,
        ProgressGraphModule
    ],
    /** Creators of services that this module contributes to the global collection of services; they become accessible in all parts of the app. */
    providers: [ScriptStatusService]
    // no bootstrap property because this isn't the root module of the app
})
export class ScriptStatusModule { }