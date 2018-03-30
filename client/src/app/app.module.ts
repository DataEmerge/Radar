import { BrowserModule } from '@angular/platform-browser'; // imported because this is the root module of the app
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';


import { AppComponent } from 'app/app.component'; // NOTE: must import this before the other modules

import { Services } from 'app/services/services.module';
import { Components } from 'app/gui components/components/components.module';
import { Forms } from 'app/gui components/forms/forms.module';
import { LoadingIndicatorModule } from 'app/gui components/loading indicator/loadingIndicator.module';
import { ClientModule } from 'app/gui components/components/client/client.module';

//import { DatetimePopupModule } from 'ngx-bootstrap-datetime-popup';
import { DatetimePopupModule } from 'app/gui components/forms/datetime-popup/datetime-popup.module';

@NgModule({
    /** The view classes that belong to this module (components, directives, and pipes). */
    declarations: [
        AppComponent
    ],
    // no exports because this is the root module of the app
    /** Other modules whose exported classes are needed by component templates declared in this module. */
    imports: [
        BrowserModule,
        NgbModule.forRoot(),
        FormsModule,
        HttpModule,
        Services.forRoot(),
        Components.forRoot(),
        Forms.forRoot(),
        LoadingIndicatorModule,
        ClientModule,
        DatetimePopupModule.forRoot()
    ],
    /** Creators of services that this module contributes to the global collection of services; they become accessible in all parts of the app. */
    providers: [],
    /** The main application view, called the root component, that hosts all other app views (only the root module should set this bootstrap property). */
    bootstrap: [AppComponent]
})
export class AppModule { }