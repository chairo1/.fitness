import dayjs from 'dayjs';
import type { DayStatus, MuscleGroup } from '@/api/types';
import type { ColorKey } from '@/theme';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Sinə',
  back: 'Kürək',
  legs: 'Ayaqlar',
  shoulders: 'Çiyinlər',
  arms: 'Qollar',
  core: 'Qarın (core)',
  cardio: 'Kardio',
  full_body: 'Bütün bədən',
};

export const MUSCLE_GROUPS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
// dayjs().day(): 0 = Sunday
const WEEKDAYS = ['Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə'];
const WEEKDAYS_SHORT = ['B', 'B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş'];

export const today = () => dayjs().format('YYYY-MM-DD');

export const fmtDate = (d: string) => {
  const x = dayjs(d);
  return `${x.date()} ${MONTHS[x.month()].slice(0, 3)} ${x.year()}`;
};
export const fmtDateShort = (d: string) => {
  const x = dayjs(d);
  return `${x.date()} ${MONTHS[x.month()].slice(0, 3)}`;
};
export const fmtMonth = (d: string | dayjs.Dayjs) => {
  const x = dayjs(d);
  return `${MONTHS[x.month()]} ${x.year()}`;
};
export const weekday = (d: string) => WEEKDAYS[dayjs(d).day()];
export const weekdayShort = (d: string) => WEEKDAYS_SHORT[dayjs(d).day()];

/** Azerbaijani ordinal: 1-ci, 3-cü, 6-cı, 9-cu, 10-cu ... */
// Suffix follows the vowel harmony of the last spoken word (bir, iki, üç ... on, iyirmi, otuz ...).
const UNIT_SUFFIX = ['', 'ci', 'ci', 'cü', 'cü', 'ci', 'cı', 'ci', 'ci', 'cu'];
const TEN_SUFFIX = ['cü', 'cu', 'ci', 'cu', 'cı', 'ci', 'cı', 'ci', 'ci', 'cı'];
export const ordinal = (n: number) => `${n}-${n % 10 ? UNIT_SUFFIX[n % 10] : TEN_SUFFIX[Math.floor(n / 10) % 10]}`;

/** az-AZ style (1 234,5) without relying on the engine's Intl locale data. */
export const fmtNum = (n: number, digits = 0) => {
  const f = 10 ** digits;
  const r = Math.round(n * f) / f;
  let s = Math.abs(r).toFixed(digits);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  const [int, dec] = s.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${r < 0 ? '-' : ''}${grouped}${dec ? `,${dec}` : ''}`;
};

export const fmtVolume = (kg: number) => (kg >= 10000 ? `${fmtNum(kg / 1000, 1)} t` : `${fmtNum(kg)} kg`);

export const STATUS_META: Record<DayStatus, { label: string; color: ColorKey | null }> = {
  done: { label: 'Tamamlandı', color: 'success' },
  missed: { label: 'Buraxıldı', color: 'error' },
  today: { label: 'Bu gün', color: 'primary' },
  upcoming: { label: 'Gələcək', color: null },
};

/** Parses user input that may use a decimal comma; '' → null. */
export const parseNum = (v: string): number | null => {
  const s = v.trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Keeps only digits and one decimal separator while typing. */
export const cleanDecimal = (v: string) => {
  const s = v.replace(',', '.').replace(/[^\d.]/g, '');
  const i = s.indexOf('.');
  return i === -1 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '');
};
export const cleanInt = (v: string) => v.replace(/\D/g, '');
