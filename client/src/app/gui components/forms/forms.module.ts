import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MultiselectModule } from './multiselect/multiselect.module';
import { ModalModule } from 'app/gui components/modal/modal.module';
import { LoadingIndicatorModule } from 'app/gui components/loading indicator/loadingIndicator.module';
import { DatetimePopupModule } from 'app/gui components/forms/datetime-popup/datetime-popup.module';

import { Changelog } from './misc/changelog.component';
import { DoneForm } from './misc/doneForm.component';

import { EventLogForm } from './eventLog/eventLogForm.component';

export const providers = [
    MultiselectModule,
    Changelog,
    DoneForm
];

@NgModule({
    /** The view classes that belong to this module (components, directives, and pipes). */
    declarations: [
        Changelog,
        DoneForm,
        EventLogForm
    ],
    /** The subset of declarations that should be visible and usable in the component templates of other modules. */
    exports: [
        Changelog,
        DoneForm,
        EventLogForm
    ],
    /** Other modules whose exported classes are needed by component templates declared in this module. */
    imports: [
        CommonModule,
        FormsModule,
        LoadingIndicatorModule,
        MultiselectModule,
        ModalModule,
        DatetimePopupModule.forRoot()
    ],
    /** Creators of services that this module contributes to the global collection of services; they become accessible in all parts of the app. */
    providers: []
    // no bootstrap property because this isn't the root module of the app
})
export class Forms {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: Forms,
            providers: providers
        };
    }
}