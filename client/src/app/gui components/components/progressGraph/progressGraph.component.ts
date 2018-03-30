import { Component, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';

import { ObjectId } from 'Radar-shared/interfaces/base.interface';

import * as EventInterfaces from 'app/interfaces/events.interface';
import * as ComponentInterfaces from 'app/interfaces/components.interface';

import * as Components from 'app/classes/components';

import * as Events from 'app/classes/events';

import { ClientBase } from 'app/classes/clientBase';

const UNITS_GRAPH_ICON: string = 'fa-file-text-o';
const UNITS_GRAPH_FG_COLOR: string = '#E90B3A';
const UNITS_GRAPH_BG_COLOR: string = '#aa082b';

const BYTES_GRAPH_ICON: string = 'fa-database';
const BYTES_GRAPH_FG_COLOR: string = '#A0FF03';
const BYTES_GRAPH_BG_COLOR: string = '#6eb300';

const TIME_GRAPH_ICON: string = 'fa-calendar';
const TIME_GRAPH_FG_COLOR: string = '#1AD5DE';
const TIME_GRAPH_BG_COLOR: string = '#1399a0';

const DEFAULT_GRAPH_OPTIONS: IGraphOptions[] = [
    {
        foregroundColor: UNITS_GRAPH_FG_COLOR,
        backgroundColor: UNITS_GRAPH_BG_COLOR,
        icon: UNITS_GRAPH_ICON
    },
    {
        foregroundColor: BYTES_GRAPH_FG_COLOR,
        backgroundColor: BYTES_GRAPH_BG_COLOR,
        icon: BYTES_GRAPH_ICON
    },
    {
        foregroundColor: TIME_GRAPH_FG_COLOR,
        backgroundColor: TIME_GRAPH_BG_COLOR,
        icon: TIME_GRAPH_ICON
    }
];

@Component({
    selector: 'progressGraph',
    templateUrl: './progressGraph.component.html',
    styleUrls: ['./progressGraph.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressGraph extends ClientBase {
    @Input() private _id: ObjectId;
    @Input() private darkTheme: boolean = true;
    @Input() private diameter: number = 0; // in pixels
    @Input() private graphValues: number[] = [0, 0, 0]; // percentages
    @Input() private graphOptions: IGraphOptions[] = DEFAULT_GRAPH_OPTIONS;

    private strokeWidth: number = 22; // in pixels
    private strokeGap: number = 3; // in pixels
    private radius: number = 0; // in pixels

    constructor(
        private changeDetectorRef: ChangeDetectorRef) {
        super('ProgressGraph');
        this.displayLogs = true;
        this.logEventTextFormatting = 'color:lightblue';
    }

    public ngOnInit(): void {
        this.radius = this.diameter / 2;
    }

    public ngOnDestroy(): void {
        super.ngOnDestroy();
    }

    private getGraphSize(i: number): number {
        return this.diameter - (2 * i * (this.strokeWidth + this.strokeGap));
    }

    private getGraphOffset(i: number): number {
        return (this.diameter - this.getGraphSize(i)) / 2;
    }

    private getOverlaySize(i: number): number {
        return this.getGraphSize(i) - (2 * this.strokeWidth);
    }

    private getOverlayOffset(i: number): number {
        return (this.getGraphSize(i) - this.getOverlaySize(i)) / 2;
    }

    private getWedgeContainerSize(i: number): number {
        return this.getGraphSize(i) / 2;
    }

    private getWedgeContainerOffset(i: number, side: WedgeSide): number {
        return side == 'left' ? 0 : this.getGraphSize(i) / 2;
    }

    private getWedgeSize(i: number): number {
        return this.getGraphSize(i) / 2;
    }

    private getWedgeOffset(i: number, side: WedgeSide): number {
        return (side == 'left' ? 1 : -1) * (this.getGraphSize(i) / 2);
    }

    private getWedgeBorderRadius(i: number, side: WedgeSide): string {
        if (side == 'left') {
            return '0' + (' ' + this.getGraphSize(i) + 'px').repeat(2) + ' 0';
        } else if (side == 'right') {
            return this.getGraphSize(i) + 'px 0 0 ' + this.getGraphSize(i) + 'px';
        }
    }

    private getWedgeRotation(i: number, side: WedgeSide): number {
        const MAX_ROTATION_DEG: number = 180;

        var minRotationArcLength: number = this.strokeWidth / 2;
        var minRotationDegrees: number = (180 * minRotationArcLength) / (Math.PI * ((this.getGraphSize(i) / 2) - minRotationArcLength));
        var graphValueDegrees: number = 360 * this.graphValues[i];

        if (side == 'left') {
            return graphValueDegrees < MAX_ROTATION_DEG ? 0 : graphValueDegrees - MAX_ROTATION_DEG;
        } else if (side == 'right') {
            return Math.min(MAX_ROTATION_DEG, Math.max(minRotationDegrees, graphValueDegrees));
        }
    }

    private getMarkerTransformOrigin(i: number): string {
        return '50% calc(' + (this.getGraphSize(i) / 2) + 'px)'
    }

    private getMarkerRotation(i: number, type: MarkerType): number {
        var graphRadius: number = (this.getGraphSize(i) / 2) - (this.strokeWidth / 2);

        if (type == 'start') {
            var startRotationArcLength: number = this.strokeWidth / 2;
            return (180 * startRotationArcLength) / (Math.PI * graphRadius);
        } else if (type == 'end') {
            var minRotationArcLength: number = this.strokeWidth / 2;
            var minRotationDegrees: number = (180 * minRotationArcLength) / (Math.PI * ((this.getGraphSize(i) / 2) - minRotationArcLength));
            return Math.max(360 * this.graphValues[i], minRotationDegrees);
        }
    }

    private arcLengthToDegrees(arcLength: number, radius: number): number {
        return (180 * arcLength) / (Math.PI * radius)
    }

    private degreesToArcLength(degrees: number, radius: number): number {
        return (radius * Math.PI) * (degrees / 180);
    }
}

type WedgeSide = 'left' | 'right';
type MarkerType = 'start' | 'end';

interface IGraphOptions {
    foregroundColor: string;
    backgroundColor: string,
    icon?: string;
}