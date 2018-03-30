import { Component, Input, OnInit } from '@angular/core';

@Component({ selector: 'loadingIndicator', templateUrl: './loadingIndicator.component.html' })
export class LoadingIndicator implements OnInit {
    @Input() private fillBackground: boolean = false;
    @Input() private absolute: boolean = false;
    @Input() private classes: string = '';

    // dimensions in pixels
    @Input() private minHeight: number = 10;
    @Input() private maxWidth: number = 200;
    @Input() private numDots: number = 5;
    @Input() private dotSize: number = 15;

    private dots: null[] = [];
    private id: number = Math.floor(Math.random() * 20);

    private max: Function = Math.max;

    constructor() {

    }

    public ngOnInit(): void {
        this.dots = new Array<null>(this.numDots);
    }
}