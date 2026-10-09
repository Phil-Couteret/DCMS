import * as billing from "./billing";
import * as customers from "./customers";
import * as equipmentSettings from "./equipment-settings";
import * as operations from "./operations";
import * as shell from "./shell";

// Every area's dictionary, merged per language.
const AREAS = [shell, operations, customers, billing, equipmentSettings];

export const MESSAGES: Record<"es" | "fr", Record<string, string>> = {
  es: Object.assign({}, ...AREAS.map((a) => a.es)),
  fr: Object.assign({}, ...AREAS.map((a) => a.fr)),
};
