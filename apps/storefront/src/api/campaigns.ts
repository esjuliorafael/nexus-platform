import client from "./client";
import type { StorefrontCampaign } from "../types";

export const storefrontCampaignApi = {
  getActive: () =>
    client
      .get<StorefrontCampaign | null>("/store/campaigns/active")
      .then((response) => response.data),
};
