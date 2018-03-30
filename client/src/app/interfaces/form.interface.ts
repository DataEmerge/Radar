import { ModalService } from 'app/services/modal.service';
import * as EventInterfaces from 'app/interfaces/events.interface';

export type modalPosition = 'middle' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type modalType = 'BaseFormModal' | 'ChangelogModal' | 'DoneFormModal' | 'EventLogFormModal';

export type miscFormType = 'BaseForm' | 'Changelog' | 'DoneForm' | 'EventLogForm';
export type formType = miscFormType;

export interface IForm {
    formType: formType;
    modalService: ModalService;

    eventHandler(event: EventInterfaces.Internal.IInternalEvent): void;
    closeForm(): void;
}

export interface IDatetimePopupButtonOptions {
    isVisible: boolean;
    label: string;
    CSSClasses: string;
}