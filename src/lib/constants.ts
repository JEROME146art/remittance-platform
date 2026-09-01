import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
  Bell,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type {
  TransactionStatus,
  TransactionStage,
  PaymentMethod,
  NotificationType,
  Purpose,
} from './types';

export const CURRENCIES: Record<string, { name: string; symbol: string; flag: string }> = {
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  MXN: { name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  INR: { name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  PKR: { name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
  BRL: { name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  EGP: { name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬' },
  JPY: { name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  NGN: { name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  PHP: { name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES);

export const COUNTRIES: Record<string, { currency: string; name: string }> = {
  Mexico: { currency: 'MXN', name: 'Mexico' },
  Ireland: { currency: 'EUR', name: 'Ireland' },
  Pakistan: { currency: 'PKR', name: 'Pakistan' },
  Singapore: { currency: 'SGD', name: 'Singapore' },
  Egypt: { currency: 'EGP', name: 'Egypt' },
  Brazil: { currency: 'BRL', name: 'Brazil' },
  India: { currency: 'INR', name: 'India' },
  'United Kingdom': { currency: 'GBP', name: 'United Kingdom' },
  Japan: { currency: 'JPY', name: 'Japan' },
  Canada: { currency: 'CAD', name: 'Canada' },
  Australia: { currency: 'AUD', name: 'Australia' },
  Nigeria: { currency: 'NGN', name: 'Nigeria' },
  Kenya: { currency: 'KES', name: 'Kenya' },
  Philippines: { currency: 'PHP', name: 'Philippines' },
  Germany: { currency: 'EUR', name: 'Germany' },
  France: { currency: 'EUR', name: 'France' },
};

export const COUNTRY_NAMES = Object.keys(COUNTRIES);

export const PAYMENT_METHODS: Record<PaymentMethod, { label: string }> = {
  bank: { label: 'Bank Account' },
  wallet: { label: 'Mobile Wallet' },
  cash_pickup: { label: 'Cash Pickup' },
  card: { label: 'Debit Card' },
};

export const PURPOSES: Record<Purpose, { label: string }> = {
  family_support: { label: 'Family Support' },
  business: { label: 'Business Payment' },
  education: { label: 'Education' },
  savings: { label: 'Savings' },
  medical: { label: 'Medical' },
  other: { label: 'Other' },
};

interface StatusConfig {
  label: string;
  color: string;
  dot: string;
  icon: typeof CheckCircle2;
}

export const STATUS_CONFIG: Record<TransactionStatus, StatusConfig> = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500', icon: ArrowDownLeft },
  in_progress: { label: 'In Progress', color: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500', icon: RefreshCw },
  completed: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 ring-gray-500/20', dot: 'bg-gray-400', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500', icon: RefreshCw },
};

interface StageConfig {
  label: string;
  step: number;
}

export const STAGE_CONFIG: Record<TransactionStage, StageConfig> = {
  initiated: { label: 'Initiated', step: 0 },
  verified: { label: 'Verified', step: 1 },
  processing: { label: 'Processing', step: 2 },
  settled: { label: 'Settled', step: 3 },
  available: { label: 'Available', step: 4 },
  returned: { label: 'Returned', step: -1 },
};

export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { icon: typeof Bell; color: string }
> = {
  payment_sent: { icon: ArrowUpRight, color: 'text-emerald-600 bg-emerald-50' },
  payment_received: { icon: ArrowDownLeft, color: 'text-sky-600 bg-sky-50' },
  status_update: { icon: Bell, color: 'text-slate-600 bg-slate-100' },
  rate_alert: { icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
  failed: { icon: AlertTriangle, color: 'text-rose-600 bg-rose-50' },
  refunded: { icon: RefreshCw, color: 'text-violet-600 bg-violet-50' },
};

export const AVATAR_COLORS: Record<string, string> = {
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
};
