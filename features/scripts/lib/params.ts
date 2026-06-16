import { parseAsString } from "nuqs/server";

export const scriptsSearchParams = {
  query: parseAsString.withDefault(""),
};
