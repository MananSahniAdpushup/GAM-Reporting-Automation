import csv from "csvtojson";

import GoogleSheet from "../../modules/GoogleSheets";
import GAMReporting from "../../modules/GAMAPI";
import BannerFPEConfig from "../../modules/BannerFPEConfig";
import CONSTANTS from "./Constants";
import Utils from "../../helpers/utils";
import { GAMReportOptions } from "../../modules/GAMAPI/types";
import { GoogleSheetsData } from "../../modules/GoogleSheets/types";
import { FPEServiceConfig } from "../../modules/BannerFPEConfig/types";

class FPENetworkSheetUpdater {
  sheetName: string;
  sheetId: string;
  creds: string;
  sheetInstance: GoogleSheet;
  gamApiReportingInstance: GAMReporting;
  bannerFpeConfigInstance: BannerFPEConfig;
  constructor(
    sheetId: string,
    creds: string,
    gamApiReporting: GAMReporting,
    bannerFpeConfig: BannerFPEConfig,
    sheetName: string = "Sheet1"
  ) {
    this.sheetName = sheetName;
    this.sheetId = sheetId;
    this.creds = creds;
    this.gamApiReportingInstance = gamApiReporting;
    this.bannerFpeConfigInstance = bannerFpeConfig;
    this.sheetInstance = new GoogleSheet(this.sheetId, this.creds);
  }
  isServiceEnabledOnSite(site: FPEServiceConfig): boolean {
    const { configs = [], floorPriceConfig } = site;
    const { floorEngineTypeSplit = [] } = floorPriceConfig;

    const services = floorEngineTypeSplit.filter(
      (fpe) => fpe.engineType === CONSTANTS.ENGINE_TYPES.HC_FLOORS
    );
    if (services.length === 0) return true;

    const serviceConfig = configs.filter(
      (config) =>
        config.enabled &&
        config.serviceType === CONSTANTS.SERVICE_CONFIGS.SERVICE_NAMES.DRSD
    );
    if (!serviceConfig.length) return false;
    return true;
  }
  async getAllEligibleSites(): Promise<Array<string | number>> {
    const allFPESites = await this.bannerFpeConfigInstance.getAllFPEConfigs();
    const eligibleSites: Array<string | number> = [];
    allFPESites.forEach((site) => {
      if (
        !site.floorPriceConfig.enabled ||
        !this.isServiceEnabledOnSite(site)
      ) {
        return;
      }
      eligibleSites.push(site.siteId);
    });
    return eligibleSites;
  }
  getKVPS() {
    return Object.values(CONSTANTS.KVP_IDS);
  }
  getTotalImpressionsAndRevenueConfig(
    siteId: string | number,
    startDate: Date,
    endDate: Date
  ): GAMReportOptions {
    const kvps = this.getKVPS();
    const allLineitemTypesMap = this.gamApiReportingInstance.LINEITEM_TYPES;
    let query = `CUSTOM_TARGETING_VALUE_ID in (${kvps.join(
      ","
    )}) AND AD_UNIT_NAME like '%ADP_${siteId}%' AND NOT LINE_ITEM_TYPE IN ('${
      allLineitemTypesMap.HOUSE
    }')`;
    return {
      adUnitView: "TOP_LEVEL",
      dateRangeType: "CUSTOM_DATE",
      startDate: startDate,
      endDate: endDate,
      dimensions: ["DATE", "CUSTOM_CRITERIA"],
      filter: query,
      metrics: [
        "TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS",
        "TOTAL_LINE_ITEM_LEVEL_CPM_AND_CPC_REVENUE",
      ],
    };
  }
  getTotalAdRequestReportConfig(
    siteId: string | number,
    startDate: Date,
    endDate: Date
  ): GAMReportOptions {
    const kvps = this.getKVPS();
    let query = `CUSTOM_TARGETING_VALUE_ID in (${kvps.join(
      ","
    )}) AND AD_UNIT_NAME like '%ADP_${siteId}%'`;
    return {
      adUnitView: "TOP_LEVEL",
      dateRangeType: "CUSTOM_DATE",
      startDate: startDate,
      endDate: endDate,
      dimensions: ["DATE", "CUSTOM_CRITERIA"],
      filter: query,
      metrics: [
        "TOTAL_CODE_SERVED_COUNT",
        "TOTAL_INVENTORY_LEVEL_UNFILLED_IMPRESSIONS",
      ],
    };
  }
  getSheetData(
    siteData: Array<string | number | Record<string, string>>
  ): GoogleSheetsData {
    const sheetData: GoogleSheetsData = [];
    let controlIdx: number | undefined;
    for (let idx = 0; idx < siteData.length; idx += 1) {
      // siteData.forEach((row: any, idx: number) => {
      const row: any = siteData[idx];
      if (row["Dimension.CUSTOM_CRITERIA"] === CONSTANTS.CONTROL_KEY) {
        controlIdx = idx;
      }
      sheetData.push({
        Date: row["Dimension.DATE"],
        "Site ID": row["Site ID"],
        "Key Value": row["Dimension.CUSTOM_CRITERIA"],
        "Total Code Served": +row["Column.TOTAL_CODE_SERVED_COUNT"],
        "Unfilled Impressions":
          +row["Column.TOTAL_INVENTORY_LEVEL_UNFILLED_IMPRESSIONS"],
        "Total Impressions": +row["Column.TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS"],
        "Ad Requests":
          +row["Column.TOTAL_CODE_SERVED_COUNT"] +
          +row["Column.TOTAL_INVENTORY_LEVEL_UNFILLED_IMPRESSIONS"],
        "Total Revenue":
          +row["Column.TOTAL_LINE_ITEM_LEVEL_CPM_AND_CPC_REVENUE"] / 1e6,
        "Fill Rate":
          +row["Column.TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS"] /
          (+row["Column.TOTAL_CODE_SERVED_COUNT"] +
            +row["Column.TOTAL_INVENTORY_LEVEL_UNFILLED_IMPRESSIONS"]),
        ECPM:
          (+row["Column.TOTAL_LINE_ITEM_LEVEL_CPM_AND_CPC_REVENUE"] * 1000) /
          1e6 /
          +row["Column.TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS"],
        "Request ECPM":
          (+row["Column.TOTAL_LINE_ITEM_LEVEL_CPM_AND_CPC_REVENUE"] * 1000) /
          1e6 /
          (+row["Column.TOTAL_CODE_SERVED_COUNT"] +
            +row["Column.TOTAL_INVENTORY_LEVEL_UNFILLED_IMPRESSIONS"]),
      });
    }
    if (controlIdx === undefined) {
      return sheetData;
    }
    let totalAdRequests = 0;
    for (let idx = 0; idx < sheetData.length; idx += 1) {
      // sheetData.forEach((row: any, idx: number) => {
      const row = sheetData[idx];
      totalAdRequests += row["Ad Requests"];
      if (idx === controlIdx) {
        continue;
      }
      const controlRow: any = sheetData[controlIdx as number];
      row["Request ECPM diff"] =
        (+row["Request ECPM"] - +controlRow["Request ECPM"]) /
        +controlRow["Request ECPM"];
    }
    for (let idx = 0; idx < sheetData.length; idx += 1) {
      // sheetData.forEach((row: any, idx: number) => {
      const row = sheetData[idx];
      const split = row["Ad Requests"] / totalAdRequests;
      const projectedRevenue = row["Total Revenue"] / split;
      row["Projected revenue"] = projectedRevenue;
      row["Split"] = split;
      row["Total Ad requests"] = totalAdRequests;
      if (idx === controlIdx) {
        row["control rev"] = row["Projected revenue"];
        row["control adr"] = row["Total Ad requests"];
        continue;
      }
      row["experiment rev"] = row["Projected revenue"];
      row["experiment adr"] = row["Total Ad requests"];
    }
    return sheetData;
  }
  async getData(
    siteId: string | number,
    startDate: Date,
    endDate: Date
  ): Promise<Array<Record<string, any>>> {
    const totalImpressionsAndRevenueReportConfig =
      this.getTotalImpressionsAndRevenueConfig(siteId, startDate, endDate);
    const totalAdRequestReportConfig = this.getTotalAdRequestReportConfig(
      siteId,
      startDate,
      endDate
    );
    const totalImpressionsAndRevenueReportPath =
      await this.gamApiReportingInstance.fetchReport(
        totalImpressionsAndRevenueReportConfig
      );
    const totalAdRequestReportPath =
      await this.gamApiReportingInstance.fetchReport(
        totalAdRequestReportConfig
      );
    const totalImpressionsAndRevenueData = await csv({
      flatKeys: true,
    }).fromFile(totalImpressionsAndRevenueReportPath);
    const totalAdRequestData = await csv({ flatKeys: true }).fromFile(
      totalAdRequestReportPath
    );
    const commonKeys = ["Dimension.DATE", "Dimension.CUSTOM_CRITERIA"];
    let data = Utils.joinData(commonKeys, [
      totalImpressionsAndRevenueData,
      totalAdRequestData,
    ]);
    data = Utils.assignLiteralColumn(data, "Site ID", siteId.toString());
    return data;
  }
  async updateSheet(
    sites?: Array<string | number>,
    startDateString?: string,
    endDateString?: string
  ) {
    try {
      const eligibleSites =
        (sites?.length && sites) || (await this.getAllEligibleSites());
      let origStartDate =
        (startDateString && new Date(startDateString)) ||
        Utils.getYesterdayDate();
      const endDate =
        (endDateString && new Date(endDateString)) || Utils.getYesterdayDate();
      console.log(eligibleSites, origStartDate, endDate);
      for (const site of eligibleSites) {
        let startDate = origStartDate;
        while (startDate <= endDate) {
          const data = await this.getData(site, startDate, startDate);
          const sheetData = this.getSheetData(data);
          await this.sheetInstance.append(sheetData, this.sheetName);
          const nextDay = Utils.addDays(startDate, 1);
          startDate = nextDay;
        }
      }
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to update Banner FPE Network sheet: ${error}`);
    }
  }
}

export default FPENetworkSheetUpdater;
