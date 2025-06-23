declare module 'react-big-calendar' {
  import { ComponentType } from 'react';
  
  export interface Event {
    id: string | number;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: any;
  }
  
  export interface CalendarProps {
    events: Event[];
    localizer: any;
    startAccessor?: string | ((event: Event) => Date);
    endAccessor?: string | ((event: Event) => Date);
    titleAccessor?: string | ((event: Event) => string);
    resourceAccessor?: string | ((event: Event) => any);
    allDayAccessor?: string | ((event: Event) => boolean);
    defaultView?: string;
    views?: string[] | { [key: string]: boolean };
    date?: Date;
    onNavigate?: (newDate: Date) => void;
    onView?: (view: string) => void;
    onSelectEvent?: (event: Event) => void;
    onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[] | string[]; action: 'select' | 'click' | 'doubleClick' }) => void;
    onDoubleClickEvent?: (event: Event) => void;
    onSelecting?: (range: { start: Date; end: Date }) => boolean | undefined;
    selected?: Event;
    components?: {
      event?: ComponentType<any>;
      eventWrapper?: ComponentType<any>;
      dayWrapper?: ComponentType<any>;
      dateCellWrapper?: ComponentType<any>;
      toolbar?: ComponentType<any>;
      agenda?: {
        date?: ComponentType<any>;
        time?: ComponentType<any>;
        event?: ComponentType<any>;
      };
      day?: {
        header?: ComponentType<any>;
        event?: ComponentType<any>;
      };
      week?: {
        header?: ComponentType<any>;
        event?: ComponentType<any>;
      };
      month?: {
        header?: ComponentType<any>;
        dateHeader?: ComponentType<any>;
        event?: ComponentType<any>;
      };
    };
    formats?: any;
    messages?: any;
    timeslots?: number;
    rtl?: boolean;
    style?: React.CSSProperties;
    className?: string;
    elementProps?: React.HTMLAttributes<HTMLElement>;
    [key: string]: any;
  }
  
  export class Calendar extends React.Component<CalendarProps> {}
  
  export function dateFnsLocalizer(args: {
    format: (date: Date, format: string, options?: any) => string;
    parse: (dateString: string, format: string, options?: any) => Date;
    startOfWeek: (date: Date, options?: any) => Date;
    getDay: (date: Date) => number;
    locales: { [key: string]: any };
  }): any;
  
  export function momentLocalizer(moment: any): any;
  
  export function globalizeLocalizer(globalizeInstance: any): any;
  
  export const Views: {
    MONTH: string;
    WEEK: string;
    WORK_WEEK: string;
    DAY: string;
    AGENDA: string;
  };
}
