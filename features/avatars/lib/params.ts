import { parseAsString } from "nuqs/server";

export const avatarsSearchParams = {
  query: parseAsString.withDefault(""),
};
