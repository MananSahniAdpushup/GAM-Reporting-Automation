import { Data } from "../../globals/types/Storable.js";

type GoogleSheetsData = Array<
  Array<string | number> | Record<string, string | number>
>;

export type { GoogleSheetsData };
