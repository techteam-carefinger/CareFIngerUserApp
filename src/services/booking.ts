import {CancelBookingData, CreateBookingData, CurrentBooking, BookingHistoryData} from '../types';
import {api} from './api';

export const PAID_RATE_PER_MINUTE = 1.49;

const firstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
};

const firstString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim().toLowerCase();
    }
  }
  return '';
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
};

/**
 * Reads free vs paid from create-booking / current-booking payloads.
 * Supports several backend field names so the UI can branch as soon as
 * the booking API responds.
 */
export const getBookingOffer = (
  booking: unknown,
): {isFree: boolean; ratePerMinute: number} => {
  const record = asRecord(booking);
  const rate = firstNumber(
    record.ratePerMinute,
    record.pricePerMinute,
    record.perMinuteCharge,
    record.perMinuteRate,
    record.chargePerMinute,
    record.rate,
  );
  const type = firstString(
    record.serviceType,
    record.fareType,
    record.chargeType,
    record.billingType,
    record.pricingType,
    record.offerType,
    record.bookingType,
    record.planType,
  );
  const remainingMinutes = firstNumber(record.remainingMinutes) ?? 0;

  if (
    record.isFree === true ||
    record.freeService === true ||
    record.free === true ||
    record.isPaid === false
  ) {
    return {isFree: true, ratePerMinute: 0};
  }

  if (record.isPaid === true || record.isFree === false || record.paid === true) {
    return {isFree: false, ratePerMinute: rate ?? PAID_RATE_PER_MINUTE};
  }

  if (type.includes('free')) {
    return {isFree: true, ratePerMinute: 0};
  }

  if (
    type.includes('paid') ||
    type.includes('minute') ||
    type.includes('per_min') ||
    type.includes('per-min')
  ) {
    return {isFree: false, ratePerMinute: rate ?? PAID_RATE_PER_MINUTE};
  }

  if (rate != null) {
    return {
      isFree: rate <= 0,
      ratePerMinute: rate > 0 ? rate : 0,
    };
  }

  if (remainingMinutes > 0) {
    return {isFree: true, ratePerMinute: 0};
  }

  return {isFree: false, ratePerMinute: PAID_RATE_PER_MINUTE};
};

const normalizeBookingHistory = (payload: unknown): BookingHistoryData => {
  if (!payload) {
    return {bookings: [], total: 0};
  }

  if (Array.isArray(payload)) {
    return {bookings: payload as BookingHistoryData['bookings'], total: payload.length};
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const bookings = Array.isArray(record.bookings)
      ? (record.bookings as BookingHistoryData['bookings'])
      : Array.isArray(record.data)
        ? (record.data as BookingHistoryData['bookings'])
        : [];
    const total =
      typeof record.total === 'number'
        ? record.total
        : typeof record.count === 'number'
          ? record.count
          : bookings.length;
    return {bookings, total};
  }

  return {bookings: [], total: 0};
};

export const bookingService = {
  async createBooking(input: {
    lat: number;
    lng: number;
    address?: string;
  }): Promise<CreateBookingData> {
    return api.post<CreateBookingData>('/create-booking', {
      auth: true,
      body: {
        lat: input.lat,
        lng: input.lng,
        address: input.address,
      },
    });
  },

  async getCurrentBooking(): Promise<CurrentBooking | null> {
    const data = await api.post<CurrentBooking | null>('/current-booking', {
      auth: true,
    });
    return data ?? null;
  },

  async cancelBooking(bookingId: string, reason = 'Cancelled by user'): Promise<CancelBookingData> {
    return api.post<CancelBookingData>('/cancel-booking', {
      auth: true,
      body: {
        bookingId,
        reason,
      },
    });
  },

  async getBookingHistory(): Promise<BookingHistoryData> {
    const data = await api.post<unknown>('/booking-history', {
      auth: true,
    });
    return normalizeBookingHistory(data);
  },
};
