import type { NonWorkingDay } from '../types';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
  status?: string;
}

interface GoogleCalendarEventsResponse {
  items?: GoogleCalendarEvent[];
}

export const DEFAULT_HOLIDAY_CALENDAR = 'en.mexican#holiday@group.v.calendar.google.com';

export function parseHolidayEvents(events: GoogleCalendarEvent[]): NonWorkingDay[] {
  return events
    .filter(e => e.status !== 'cancelled' && (e.start.date ?? e.start.dateTime))
    .map(e => ({
      date: e.start.date ?? e.start.dateTime!.slice(0, 10),
      reason: e.summary,
    }));
}

export async function fetchHolidays(
  year: number,
  calendarId: string,
  apiKey: string
): Promise<NonWorkingDay[]> {
  const encodedId = encodeURIComponent(calendarId);
  const params = new URLSearchParams({
    key: apiKey,
    timeMin: `${year}-01-01T00:00:00Z`,
    timeMax: `${year}-12-31T23:59:59Z`,
    singleEvents: 'true',
    maxResults: '100',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?${params}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar API ${res.status}: ${text}`);
  }

  const data: GoogleCalendarEventsResponse = await res.json();
  return parseHolidayEvents(data.items ?? []);
}
