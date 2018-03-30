import { CommonModule } from '@angular/common';
import { NgModule, ModuleWithProviders } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatepickerModule, DatepickerConfig } from 'ngx-bootstrap';
import { TimepickerModule, TimepickerConfig } from 'ngx-bootstrap/timepicker';

import { DatetimePopupComponent } from './datetime-popup.component';
import { OnContainerClickedModule } from 'app/utilities/directives/onContainerClicked/onContainerClicked.module';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        OnContainerClickedModule,
        DatepickerModule.forRoot(),
        TimepickerModule.forRoot()
    ],
    declarations: [
        DatetimePopupComponent
    ],
    exports: [
        DatetimePopupComponent
    ],
    entryComponents: [
        DatetimePopupComponent
    ]
})

export class DatetimePopupModule {
    public static forRoot(): ModuleWithProviders {
        return {
            ngModule: DatetimePopupModule,
            providers: [
                DatepickerConfig,
                TimepickerConfig
            ]
        };
    }
}
