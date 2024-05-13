import axios from "axios";
import CONSTANTS from "./Constants";
import { AccessToken, BannerConfig, FPEServiceConfig } from "./types";

class BannerFPEConfig {
  accessToken: AccessToken;
  endpointDomain: string;
  emailId: string;
  refreshToken: string;
  constructor(endpointDomain: string, emailId: string, refreshToken: string) {
    this.endpointDomain = endpointDomain;
    this.emailId = emailId;
    this.refreshToken = refreshToken;
    this.accessToken = {
      value: "",
      timeOfGeneration: 0,
    };
  }

  async setAccessToken(accessTokenValue: string): Promise<void> {
    this.accessToken = {
      value: accessTokenValue,
      timeOfGeneration: new Date().getTime(),
    };
  }

  async getAccessToken(): Promise<AccessToken> {
    if (
      this.accessToken.value.length &&
      this.accessToken.timeOfGeneration &&
      this.isAccessTokenValid(this.accessToken.timeOfGeneration)
    ) {
      return this.accessToken;
    }
    await this.setAccessToken(await this.generateAccessToken());
    return this.accessToken;
  }
  isAccessTokenValid(accessTokenGenerationTime: number): boolean {
    const currTime = new Date().getTime();
    const dateDiff = 24 * 60 * 60 * 1000;
    return currTime - dateDiff < accessTokenGenerationTime;
  }
  async generateAccessToken(): Promise<string> {
    const { PATHS } = CONSTANTS;
    const endPoint = `${this.endpointDomain}/${PATHS.ACCESS_TOKEN}`;
    const headers = {
      refreshToken: this.refreshToken,
    };
    try {
      const failedError = new Error("Couldn't generate accessToken");
      const response = await axios.post(endPoint, undefined, {
        headers,
      });
      if (response.status !== 200) {
        throw failedError;
      }
      const responseBody = response.data;
      if (!responseBody.success) {
        throw failedError;
      }
      const data = response.data.data;
      const accessToken = data.accessToken;
      return accessToken;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
  async getAllFPEConfigs(): Promise<Array<FPEServiceConfig>> {
    const { PATHS } = CONSTANTS;
    const path = PATHS.ALL_BANNER_SITE_CONFIGS;
    const url = `${this.endpointDomain}/${path}`;
    try {
      const failedError = new Error("Couldn't fetch all FPE site configs");
      const accessToken = await this.getAccessToken();
      const headers = {
        accessToken: accessToken.value,
      };
      const response = await axios.get(url, {
        headers,
      });
      if (response.status !== 200) {
        throw failedError;
      }
      const responseBody = response.data;
      if (!responseBody.success) {
        throw failedError;
      }
      const data = responseBody.data;
      const siteConfigs = data.sites;
      return siteConfigs;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
  async fetchConfig(siteId: string | number): Promise<BannerConfig> {
    const { PATHS } = CONSTANTS;
    const path = PATHS.BANNER_SITE_CONFIG;
    const url = `${this.endpointDomain}/${path.replace(
      "__SITE_ID__",
      siteId as string
    )}`;
    try {
      const failedError = new Error(`Couldn't fetch site config of ${siteId}`);
      const accessToken = await this.getAccessToken();
      const headers = {
        accessToken: accessToken.value,
      };
      const response = await axios.get(url, {
        headers,
      });
      if (response.status !== 200) {
        throw failedError;
      }
      const responseBody = response.data;
      if (!responseBody.success) {
        throw failedError;
      }
      const data = responseBody.data;
      const config = data.config;
      return config;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}

export default BannerFPEConfig;
