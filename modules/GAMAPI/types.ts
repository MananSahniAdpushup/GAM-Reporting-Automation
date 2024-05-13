import {
  QueryResult,
  ReportOptions,
  ReportQuery,
} from "../../globals/types/Reportable.js";

type ReportId = Number | string;

type ReportStatus = string;

type GAMHeaders = {
  refresh_token: string;
  network_code: string | Number;
  ["Content-Type"]?: string;
};

type GAMReportOptions = ReportOptions & {
  startDate: Date;
  endDate: Date;
  metrics: Array<string>;
  dimensions: Array<string>;
  filter: string;
  dateRangeType: string;
  adUnitView: string;
};

type ReportDate = {
  year: number;
  month: number;
  day: number;
};

type GAMReportQuery = ReportQuery & {
  startDate: ReportDate;
  endDate: ReportDate;
  dateRangeType: string;
  adUnitView: string;
  columns: Array<string>;
  dimensions: Array<string>;
  whereClause: string;
};

type GAMReportQueryResult = QueryResult & string;

export type {
  ReportId,
  ReportStatus,
  GAMHeaders,
  GAMReportOptions,
  GAMReportQuery,
  GAMReportQueryResult,
};
