import { Data } from "../../globals/types/Storable.js";

type GoogleSheetsData = Data & Array<
  Array<string | number> | Record<string, string | number> | string | number
>;

export type { GoogleSheetsData };
