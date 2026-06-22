import client from "./client";
import { HomeSlide } from "../types";

export const homeSlidesApi = {
  getAll: () =>
    client.get<HomeSlide[]>("/store/home-slides").then((res) => res.data),
};
