import client from "./client";
import type { PublicContact } from "../types";

export const contactsApi = {
  getAll: () => client.get<PublicContact[]>("/store/contacts").then((response) => response.data),
};
