import { promises as fs } from "fs";
import path from "path";
import { google } from "googleapis";
import type { AvailabilitySlot, Meeting, SlotCandidate } from "./types";

type DataFile = {
  meetings: Meeting[];
  availability: AvailabilitySlot[];
};

const dataPath = path.join(process.cwd(), ".data", "happy-hour.json");

function getSpreadsheetId() {
  const value = process.env.GOOGLE_SHEETS_ID || "";
  const match = value.match(/\/spreadsheets\/d\/([^/]+)/);
  return match ? match[1] : value;
}

function hasSheetsConfig() {
  return Boolean(
    process.env.GOOGLE_SHEETS_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY,
  );
}

async function readLocalData(): Promise<DataFile> {
  try {
    const raw = await fs.readFile(dataPath, "utf8");
    return JSON.parse(raw) as DataFile;
  } catch {
    return { meetings: [], availability: [] };
  }
}

async function writeLocalData(data: DataFile) {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2), "utf8");
}

async function getSheetsClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function serializeMeeting(meeting: Meeting) {
  return [
    meeting.id,
    meeting.title,
    String(meeting.durationMinutes),
    JSON.stringify(meeting.participants),
    meeting.selectedSlot ? JSON.stringify(meeting.selectedSlot) : "",
    meeting.createdAt,
    String(meeting.month),
    String(meeting.year),
  ];
}

function parseMeeting(row: string[]): Meeting {
  return {
    id: row[0],
    title: row[1],
    durationMinutes: Number(row[2]),
    participants: JSON.parse(row[3] || "[]"),
    selectedSlot: row[4] ? (JSON.parse(row[4]) as SlotCandidate) : null,
    createdAt: row[5],
    month: Number(row[6]),
    year: Number(row[7]),
  };
}

function serializeAvailability(slot: AvailabilitySlot) {
  return [slot.meetingId, slot.participant, slot.date, slot.startTime, slot.endTime];
}

function parseAvailability(row: string[]): AvailabilitySlot {
  return {
    meetingId: row[0],
    participant: row[1] as AvailabilitySlot["participant"],
    date: row[2],
    startTime: row[3],
    endTime: row[4],
  };
}

async function readSheetsData(): Promise<DataFile> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const [meetingsResponse, availabilityResponse] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: "meetings!A2:H" }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: "availability!A2:E" }),
  ]);

  return {
    meetings: (meetingsResponse.data.values || []).map((row) => parseMeeting(row as string[])),
    availability: (availabilityResponse.data.values || []).map((row) =>
      parseAvailability(row as string[]),
    ),
  };
}

async function writeSheetsData(data: DataFile) {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.batchClear({
    spreadsheetId,
    requestBody: {
      ranges: ["meetings!A:H", "availability!A:E"],
    },
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: "meetings!A1:H",
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
            ...data.meetings.map(serializeMeeting),
          ],
        },
        {
          range: "availability!A1:E",
          values: [
            ["meetingId", "participant", "date", "startTime", "endTime"],
            ...data.availability.map(serializeAvailability),
          ],
        },
      ],
    },
  });
}

async function readData() {
  return hasSheetsConfig() ? readSheetsData() : readLocalData();
}

async function writeData(data: DataFile) {
  return hasSheetsConfig() ? writeSheetsData(data) : writeLocalData(data);
}

export async function createMeeting(meeting: Meeting) {
  const data = await readData();
  data.meetings.push(meeting);
  await writeData(data);
  return meeting;
}

export async function getMeeting(id: string) {
  const data = await readData();
  return data.meetings.find((meeting) => meeting.id === id) || null;
}

export async function getMeetingBundle(id: string) {
  const data = await readData();
  const meeting = data.meetings.find((item) => item.id === id) || null;
  const availability = data.availability.filter((slot) => slot.meetingId === id);

  return { meeting, availability };
}

export async function replaceAvailability(
  meetingId: string,
  participant: AvailabilitySlot["participant"],
  slots: AvailabilitySlot[],
) {
  const data = await readData();
  data.availability = data.availability.filter(
    (slot) => slot.meetingId !== meetingId || slot.participant !== participant,
  );
  data.availability.push(...slots);
  await writeData(data);
}

export async function selectFinalSlot(meetingId: string, selectedSlot: SlotCandidate | null) {
  const data = await readData();
  const meeting = data.meetings.find((item) => item.id === meetingId);

  if (!meeting) {
    return null;
  }

  meeting.selectedSlot = selectedSlot;
  await writeData(data);
  return meeting;
}
