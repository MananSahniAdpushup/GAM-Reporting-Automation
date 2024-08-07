type AccessToken = {
  value: string;
  timeOfGeneration: number;
};

type SiteConfig = {
  enabled: boolean;
  floorEngineTypeSplit: Array<{
    engineType: string;
    floorPricingModel: string;
    trafficSplit: number;
    useBannerDRSDMultiplier: boolean;
  }>;
  loggingVersion: number;
  trafficSplit: number;
};

type ManualFloorsRule = {
  adUnits: Array<string>;
  countries: Array<string>;
  platforms: Array<string>;
  floor: number;
};

type BannerConfig = {
  floorPriceConfig: SiteConfig;
  siteDomain: string;
  siteId: string | number;
  manualFloorRules: Array<ManualFloorsRule>;
  configs: Array<any>;
  adUnits: Array<string>;
};

type FPEServiceConfig = {
  floorPriceConfig: {
    enabled: boolean;
    floorEngineTypeSplit: Array<{
      engineType: string;
      floorPricingModel: string;
      trafficSplit: number;
      useBannerDRSDMultiplier?: boolean;
    }>;
    loggingVersion: number;
    trafficSplit: number;
  };
  siteDomain: string;
  siteId: string | number;
  configs?: [
    {
      enabled: boolean;
      serviceType: string;
    }
  ];
};

export type {
  AccessToken,
  BannerConfig,
  SiteConfig,
  ManualFloorsRule,
  FPEServiceConfig,
};
