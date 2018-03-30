import { Component, EventEmitter, Input, OnChanges, Output, ElementRef, ChangeDetectorRef, OnDestroy } from '@angular/core';

import { IDatetimePopupButtonOptions } from 'app/interfaces/form.interface';

import { ClientBase } from 'app/classes/clientBase';

@Component({ selector: 'datetime-popup', templateUrl: './datetime-popup.component.html' })
export class DatetimePopupComponent extends ClientBase implements OnChanges, OnDestroy {
    @Input() private darkTheme: boolean = true;
    @Input() private value: Date;

    @Input() private showDate = true;
    @Input() private showTime = true;
    @Input() private showWeeks = false;

    @Input() private datepickerMode = 'day';
    @Input() private initDate: Date = null;
    @Input() private disabledDates: any[] = [];

    @Input() private nowButton: IDatetimePopupButtonOptions;
    @Input() private clearButton: IDatetimePopupButtonOptions;
    @Input() private closeButton: IDatetimePopupButtonOptions;

    @Output() private onValueChange = new EventEmitter();
    @Output() private onExpanded = new EventEmitter();

    private isExpanded = false;
    private hostElement: Element;

    private _localValue: Date = null;
    private get localValue(): Date {
        return this._localValue;
    }
    private set localValue(newValue) {
        this._localValue = newValue;
        this.onPickerInput();
    }

    private updateTimer: NodeJS.Timer;

    constructor(hostElementRef: ElementRef, private changeDetectorRef: ChangeDetectorRef) {
        super('DatetimePopupComponent');
        this.displayLogs = true;

        this.hostElement = hostElementRef.nativeElement;
        var __this: DatetimePopupComponent = this;
        this.updateTimer = setInterval((): void => {
            //__this.changeDetectorRef.reattach();
            __this.changeDetectorRef.detectChanges();
        }, 10);
    }

    public ngOnChanges(changes: any): void {
        if (!this.nowButton) {
            this.nowButton = { isVisible: true, label: 'Now', CSSClasses: 'btn btn-success btn-sm' };
        }

        if (!this.clearButton) {
            this.clearButton = { isVisible: true, label: 'Clear', CSSClasses: 'btn btn-danger btn-sm' };
        }

        if (!this.closeButton) {
            this.closeButton = { isVisible: true, label: 'Close', CSSClasses: 'btn btn-primary btn-sm' };
        }

        // user could be typing a value into an input box, so would come in as string
        if (typeof this.value === 'string') {            
            if (!isNaN(new Date(this.value).getTime())) {
                this.localValue = new Date(this.value); // ensure valid date
            }
        } else if (this.value) {
            this.localValue = this.value;
        }
    }

    public ngOnDestroy(): void {
        clearInterval(this.updateTimer);
    }

    private close(): void {
        this.isExpanded = false;
        this.onExpanded.emit(false);
    }

    private expand(expand?: boolean): void {
        this.isExpanded = expand != null ? expand : !this.isExpanded;
        this.onExpanded.emit(this.isExpanded);
    }

    private onContainerClicked(event?: MouseEvent): void {
        // TODO: figure out how to make the picker not go away when a date is picked
        // (it's because the <tr> elements don't have a parent element)


        //console.log({ thing: event.target });
        //console.log(this.hostElement.contains(event.target));

        //if (!this.isDescendant((<HTMLElement>event.target), this.hostElement)) {
        //    console.log('closing');
        //    this.close();
        //}
    }

    private onNowSelected(): void {
        this.localValue = new Date();
        this.onPickerInput();
    }

    private onClear(): void {
        this.onValueChange.emit(null); // tell the app to reconstruct the component, because setting this.localValue to null causes an error in the timepicker
    }

    private onPickerInput(): void {
        this.onValueChange.emit(this.localValue);

        if (this.showDate != this.showTime) {
            this.close();
        }
    }
}
