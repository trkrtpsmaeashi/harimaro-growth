const JAPAN_TIME_ZONE = 'Asia/Tokyo';

function pad(value) {
  return String(value).padStart(2, '0');
}

export function formatDate(dateText) {
  if (!dateText) return '-';

  const [year, month, day] = dateText.split('-').map(Number);
  return `${year}/${pad(month)}/${pad(day)}`;
}

export function getJapanDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAPAN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: weekdayMap[values.weekday],
  };
}

export function today() {
  const { year, month, day } = getJapanDateParts();
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function currentMonth() {
  return today().slice(0, 7);
}

export function todayMonthDay() {
  return today().slice(5, 10);
}

export function japanWeekday() {
  return getJapanDateParts().weekday;
}

export function isJapanMonthEnd() {
  const { year, month, day } = getJapanDateParts();
  return day === new Date(year, month, 0).getDate();
}

export function dateKeyFromDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(dateText) {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function addDays(dateText, amount) {
  const date = parseDateKey(dateText);
  date.setDate(date.getDate() + amount);
  return dateKeyFromDate(date);
}

export function shiftDateByDaysFromToday(amount) {
  return addDays(today(), amount);
}

export function formatDateWithWeekday(dateText) {
  if (!dateText) return '-';

  const date = parseDateKey(dateText);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${formatDate(dateText)}（${weekday}）`;
}
