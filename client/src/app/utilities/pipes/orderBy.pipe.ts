import { Injectable, Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'orderBy' })
export class orderByPipe implements PipeTransform {
    public transform(items: any[], sortBy: string): any {
        if (typeof sortBy == 'undefined') {
            console.error('Error: sortBy parameter must be supplied to OrderBy.');
            return [];
        }

        if (!items) {
            return items;
        }

        var mismatchedTypes = false;
        var result = [];
        var __this: orderByPipe = this;

        result = items.filter(function (i1, i2) {
            if (typeof i1 == 'object' && typeof i1 == 'object') {
                if (i1.hasOwnProperty(sortBy) && i2.hasOwnProperty(sortBy)) {
                    // sort objects alphanumerically by the specified property
                    return __this.sortAlphaNum(i1[sortBy], i2[sortBy]);
                } else if (i1.hasOwnProperty(sortBy) && !i2.hasOwnProperty(sortBy)) {
                    return -1;
                } else if (!i1.hasOwnProperty(sortBy) && i2.hasOwnProperty(sortBy)) {
                    return 1;
                } else {
                    return 0;
                }
            } else if (sortBy == '' && typeof i1 == 'string' && typeof i2 == 'string') {
                // sort strings alphanumerically, if empty string is passed into sortBy
                return __this.sortAlphaNum(i1, i2);
            } else if (sortBy == '' && typeof i1 == 'number' && typeof i2 == 'number') {
                // sort strings alphanumerically, if empty string is passed into sortBy
                return __this.sortAlphaNum(i1.toString(), i2.toString());
            } else {
                mismatchedTypes = true;
                console.error('Error: cannot sort array of mismatched types:', typeof i1, typeof i2);
                return 0;
            }
        });

        if (mismatchedTypes) {
            return [];
        }

        return result;
    }

    private sortAlphaNum(s1: string, s2: string): number {
        // not gonna mess with the algorithm's variables, just gonna plug them in

        var a = s1;
        var b = s2;
        var reA = /[^a-zA-Z]/g;
        var reN = /[^0-9]/g;
        var AInt = parseInt(a, 10);
        var BInt = parseInt(b, 10);

        if (isNaN(AInt) && isNaN(BInt)) {
            // neither A nor B are numbers
            var aA = a.replace(reA, "");
            var bA = b.replace(reA, "");

            if (aA === bA) {
                var aN = parseInt(a.replace(reN, ""), 10);
                var bN = parseInt(b.replace(reN, ""), 10);
                return aN === bN ? 0 : aN > bN ? 1 : -1;
            } else {
                return aA > bA ? 1 : -1;
            }
        } else if (isNaN(AInt)) {
            // A is not a number
            // to make alphanumeric sort after numeric, return 1 here
            return -1;
        } else if (isNaN(BInt)) {
            // B is not a number
            // to make alphanumeric sort after numeric, return -1 here
            return -1;
        } else {
            // both A and B are numbers
            return AInt > BInt ? 1 : -1;
        }
    }
}
