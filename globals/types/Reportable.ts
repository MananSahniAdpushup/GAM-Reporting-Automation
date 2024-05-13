type ReportOptions = {
  startDate: Date | String | Number;
  endDate: Date | String | Number;
  metrics: Array<String> | String;
  dimensions: Array<String> | String;
  filter: Array<String> | String;
};

type ReportData = Array<Array<String>>;

type ReportQuery = unknown;

type QueryResult = unknown;

interface Reportable {
  generateQuery(options: ReportOptions): ReportQuery;
  runQuery(query: ReportQuery): Promise<QueryResult>;
}

export type { ReportOptions, ReportData, Reportable, ReportQuery, QueryResult };
