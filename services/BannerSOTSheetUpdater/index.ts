import BannerFPEConfig from "../../modules/BannerFPEConfig";
import GAMReporting from "../../modules/GAMAPI";
import GoogleSheet from "../../modules/GoogleSheets";
import CONSTANTS from "./Constants.js";
import Utils from "../../helpers/utils";
import { FloorEngineType, FloorPriceConfig } from "./types";
import csv from "csvtojson";
import { GoogleSheetsData } from "../../modules/GoogleSheets/types";
import { GAMReportOptions } from "../../modules/GAMAPI/types";
import {
  BannerConfig,
  FPEServiceConfig,
} from "../../modules/BannerFPEConfig/types";
import _ from "lodash";

class SOTSheetUpdater {
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
  getControlKVP(loggingVersion: number): string {
    return CONSTANTS.KVP_IDS[
      CONSTANTS.KVP_TEMPLATE.replace(
        "__VALUE__",
        `${CONSTANTS.VALUE_TEMPLATES.control}_${loggingVersion.toString()}`
      ) as keyof typeof CONSTANTS.KVP_IDS
    ];
  }
  getKVPS(floorPriceConfig: FloorPriceConfig): Array<string> {
    const { ENGINE_TYPES } = CONSTANTS;
    const kvps: Array<string> = [];
    const loggingVersion = floorPriceConfig.loggingVersion;
    floorPriceConfig.floorEngineTypeSplit.forEach((type: FloorEngineType) => {
      const {
        engineType,
        floorPricingModel,
        trafficSplit,
        incrementDecrementActive = false,
      } = type;
      if (trafficSplit == 0) {
        return;
      }
      let kvp = CONSTANTS.KVP_TEMPLATE;
      let value: string =
        CONSTANTS.VALUE_TEMPLATES[
          engineType as keyof typeof CONSTANTS.VALUE_TEMPLATES
        ];
      if (
        engineType === ENGINE_TYPES.HC_FLOORS &&
        floorPricingModel != undefined
      ) {
        value = `${value}_${
          CONSTANTS.VALUE_TEMPLATES[
            floorPricingModel as keyof typeof CONSTANTS.VALUE_TEMPLATES
          ]
        }`;
      }
      if (incrementDecrementActive) {
        value = `${value}_${CONSTANTS.VALUE_TEMPLATES.incDec}`;
      }
      value = `${value}_${loggingVersion}`;
      kvp = kvp.replace("__VALUE__", value);
      kvps.push(CONSTANTS.KVP_IDS[kvp as keyof typeof CONSTANTS.KVP_IDS]);
    });
    kvps.push(this.getControlKVP(loggingVersion));
    return kvps;
  }
  getTotalImpressionsAndRevenueConfig(
    siteConfig: BannerConfig
  ): GAMReportOptions {
    const { adUnits = [], siteId } = siteConfig;
    const kvps = this.getKVPS(siteConfig.floorPriceConfig);
    const allLineitemTypesMap = this.gamApiReportingInstance.LINEITEM_TYPES;
    let query = `CUSTOM_TARGETING_VALUE_ID IN (${kvps.join(
      ","
    )}) AND NOT LINE_ITEM_TYPE IN ('${allLineitemTypesMap.HOUSE}')`;
    if (adUnits.length > 0) {
      query += ` AND AD_UNIT_NAME IN ('${adUnits.join("','")}')`;
    } else {
      query += ` AND AD_UNIT_NAME LIKE '%ADP_${siteId}%'`;
    }

    return {
      adUnitView: "TOP_LEVEL",
      dateRangeType: "CUSTOM_DATE",
      startDate: Utils.getYesterdayDate(),
      endDate: Utils.getYesterdayDate(),
      dimensions: ["DATE", "CUSTOM_CRITERIA"],
      filter: query,
      metrics: [
        "TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS",
        "TOTAL_LINE_ITEM_LEVEL_CPM_AND_CPC_REVENUE",
      ],
    };
  }
  getTotalAdRequestReportConfig(siteConfig: BannerConfig): GAMReportOptions {
    const { adUnits = [], siteId, floorPriceConfig } = siteConfig;
    const kvps = this.getKVPS(floorPriceConfig);
    let query = `CUSTOM_TARGETING_VALUE_ID IN (${kvps.join(",")})`;
    if (adUnits.length > 0) {
      query += ` AND AD_UNIT_NAME IN ('${adUnits.join("','")}')`;
    } else {
      query += ` AND AD_UNIT_NAME LIKE '%ADP_${siteId}%'`;
    }
    return {
      adUnitView: "TOP_LEVEL",
      dateRangeType: "CUSTOM_DATE",
      startDate: Utils.getYesterdayDate(),
      endDate: Utils.getYesterdayDate(),
      dimensions: ["DATE", "CUSTOM_CRITERIA"],
      filter: query,
      metrics: [
        "TOTAL_CODE_SERVED_COUNT",
        "TOTAL_INVENTORY_LEVEL_UNFILLED_IMPRESSIONS",
      ],
    };
  }

  getMatchingConfig(
    siteConfig: BannerConfig,
    engineType: string
  ): BannerConfig {
    const { floorPriceConfig } = siteConfig;
    const { floorEngineTypeSplit } = floorPriceConfig;
    const newSplit = floorEngineTypeSplit.filter((type: FloorEngineType) => {
      return type.engineType === engineType && type.trafficSplit > 0;
    });
    if (newSplit.length === 0) {
      throw new Error(`No matching engine type found for ${engineType}`);
    }
    const newConfig = _.cloneDeep(siteConfig);
    if (engineType === CONSTANTS.ENGINE_TYPES.MANUAL_FLOORS) {
      newConfig.adUnits = [];
    }
    newConfig.floorPriceConfig.floorEngineTypeSplit = newSplit;
    return newConfig;
  }

  async getData(config: BannerConfig): Promise<Array<Record<string, any>>> {
    const { siteId } = config;
    const totalAdRequestReportConfig =
      this.getTotalAdRequestReportConfig(config);
    const totalImpressionsAndRevenueReportConfig =
      this.getTotalImpressionsAndRevenueConfig(config);
    const totalAdRequestsReportPath =
      await this.gamApiReportingInstance.fetchReport(
        totalAdRequestReportConfig
      );
    const totalImpressionsAndRevenueReportPath =
      await this.gamApiReportingInstance.fetchReport(
        totalImpressionsAndRevenueReportConfig
      );
    const totalAdRequestsData = await csv({ flatKeys: true }).fromFile(
      totalAdRequestsReportPath
    );
    const totalImpressionsAndRevenueData = await csv({
      flatKeys: true,
    }).fromFile(totalImpressionsAndRevenueReportPath);
    const commonKeys = ["Dimension.DATE", "Dimension.CUSTOM_CRITERIA"];
    let data = Utils.joinData(commonKeys, [
      totalAdRequestsData,
      totalImpressionsAndRevenueData,
    ]);
    data = Utils.assignLiteralColumn(data, "siteId", siteId.toString());
    return data;
  }

  async getManualData(
    siteConfig: BannerConfig
  ): Promise<Array<Record<string, any>>> {
    try {
      const { ENGINE_TYPES } = CONSTANTS;
      const manualConfig = this.getMatchingConfig(
        siteConfig,
        ENGINE_TYPES.MANUAL_FLOORS
      );
      let manualData = await this.getData(manualConfig);
      manualData = Utils.assignLiteralColumn(
        manualData,
        "Engine Type",
        ENGINE_TYPES.MANUAL_FLOORS
      );
      const sheetData = this.getSheetData(manualData);
      return sheetData;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async getHCData(
    siteConfig: BannerConfig
  ): Promise<Array<Record<string, any>>> {
    try {
      const { ENGINE_TYPES } = CONSTANTS;
      const hcConfig = this.getMatchingConfig(
        siteConfig,
        ENGINE_TYPES.HC_FLOORS
      );
      let hcData = await this.getData(hcConfig);
      hcData = Utils.assignLiteralColumn(
        hcData,
        "Engine Type",
        ENGINE_TYPES.HC_FLOORS
      );
      const sheetData = this.getSheetData(hcData);
      return sheetData;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async getSiteGAMData(
    site: string | number
  ): Promise<Array<Record<string, any>>> {
    const siteConfig = await this.bannerFpeConfigInstance.fetchConfig(site);

    const manualData = await this.getManualData(siteConfig);
    const hcData = await this.getHCData(siteConfig);

    const data = Utils.unionData(manualData, hcData);

    return data;
  }
  getSheetData(
    siteData: Array<string | number | Record<string, string>>
  ): GoogleSheetsData {
    const sheetData: GoogleSheetsData = [];
    let controlIdx: number | undefined;
    siteData.forEach((row: any, idx: number) => {
      if (
        row["Dimension.CUSTOM_CRITERIA"].indexOf(
          CONSTANTS.VALUE_TEMPLATES.control
        ) > -1
      ) {
        controlIdx = idx;
      }
      sheetData.push({
        Date: row["Dimension.DATE"],
        "Site ID": row.siteId,
        "Key Value": row["Dimension.CUSTOM_CRITERIA"],
        "Total Code Served": +row["Column.TOTAL_CODE_SERVED_COUNT"],
        "Unfilled Impressions":
          +row["Column.TOTAL_INVENTORY_LEVEL_UNFILLED_IMPRESSIONS"],
        "Total Impressions": +row["Column.TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS"],
        "Total Ad Requests":
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
        "Engine Type": row["Engine Type"],
      } as Record<string, string | number>);
    });
    if (controlIdx == undefined) {
      return sheetData;
    }
    sheetData.forEach((row: any, idx: number) => {
      if (idx === controlIdx) {
        return;
      }
      const controlRow: any = sheetData[controlIdx as number];
      row["Request ECPM diff"] =
        (+row["Request ECPM"] - +controlRow["Request ECPM"]) /
        +controlRow["Request ECPM"];
    });
    return sheetData;
  }
  async updateSheet(sites: Array<string | number> = []): Promise<void> {
    try {
      if (sites.length === 0) {
        sites = await this.getAllEligibleSites();
      }
      console.log(sites);
      // return;
      for (const site of sites) {
        const data: Array<string | number | Record<string, string>> =
          await this.getSiteGAMData(site);

        await this.sheetInstance.append(data, this.sheetName);
      }
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to update SOT sheet: ${error}`);
    }
  }
}

export default SOTSheetUpdater;
