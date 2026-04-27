import { readFileSync } from "fs";
import { google } from "googleapis";

function loadEnvFile(fileName) {
  try {
    const content = readFileSync(fileName, "utf8");
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex);
      const valueLines = [trimmed.slice(separatorIndex + 1)];

      while (
        valueLines[0].startsWith('"') &&
        !valueLines.join("\n").endsWith('"') &&
        index < lines.length - 1
      ) {
        index += 1;
        valueLines.push(lines[index]);
      }

      const value = valueLines.join("\n").replace(/^"|"$/g, "");
      process.env[key] ||= value;
    }
  } catch {
    // Local setup can also use already exported environment variables.
  }
}

function getSpreadsheetId(value) {
  const match = value.match(/\/spreadsheets\/d\/([^/]+)/);
  return match ? match[1] : value;
}

loadEnvFile(".env.local");

const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  ? getSpreadsheetId(process.env.GOOGLE_SHEETS_ID)
  : "";
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!spreadsheetId || !email || !privateKey) {
  console.error(
    "Missing GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY.",
  );
  process.exit(1);
}

if (
  privateKey.includes("...") ||
  !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
  !privateKey.includes("-----END PRIVATE KEY-----")
) {
  console.error(
    "GOOGLE_PRIVATE_KEY must contain the full private_key from the service account JSON.",
  );
  process.exit(1);
}

const auth = new google.auth.JWT({
  email,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

try {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: "meetings!A1:H1",
          values: [
            [
              "id",
              "title",
              "durationMinutes",
              "participants",
              "selectedSlot",
              "createdAt",
              "month",
              "year",
            ],
          ],
        },
        {
          range: "availability!A1:E1",
          values: [["meetingId", "participant", "date", "startTime", "endTime"]],
        },
      ],
    },
  });

  console.log("Google Sheets is ready.");
} catch (error) {
  const message = error?.response?.data?.error?.message || error?.message || String(error);
  console.error(`Google Sheets setup failed: ${message}`);
  process.exit(1);
}
