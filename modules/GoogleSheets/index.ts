import { Storable } from "../../globals/types/Storable.js";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { GoogleSheetsData } from "./types.js";
import CONSTANTS from "./Constants.js";

class GoogleSheet implements Storable {
  sheetId: string;
  creds: any;
  doc: GoogleSpreadsheet;
  constructor(sheetId: string, creds: string) {
    this.sheetId = sheetId;
    this.creds = JSON.parse(Buffer.from(creds, "base64").toString());
    const scopes = CONSTANTS.SCOPES;
    const jwt = new JWT({
      email: this.creds.client_email,
      key: this.creds.private_key,
      scopes,
    });
    this.doc = new GoogleSpreadsheet(this.sheetId as string, jwt);
  }
  public async write(
    data: GoogleSheetsData,
    sheetTitle: string,
    headers?: Array<string>
  ): Promise<void> {
    try {
      await this.doc.loadInfo();
      const sheet = this.doc.sheetsByTitle[sheetTitle];
      await sheet.clear();
      if (!headers) {
        throw new Error("Headers are required to write data to Google Sheets");
      }
      await sheet.setHeaderRow(headers);
      sheet.addRows(data);
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to write data to Google Sheets: ${error}`);
    }
  }
  public async read(sheetTitle: string): Promise<GoogleSheetsData> {
    try {
      await this.doc.loadInfo();
      const sheet = this.doc.sheetsByTitle[sheetTitle];
      const rows = await sheet.getRows();
      const headers = Object.keys(rows[0].toObject());
      const data: GoogleSheetsData = [headers];
      rows.forEach((row) => {
        const rowData = headers.map((header) => row.get(header));
        data.push(rowData);
      });
      return data;
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to read data from Google Sheets: ${error}`);
    }
  }
  public async append(
    data: GoogleSheetsData,
    sheetTitle: string
  ): Promise<void> {
    try {
      await this.doc.loadInfo();
      const sheet = this.doc.sheetsByTitle[sheetTitle];
      await sheet.loadHeaderRow();
      await sheet.addRows(data);
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to append data to Google Sheets: ${error}`);
    }
  }
}

export default GoogleSheet;
