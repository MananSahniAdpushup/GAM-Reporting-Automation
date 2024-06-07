import { SiteConfig } from "../../modules/BannerFPEConfig/types";

type FloorPriceConfig = {
  enabled: boolean;
  floorEngineTypeSplit: Array<FloorEngineType>;
  loggingVersion: number;
  trafficSplit: number;
};

type FloorEngineType = {
  engineType: string;
  floorPricingModel?: string;
  trafficSplit: number;
  useBannerDRSDMultiplier?: boolean;
  incrementDecrementActive?: boolean;
};

export type { FloorPriceConfig, FloorEngineType };
