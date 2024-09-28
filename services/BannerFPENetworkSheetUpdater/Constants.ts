export default {
  WAIT_TIMEOUT: 10000,
  KVP_IDS: {
    "ap_fp_engine_ran=0": "448847497255",
    "ap_fp_engine_ran=1": "448847497258",
  },
  KVP_TEMPLATE: "ap_fp_engine_ran=__VALUE__",
  VALUE_TEMPLATES: {
    true: "0",
    false: "1",
  },
  CONTROL_KEY: "ap_fp_engine_ran=0",
  SERVICE_CONFIGS: {
    SERVICE_NAMES: {
      DRSD: "bannerMultiplierDimensionReductionViaStandardDeviation",
    },
  },

  ENGINE_TYPES: {
    HC_FLOORS: "hcFloors",
    MANUAL_FLOORS: "manualFloors",
  },
};
