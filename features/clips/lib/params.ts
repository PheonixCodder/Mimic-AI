import { parseAsString } from "nuqs/server";

export const clipsSearchParams = {
  query: parseAsString.withDefault(""),
};
