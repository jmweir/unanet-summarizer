import { EditModeLoader } from "./Loaders/EditModeLoader";
import { ITimesheetLoader } from "./Loaders/ITimesheetLoader";
import { ReviewModeLoader } from "./Loaders/ReviewModeLoader";
import { Timesheet } from "./Timesheet";
import { TimesheetMode } from "./TimesheetMode";

export class Summarizer {
  public loader: ITimesheetLoader;
  public timesheetMode: TimesheetMode;
  public timesheet: Timesheet;
  private timesheetTable: Element;
  private title: string;

  constructor(url: string, title: string, timesheetTable: Element) {
    this.title = title;
    this.timesheetTable = timesheetTable;

    const isViewMode = url.toString().indexOf("time/view") > -1;
    this.timesheetMode = isViewMode ? TimesheetMode.View : TimesheetMode.Edit;

    this.loader = this.getLoader();
    this.timesheet = this.loader.getTimesheet();
  }

  private getLoader = (): ITimesheetLoader => {
    if (this.timesheetMode === TimesheetMode.Edit) {
      return new EditModeLoader(this.title, this.timesheetTable);
    } else {
      return new ReviewModeLoader(this.title, this.timesheetTable);
    }
  };
}
