import { ServerBase } from 'classes/serverBase';

export abstract class BaseController extends ServerBase {
    public showLogs(value?: boolean): void {
        if (value == null) {
            this.logState();
        } else {
            this.displayLogs = true;
            this.log(this.className + ' logging turned', value ? 'on' : 'off');
            this.displayLogs = value;
        }
    }
}