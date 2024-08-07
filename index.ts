import BannerFPEConfig from "./modules/BannerFPEConfig";
import GAMReporting from "./modules/GAMAPI";
import BannerSOTSheetUpdater from "./services/BannerSOTSheetUpdater";
import config from "./configs/config";
import BannerFPENetworkSheetUpdater from "./services/BannerFPENetworkSheetUpdater";
import { CronJob } from "cron";

async function runService() {
  const fpeConfig = new BannerFPEConfig(
    config.COUCHBASE.ENDPOINT_DOMAIN,
    config.COUCHBASE.EMAIL_ID,
    config.COUCHBASE.REFRESH_TOKEN
  );

  const reporting = new GAMReporting(
    config.GAM_REPORTING.NETWORK_CODE,
    config.GAM_REPORTING.REFRESH_TOKEN
  );

  const sotSheet = new BannerSOTSheetUpdater(
    config.BANNER_FPE_SHEET.SHEET_ID,
    config.BANNER_FPE_SHEET.CREDENTIALS,
    reporting,
    fpeConfig,
    config.BANNER_FPE_SHEET.SOT_SHEET_NAME
  );

  const fpeNetworkSheet = new BannerFPENetworkSheetUpdater(
    config.BANNER_FPE_SHEET.SHEET_ID,
    config.BANNER_FPE_SHEET.CREDENTIALS,
    reporting,
    fpeConfig,
    config.BANNER_FPE_SHEET.BANNER_PERFORMANCE_SHEET_NAME
  );
  await sotSheet.updateSheet();
  await fpeNetworkSheet.updateSheet();
}

var job = new CronJob("0 14 * * *", runService, null, false, "Asia/Kolkata");
job.start();
