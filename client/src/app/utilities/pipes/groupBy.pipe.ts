import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'groupBy', pure: false })
export class GroupBy implements PipeTransform {
    public transform(value: Array<any>, field: string): Array<any> {
        const groupedObjects: any = value.reduce((previous, current) => {
            if (!previous[current[field]]) {
                previous[current[field]] = [current];
            } else {
                previous[current[field]].push(current);
            }

            return previous;
        }, {});

        return Object.keys(groupedObjects).map(key => ({ key, value: groupedObjects[key] }));
    }
}