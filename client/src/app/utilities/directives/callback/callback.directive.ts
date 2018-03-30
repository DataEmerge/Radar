import { Directive, OnDestroy, Input, AfterViewInit } from '@angular/core';

@Directive({ selector: '[callback]' })
export class CallbackDirective implements AfterViewInit, OnDestroy {
    @Input('callback') private callback: () => any;
    @Input('callback-condition') private set condition(value: any) {
        if (value != false && this.hasBeenCalled) {
            if (this.isInitialized) {
                if (this.callback) {
                    this.callback();
                    this.hasBeenCalled = true;
                } else {
                    console.error('Error: callback is null');
                }
            } else {
                setTimeout((): void => this.condition = value, 50); // in case callback condition is set prior to ngAfterViewInit being called
            }
        }
    }

    private isInitialized: boolean = false;
    private hasBeenCalled: boolean = false;

    constructor() { }

    public ngAfterViewInit(): void {
        this.isInitialized = true;
    }

    public ngOnDestroy(): void {
        this.isInitialized = false;
        this.hasBeenCalled = false;
    }
}