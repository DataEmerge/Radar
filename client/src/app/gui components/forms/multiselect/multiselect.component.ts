import { Component, OnChanges, ViewEncapsulation, forwardRef, Input, Output, EventEmitter, ElementRef, AfterViewInit, OnInit, DoCheck } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

import { ClientBase } from 'app/classes/clientBase';

export const DROPDOWN_CONTROL_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => Multiselect),
    multi: true
};
const noOperation: () => void = (): void => { };

@Component({
    selector: 'multiselect',
    templateUrl: './multiselect.component.html',
    host: { '[class]': 'defaultSettings.class' },
    styleUrls: ['./multiselect.component.scss'],
    providers: [DROPDOWN_CONTROL_VALUE_ACCESSOR]
})
export class Multiselect extends ClientBase implements ControlValueAccessor, OnInit, DoCheck {
    @Input() private darkTheme: boolean = true;
    @Input() private items: string[];
    @Input() private selectedItems: string[] = [];
    @Input() private settings: IMultiselectSettings;

    @Output('onChanged') private onChanged: EventEmitter<string[]> = new EventEmitter<string[]>();

    private isActive: boolean = false;
    private allSelected: boolean = false;
    private removingItem: boolean = false;

    private onTouchedCallback: () => void = noOperation;
    private onChangedCallback: (_: any) => void = noOperation;

    private filterString: string = '';

    private defaultSettings: IMultiselectSettings = {
        multiple: true,
        selectPlaceholder: 'Select',
        canSelectAll: true,
        selectAllLabelText: 'Select All',
        canSearch: true,
        maxHeight: 300,
        maxSelectedItems: Number.MAX_SAFE_INTEGER,
        maxShownItems: Number.MAX_SAFE_INTEGER,
        class: '',
        disabled: false,
        searchPlaceholder: 'Search'
    };

    constructor() {
        super('NewMultiselect');
        this.displayLogs = true;
    }

    public ngOnInit(): void {
        this.settings = Object.assign(this.defaultSettings, this.settings);
    }

    public ngDoCheck(): void {
        if (this.selectedItems) {
            if (this.selectedItems.length == 0 || this.items.length == 0 || this.selectedItems.length < this.items.length) {
                this.allSelected = false;
            }
        }
    }

    private itemIsSelected(item: string): boolean {
        if (this.selectedItems) {
            for (var i: number = 0; i < this.selectedItems.length; i++) {
                if (this.selectedItems[i] == item) {
                    return true;
                }
            }
        }
        return false;
    }

    private onClickItem(item: string, index: number, event: Event): boolean {
        if (this.settings.disabled) {
            return false;
        }

        if (this.itemIsSelected(item)) {
            this.removeSelectedItem(item);
            this.removingItem = true;
            this.onChanged.emit(this.selectedItems);
        } else if (this.selectedItems.length < this.settings.maxSelectedItems) {
            this.addSelectedItem(item);
            this.onChanged.emit(this.selectedItems);
        }

        if (this.allSelected || this.items.length > this.selectedItems.length) {
            this.allSelected = false;
        }

        if (this.items.length == this.selectedItems.length) {
            this.allSelected = true;
        }
        return true;
    }

    public writeValue(value: any[]): void {
        // from ControlValueAccessor interface
        if (value) {
            if (this.settings.multiple) {
                if (this.settings.maxSelectedItems) {
                    this.selectedItems = value.splice(0, this.settings.maxSelectedItems);
                } else {
                    this.selectedItems = value;
                }

                if (this.selectedItems.length == this.items.length && this.items.length > 0) {
                    this.allSelected = true;
                }
            } else {
                try {
                    if (value.length <= 1) {
                        this.selectedItems = value;
                    } else {
                        this.selectedItems = [value[0]];
                        this.logError('Multiselect error: can only select one item when multiple is false.');
                    }
                } catch (error) {
                    this.logError(error);
                }
            }
        } else {
            this.selectedItems = [];
        }
    }

    public registerOnChange(callback: any): void {
        this.onChangedCallback = callback; // from ControlValueAccessor interface
    }

    public registerOnTouched(callback: any): void {
        this.onTouchedCallback = callback; // from ControlValueAccessor interface
    }

    private filterItems(): string[] {
        var __this: Multiselect = this;
        return this.items.filter((item: string): boolean => {
            return __this.filterString == '' || __this.stringFuzzyIncludes(item, __this.filterString);
        }).sort();
    }

    private addSelectedItem(item: string): void {
        if (this.settings.multiple) {
            this.selectedItems.push(item);
        } else {
            this.selectedItems = [];
            this.selectedItems.push(item);
        }
        this.onChangedCallback(this.selectedItems);
    }

    private removeSelectedItem(item: string): void {
        for (var i: number = 0; i < this.selectedItems.length; i++) {
            if (this.selectedItems[i] == item) {
                this.selectedItems.splice(i, 1);
                return;
            }
        }
        this.onChangedCallback(this.selectedItems);
    }

    private toggleDropdown(event: MouseEvent): boolean {
        if ((<HTMLElement>event.target).id == 'propsDropdown' || this.isDescendant((<HTMLElement>event.target), document.getElementById('propsDropdown'))) {
            if (this.settings.disabled) {
                return false;
            }

            if (this.removingItem) {
                this.removingItem = false;
                return false;
            }

            this.isActive = !this.isActive;
            this.onChanged.emit(this.selectedItems);
            return true;
        } else {
            return false;
        }
    }

    private closeDropdown(): void {
        if (this.removingItem) {
            this.removingItem = false;
        } else {
            this.filterString = '';
            this.isActive = false;
        }
    }

    private toggleSelectAll(): void {
        if (!this.allSelected) {
            this.selectedItems = [];
            this.selectedItems = this.items.slice();

            this.allSelected = true;

            this.onChangedCallback(this.selectedItems);
            this.onChanged.emit(this.selectedItems);
        } else {
            this.selectedItems = [];

            this.allSelected = false;

            this.onChangedCallback(this.selectedItems);
            this.onChanged.emit(this.selectedItems);
        }
    }
}

interface IMultiselectSettings {
    /** Whether multiple items can be selected. True by default. */
    multiple: boolean;
    /** Placeholder in the dropdown when no items are selected. */
    selectPlaceholder: string;
    canSelectAll: boolean;
    selectAllLabelText: string;
    canSearch: boolean;
    /** Max height of dropdown list in pixels. */
    maxHeight: number;
    maxShownItems: number;
    /** Directive for HTML classes added to the <select> tag. */
    class: string;
    /** Max number of items that can be selected. When reached, the selecting of further items is disabled. */
    maxSelectedItems?: number;
    disabled?: boolean;
    searchPlaceholder: string;
}