import { CURRENCIES } from './constants';

export interface TrackingNode {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  estLatencySec: number;
}

export const TRACKING_NODES: TrackingNode[] = [
  { id: 'sender_bank', label: 'Sender Bank', sublabel: 'Domestic debit confirmed', icon: 'bank', estLatencySec: 3 },
  { id: 'ach_network', label: 'ACH Network', sublabel: 'US clearing house', icon: 'ach', estLatencySec: 8 },
  { id: 'fx_pool', label: 'FX Liquidity Pool', sublabel: 'Interbank rate locked', icon: 'fx', estLatencySec: 2 },
  { id: 'swift_routing', label: 'SWIFT Interbank Routing', sublabel: 'Cross-border settlement', icon: 'swift', estLatencySec: 15 },
  { id: 'local_rail', label: 'Recipient Local Rail', sublabel: 'IMPS / UPI / SEPA', icon: 'rail', estLatencySec: 6 },
  { id: 'recipient_account', label: 'Recipient Account', sublabel: 'Funds delivered', icon: 'account', estLatencySec: 1 },
];

export const STAGE_TO_NODE_INDEX: Record<string, number> = {
  initiated: 0,
  verified: 1,
  processing: 2,
  settled: 3,
  available: 5,
};

interface CorridorConfig {
  health: 'healthy' | 'degraded' | 'delayed';
  estSeconds: number;
  rail: string;
  note: string;
}

const CORRIDOR_HEALTH: Record<string, CorridorConfig> = {
  'USD→MXN': { health: 'healthy', estSeconds: 35, rail: 'SPEI', note: 'Operating normally' },
  'USD→INR': { health: 'healthy', estSeconds: 45, rail: 'UPI / IMPS', note: 'Operating normally' },
  'USD→PKR': { health: 'degraded', estSeconds: 120, rail: 'IBFT', note: 'Slight delay — clearing house congestion' },
  'USD→NGN': { health: 'delayed', estSeconds: 14400, rail: 'NIBSS', note: 'Delayed +4h — Central Bank liquidity check' },
  'USD→PHP': { health: 'healthy', estSeconds: 50, rail: 'InstaPay', note: 'Operating normally' },
  'USD→KES': { health: 'healthy', estSeconds: 40, rail: 'M-Pesa', note: 'Operating normally' },
  'USD→BRL': { health: 'healthy', estSeconds: 38, rail: 'PIX', note: 'Operating normally' },
  'USD→EUR': { health: 'healthy', estSeconds: 30, rail: 'SEPA Instant', note: 'Operating normally' },
  'USD→GBP': { health: 'healthy', estSeconds: 28, rail: 'Faster Payments', note: 'Operating normally' },
  'USD→JPY': { health: 'healthy', estSeconds: 33, rail: 'Zengin', note: 'Operating normally' },
  'USD→CAD': { health: 'healthy', estSeconds: 25, rail: 'Interac', note: 'Operating normally' },
  'USD→AUD': { health: 'healthy', estSeconds: 32, rail: 'NPP', note: 'Operating normally' },
  'USD→SGD': { health: 'healthy', estSeconds: 30, rail: 'FAST', note: 'Operating normally' },
  'USD→EGP': { health: 'degraded', estSeconds: 180, rail: 'EIP', note: 'Slight delay — compliance review queue' },
};

export const CORRIDOR_DEFAULT: CorridorConfig = {
  health: 'healthy',
  estSeconds: 45,
  rail: 'Local Rail',
  note: 'Operating normally',
};

export function getCorridorHealth(from: string, to: string): CorridorConfig {
  return CORRIDOR_HEALTH[`${from}→${to}`] ?? CORRIDOR_DEFAULT;
}

export const CORRIDOR_HEALTH_CONFIG = {
  healthy: { label: 'Healthy', color: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', percent: 99.8 },
  degraded: { label: 'Degraded', color: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500', percent: 92.5 },
  delayed: { label: 'Delayed', color: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500', percent: 78.0 },
};

interface CountryTimeZone {
  tz: string;
  bankingHours: { start: number; end: number };
  holidays: { month: number; day: number; name: string }[];
}

const COUNTRY_TZ: Record<string, CountryTimeZone> = {
  Mexico: { tz: 'America/Mexico_City', bankingHours: { start: 8, end: 17 }, holidays: [{ month: 9, day: 16, name: 'Independence Day' }] },
  India: { tz: 'Asia/Kolkata', bankingHours: { start: 9, end: 18 }, holidays: [{ month: 8, day: 15, name: 'Independence Day' }, { month: 10, day: 2, name: 'Gandhi Jayanti' }] },
  Pakistan: { tz: 'Asia/Karachi', bankingHours: { start: 9, end: 17 }, holidays: [{ month: 8, day: 14, name: 'Independence Day' }] },
  Nigeria: { tz: 'Africa/Lagos', bankingHours: { start: 8, end: 16 }, holidays: [{ month: 10, day: 1, name: 'Independence Day' }] },
  Philippines: { tz: 'Asia/Manila', bankingHours: { start: 9, end: 17 }, holidays: [{ month: 6, day: 12, name: 'Independence Day' }] },
  Kenya: { tz: 'Africa/Nairobi', bankingHours: { start: 8, end: 17 }, holidays: [{ month: 12, day: 12, name: 'Jamhuri Day' }] },
  Brazil: { tz: 'America/Sao_Paulo', bankingHours: { start: 9, end: 17 }, holidays: [{ month: 9, day: 7, name: 'Independence Day' }] },
  'United Kingdom': { tz: 'Europe/London', bankingHours: { start: 9, end: 17 }, holidays: [{ month: 12, day: 26, name: 'Boxing Day' }] },
  Japan: { tz: 'Asia/Tokyo', bankingHours: { start: 9, end: 17 }, holidays: [{ month: 1, day: 1, name: 'New Year' }] },
  Canada: { tz: 'America/Toronto', bankingHours: { start: 9, end: 17 }, holidays: [{ month: 7, day: 1, name: 'Canada Day' }] },
  Australia: { tz: 'Australia/Sydney', bankingHours: { start: 9, end: 17 }, holidays: [{ month: 1, day: 26, name: 'Australia Day' }] },
  Singapore: { tz: 'Asia/Singapore', bankingHours: { start: 9, end: 17 }, holidays: [{ month: 8, day: 9, name: 'National Day' }] },
  Egypt: { tz: 'Africa/Cairo', bankingHours: { start: 8, end: 16 }, holidays: [{ month: 7, day: 23, name: 'Revolution Day' }] },
  Germany: { tz: 'Europe/Berlin', bankingHours: { start: 9, end: 17 }, holidays: [{ month: 10, day: 3, name: 'Day of Unity' }] },
  France: { tz: 'Europe/Paris', bankingHours: { start: 9, end: 17 }, holidays: [{ month: 7, day: 14, name: 'Bastille Day' }] },
};

export function getCountryTimeInfo(country: string): CountryTimeZone | null {
  return COUNTRY_TZ[country] ?? null;
}

export function isBankingHours(country: string): boolean {
  const info = COUNTRY_TZ[country];
  if (!info) return true;
  const now = new Date();
  const localHour = parseInt(
    now.toLocaleString('en-US', { timeZone: info.tz, hour: 'numeric', hour12: false }),
    10
  );
  return localHour >= info.bankingHours.start && localHour < info.bankingHours.end;
}

export function isBankHoliday(country: string): { isHoliday: boolean; name?: string } {
  const info = COUNTRY_TZ[country];
  if (!info) return { isHoliday: false };
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const holiday = info.holidays.find((h) => h.month === month && h.day === day);
  return { isHoliday: !!holiday, name: holiday?.name };
}

export function getDelayFactors(country: string): string[] {
  const factors: string[] = [];
  if (!isBankingHours(country)) factors.push('Outside recipient banking hours');
  const holiday = isBankHoliday(country);
  if (holiday.isHoliday) factors.push(`Bank holiday: ${holiday.name}`);
  return factors;
}

export function getDelayMitigation(from: string, to: string, country: string): string | null {
  const corridor = getCorridorHealth(from, to);
  if (corridor.health === 'healthy') return null;

  const rail = CORRIDOR_HEALTH[`${from}→${to}`]?.rail ?? 'local rail';
  if (corridor.health === 'delayed') {
    return `Re-routing to Express Instant Rail via ${rail} to bypass clearing delay. Estimated recovery: ${Math.round(corridor.estSeconds / 4)}s.`;
  }
  if (corridor.health === 'degraded') {
    return `Prioritizing through ${rail} express lane to reduce congestion delay.`;
  }
  return null;
}

export interface RateLockState {
  token: string;
  rate: number;
  expiresAt: number;
  fromCurrency: string;
  toCurrency: string;
}

const RATE_LOCK_KEY = 'remitlet_rate_lock';

export function createRateLock(from: string, to: string, rate: number): RateLockState {
  const lock: RateLockState = {
    token: `rlk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    rate,
    expiresAt: Date.now() + 60_000,
    fromCurrency: from,
    toCurrency: to,
  };
  sessionStorage.setItem(RATE_LOCK_KEY, JSON.stringify(lock));
  return lock;
}

export function getRateLock(): RateLockState | null {
  const raw = sessionStorage.getItem(RATE_LOCK_KEY);
  if (!raw) return null;
  try {
    const lock = JSON.parse(raw) as RateLockState;
    if (Date.now() > lock.expiresAt) {
      sessionStorage.removeItem(RATE_LOCK_KEY);
      return null;
    }
    return lock;
  } catch {
    return null;
  }
}

export function clearRateLock(): void {
  sessionStorage.removeItem(RATE_LOCK_KEY);
}

export function rateLockRemainingMs(): number {
  const lock = getRateLock();
  if (!lock) return 0;
  return Math.max(0, lock.expiresAt - Date.now());
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const sec = totalSec % 60;
  return `${String(sec).padStart(2, '0')}s`;
}

const TYPICAL_BANK_FX_MARKUP = 0.035;

export function computeFXSavings(sendAmount: number, feeAmount: number): number {
  const bankFee = sendAmount * TYPICAL_BANK_FX_MARKUP;
  return Math.max(0, bankFee - feeAmount);
}

export function computeCumulativeSavings(transactions: { send_amount: number; fee_amount: number; status: string }[]): number {
  return transactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + computeFXSavings(t.send_amount, t.fee_amount), 0);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

export function getMidMarketRate(from: string, to: string): number {
  const BASE_RATES: Record<string, number> = {
    USD: 1, EUR: 0.92, GBP: 0.79, MXN: 17.42, INR: 83.5, PKR: 278.5,
    BRL: 5.08, SGD: 1.34, EGP: 48.7, JPY: 157.2, CAD: 1.37, AUD: 1.52,
    NGN: 1580, KES: 129, PHP: 58.3,
  };
  const fromRate = BASE_RATES[from] ?? 1;
  const toRate = BASE_RATES[to] ?? 1;
  return toRate / fromRate;
}

export function getInterbankCost(sendAmount: number): number {
  return sendAmount * 0.001;
}

export { CURRENCIES };
