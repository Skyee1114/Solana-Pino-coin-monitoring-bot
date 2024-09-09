// Importing required modules and types
import { google, sheets_v4 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import credentials from "./credentials.json";
import token from "./token.json";
import { SPREADSHEET_ID } from "../../config";
// Setting up Google OAuth2 client with credentials
const auth: OAuth2Client = new google.auth.OAuth2(
  credentials.installed.client_id,
  credentials.installed.client_secret,
  credentials.installed.redirect_uris[0]
);
auth.setCredentials(token);
// Function to write data to Google Spreadsheet
export async function appendToSpreadsheet(data: string[][]): Promise<void> {
  const sheets: sheets_v4.Sheets = google.sheets({ version: "v4", auth });
  // Configuring the request parameters
  const request: sheets_v4.Params$Resource$Spreadsheets$Values$Append = {
    spreadsheetId: SPREADSHEET_ID || "", // Ensure that SPREADSHEET_ID is defined in your environment
    range: "Sheet1!A:D", // Adjust the range according to your spreadsheet setup
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: data,
    },
  };
  try {
    await sheets.spreadsheets.values.append(request);
    console.log("Data appended to spreadsheet:", data);
  } catch (error) {
    console.error("Error appending data to spreadsheet:", error);
  }
}
