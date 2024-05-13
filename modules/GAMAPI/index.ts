import { Reportable } from "../../globals/types/Reportable.js";
import {
  GAMReportOptions,
  GAMReportQuery,
  GAMReportQueryResult,
  GAMHeaders,
  ReportStatus,
} from "./types.js";
import CONFIG from "../../configs/config.js";
import CONSTANTS from "./Constants.js";
import axios, { RawAxiosRequestHeaders } from "axios";
import { existsSync, mkdirSync, createWriteStream } from "fs";
import { createGunzip } from "zlib";
import { md5 } from "js-md5";

const { GAM_REPORTING } = CONFIG;

class GAMReporting implements Reportable {
  networkCode: string | number;
  refreshToken: string;
  LINEITEM_TYPES = CONSTANTS.LINEITEM_TYPES;
  constructor(networkCode: string | number, refreshToken: string) {
    this.networkCode = networkCode;
    this.refreshToken = refreshToken;
  }
  public generateQuery(options: GAMReportOptions): GAMReportQuery {
    const {
      startDate,
      endDate,
      metrics,
      dimensions,
      filter,
      dateRangeType,
      adUnitView,
    } = options;
    const query: GAMReportQuery = {
      startDate: {
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        day: startDate.getDate(),
      },
      endDate: {
        year: endDate.getFullYear(),
        month: endDate.getMonth() + 1,
        day: endDate.getDate(),
      },
      dateRangeType: dateRangeType,
      adUnitView: adUnitView,
      columns: metrics,
      dimensions: dimensions,
      whereClause: filter,
    };
    return query;
  }

  public getHeaders(isJSON: Boolean = false): GAMHeaders {
    const headers: GAMHeaders = {
      refresh_token: this.refreshToken,
      network_code: this.networkCode,
    };

    if (isJSON) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  public async runQuery(query: GAMReportQuery): Promise<GAMReportQueryResult> {
    try {
      const url = `${GAM_REPORTING.DOMAIN}\/${GAM_REPORTING.ROUTES.RUN_REPORT}`;
      const body = JSON.stringify(query);
      const headers = this.getHeaders(
        true
      ) as unknown as RawAxiosRequestHeaders;
      const response = await axios.post(url, body, {
        headers: headers,
      });
      return JSON.stringify(response.data);
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to run query: ${error}`);
    }
  }

  public async getReportUrl(reportId: number | string): Promise<string> {
    try {
      const url = `${GAM_REPORTING.DOMAIN}\/${GAM_REPORTING.ROUTES.REPORT_URL}`;
      const headers = this.getHeaders() as unknown as RawAxiosRequestHeaders;
      const response = await axios.get(url, {
        params: { reportJobId: reportId },
        headers: headers,
      });
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to fetch report URL: ${error}`);
    }
  }

  public async getReportStatus(
    reportId: Number | String
  ): Promise<ReportStatus> {
    try {
      const url = `${GAM_REPORTING.DOMAIN}\/${GAM_REPORTING.ROUTES.REPORT_STATUS}`;
      const headers = this.getHeaders() as unknown as RawAxiosRequestHeaders;
      const response = await axios.get(url, {
        params: { reportJobId: reportId },
        headers: headers,
      });
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to fetch report status: ${error}`);
    }
  }

  public async downloadReport(
    reportUrl: String,
    fileName: String
  ): Promise<string> {
    try {
      if (!existsSync(GAM_REPORTING.TEMP_DIRECTORY)) {
        mkdirSync(GAM_REPORTING.TEMP_DIRECTORY);
      }
      const filePath = `${GAM_REPORTING.TEMP_DIRECTORY}\/${fileName}.csv`;
      const response = await axios.get(reportUrl as string, {
        responseType: "stream",
      });
      const writer = createWriteStream(filePath);
      const unzip = createGunzip();
      await new Promise((resolve, reject) => {
        response.data.pipe(unzip).pipe(writer);
        unzip.on("error", reject);
        writer.on("error", reject);
        writer.on("finish", resolve);
      });
      return filePath;
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to download report: ${error}`);
    }
  }

  public async fetchReport(options: GAMReportOptions): Promise<string> {
    const query = this.generateQuery(options);
    const reportId = await this.runQuery(query);
    const reportUrl: string = await new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const status = await this.getReportStatus(reportId);
          if (status === "COMPLETED") {
            clearInterval(checkInterval);
            clearTimeout(failTimeout);
            resolve(this.getReportUrl(reportId));
          }
        } catch (error) {
          reject(error);
        }
      }, CONSTANTS.STATUS_CHECK_TIMEOUT);
      const failTimeout = setTimeout(() => {
        clearInterval(checkInterval);
        reject("Report fetch failed: Timeout");
      }, CONSTANTS.STATUS_FAIL_TIMEOUT);
    });

    const fileName = encodeURI(md5(JSON.stringify(options)));
    return this.downloadReport(reportUrl, fileName);
  }
}

export default GAMReporting;
