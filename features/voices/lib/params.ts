import { parseAsString } from "nuqs/server";

export const voicesSearchParams = {
  query: parseAsString.withDefault(""),
};
