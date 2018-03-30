import { Directive, ElementRef, Output, EventEmitter, HostListener } from '@angular/core';

import { ClientBase } from 'app/classes/clientBase';

@Directive({ selector: '[onContainerClicked]' })
export class OnContainerClickedDirective extends ClientBase {
    constructor(private _elementRef: ElementRef) {
        super('NewOnContainerClickedDirective');
        this.displayLogs = true;
    }

    @Output() public onContainerClicked: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    @HostListener('document:click', ['$event', '$event.target'])
    public onClick(event: MouseEvent, targetElement: HTMLElement): void {
        if (!targetElement) {
            return;
        }

        const selfClicked: boolean = this._elementRef.nativeElement.contains(targetElement);
        if (!selfClicked) {
            this.onContainerClicked.emit(event);
        }
    }
}