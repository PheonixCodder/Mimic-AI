import { parseAsString } from "nuqs/server";

export const videosSearchParams = {
  query: parseAsString.withDefault(""),
  scriptId: parseAsString,
};
