import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Multiselect } from './multiselect.component'
import { OnContainerClickedModule } from 'app/utilities/directives/onContainerClicked/onContainerClicked.module';
import { FilterBy } from 'app/utilities/pipes/filterBy.pipe';
import { GroupBy } from 'app/utilities/pipes/groupBy.pipe';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        OnContainerClickedModule
    ],
    declarations: [
        Multiselect,
        FilterBy,
        GroupBy
    ],
    exports: [
        Multiselect,
        FilterBy,
        GroupBy
    ]
})
export class MultiselectModule { }