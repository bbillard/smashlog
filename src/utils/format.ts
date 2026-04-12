export function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso));
}

export function formatShortDate(dateIso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateIso));
}

export function truncate(text: string, length: number) {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, Math.max(0, length - 1))}…`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatEditableDateTime(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseEditableDateTime(value: string) {
  const match = value.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/,
  );

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText, hourText = "00", minuteText = "00"] = match;
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date.toISOString();
}
