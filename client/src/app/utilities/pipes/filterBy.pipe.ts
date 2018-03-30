import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filterBy', pure: false })
export class FilterBy implements PipeTransform {
    public transform(items: any[], filter: string, property: string): any[] {
        if (!items || !filter) {
            return items;
        }

        return items.filter((item: any) => this.applyFilter(item[property], filter));
    }

    private applyFilter(value: string, filter: string): boolean {
        return !(filter && value && value.toLowerCase().indexOf(filter.toLowerCase()) === -1);
    }
}