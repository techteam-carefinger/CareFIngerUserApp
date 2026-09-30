import {CancelBookingData, CreateBookingData, CurrentBooking, BookingHistoryData, BookingHistoryItem} from '../types';
import {ApiError, api} from './api';

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

const firstRawString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
};

const idFrom = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return firstRawString(record._id, record.id, record.bookingId);
  }
  return undefined;
};

/**
 * Free vs paid is decided by the booking API only after a caretaker accepts.
 * A pending booking can already include `serviceType`, `isFree: false`, and a
 * company rate while it is still being offered, so those are not an offer yet.
 * Returns null until the payload explicitly says free or paid.
 */
export const getBookingOffer = (
  booking: unknown,
): {isFree: boolean; ratePerMinute: number} | null => {
  const record = asRecord(booking);
  const rate = firstNumber(
    record.ratePerMinute,
    record.pricePerMinute,
    record.perMinuteCharge,
    record.perMinuteRate,
    record.chargePerMinute,
  );
  const type = firstString(record.serviceType, record.serviceLabel);

  if (
    record.isFree === true ||
    record.freeService === true ||
    record.free === true ||
    type === 'free' ||
    type.includes('free')
  ) {
    return {isFree: true, ratePerMinute: 0};
  }

  if (record.isPaid === true || record.paid === true || type === 'paid' || type.includes('paid')) {
    return {
      isFree: false,
      ratePerMinute: rate != null && rate > 0 ? rate : PAID_RATE_PER_MINUTE,
    };
  }

  return null;
};

const normalizeBooking = (payload: unknown): CurrentBooking | null => {
  if (!payload) {
    return null;
  }

  const record = asRecord(payload);
  const location = asRecord(record.location);
  const provider = asRecord(
    record.provider ??
      (record.providerId && typeof record.providerId === 'object'
        ? record.providerId
        : undefined),
  );
  const providerLocation = asRecord(provider.location);
  const providerCoordinates = Array.isArray(providerLocation.coordinates)
    ? providerLocation.coordinates
    : [];

  const bookingId = firstRawString(
    record.bookingId,
    idFrom(record._id),
    idFrom(record.id),
  );
  if (!bookingId) {
    return null;
  }

  const serviceType = firstRawString(
    record.serviceType,
    record.serviceLabel,
    provider.providerType,
  );
  const remainingMinutes = firstNumber(record.remainingMinutes);
  const ratePerMinute = firstNumber(
    record.ratePerMinute,
    record.pricePerMinute,
    record.perMinuteCharge,
  );

  return {
    bookingId,
    status: firstRawString(record.status) ?? 'pending',
    otp: firstNumber(record.otp),
    lat: firstNumber(record.lat, location.lat),
    lng: firstNumber(record.lng, location.lng),
    address: firstRawString(record.address, location.address),
    providerId: firstRawString(record.providerId, idFrom(provider._id), idFrom(provider.id)) ?? null,
    providerName: firstRawString(record.providerName, provider.name) ?? null,
    providerPhone: firstRawString(record.providerPhone, provider.phone) ?? null,
    providerImage: firstRawString(
      record.providerImage,
      provider.profileImage,
      provider.profilePicture,
    ) ?? null,
    providerRating: firstNumber(record.providerRating, provider.rating),
    vehicleNumber: firstRawString(record.vehicleNumber),
    vehicleModel: firstRawString(record.vehicleModel),
    providerLat: firstNumber(
      record.providerLat,
      providerCoordinates[1],
      providerLocation.lat,
    ),
    providerLng: firstNumber(
      record.providerLng,
      providerCoordinates[0],
      providerLocation.lng,
    ),
    etaMinutes: firstNumber(record.etaMinutes, record.eta),
    nearbyProviders: firstNumber(record.nearbyProviders),
    remainingMinutes,
    isFree: record.isFree === true || firstString(serviceType) === 'free',
    isPaid: record.isPaid === true || firstString(serviceType) === 'paid',
    freeService: record.freeService === true,
    serviceType,
    serviceLabel: firstRawString(record.serviceLabel),
    fareType: firstRawString(record.fareType),
    ratePerMinute,
    pricePerMinute: firstNumber(record.pricePerMinute),
    duration: firstNumber(record.duration),
    amount: firstNumber(record.amount, record.clientAmount),
    paymentMode: firstRawString(record.paymentMode),
    paymentStatus: firstRawString(record.paymentStatus),
    isOtpVerified: record.isOtpVerified === true,
    startTime: (() => {
      const raw = record.startTime ?? record.startedAt;
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return new Date(raw).toISOString();
      }
      return firstRawString(raw);
    })(),
    createdAt: firstRawString(record.createdAt),
  };
};

const normalizeCreateBooking = (payload: unknown): CreateBookingData => {
  const booking = normalizeBooking(payload);
  const record = asRecord(payload);

  if (!booking) {
    throw new ApiError(
      'The server created the request but did not return the booking details.',
      200,
    );
  }

  return {
    ...booking,
    otp: booking.otp ?? firstNumber(record.otp) ?? 0,
    nearbyProviders: booking.nearbyProviders ?? firstNumber(record.nearbyProviders) ?? 0,
    remainingMinutes: booking.remainingMinutes ?? firstNumber(record.remainingMinutes) ?? 0,
  };
};

const normalizeHistoryItem = (item: unknown): BookingHistoryItem => {
  const record = asRecord(item);
  const location = asRecord(record.location);
  const provider = asRecord(
    record.providerId && typeof record.providerId === 'object'
      ? record.providerId
      : undefined,
  );

  return {
    bookingId: firstRawString(record.bookingId, idFrom(record._id), idFrom(record.id)),
    _id: firstRawString(idFrom(record._id), record.bookingId),
    address: firstRawString(record.address, location.address),
    status: firstRawString(record.status),
    createdAt: firstRawString(record.createdAt, record.bookingDate, record.date),
    bookingDate: firstRawString(record.bookingDate, record.createdAt, record.date),
    date: firstRawString(record.date, record.createdAt),
    amount: firstNumber(
      record.amount,
      record.clientAmount,
      record.totalAmount,
      record.price,
    ),
    price: firstNumber(record.price, record.amount, record.clientAmount),
    totalAmount: firstNumber(record.totalAmount, record.clientAmount, record.amount),
    serviceType: firstRawString(record.serviceType),
    duration: firstNumber(record.duration),
    paymentStatus: firstRawString(record.paymentStatus),
    providerName: firstRawString(record.providerName, provider.name),
  };
};

const normalizeBookingHistory = (payload: unknown): BookingHistoryData => {
  if (!payload) {
    return {bookings: [], total: 0};
  }

  if (Array.isArray(payload)) {
    const bookings = payload.map(normalizeHistoryItem);
    return {bookings, total: bookings.length};
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const rawBookings = Array.isArray(record.bookings)
      ? record.bookings
      : Array.isArray(record.data)
        ? record.data
        : [];
    const bookings = rawBookings.map(normalizeHistoryItem);
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
    const data = await api.post<unknown>('/create-booking', {
      auth: true,
      body: {
        lat: input.lat,
        lng: input.lng,
        address: input.address,
      },
    });
    return normalizeCreateBooking(data);
  },

  async getCurrentBooking(): Promise<CurrentBooking | null> {
    const data = await api.post<unknown>('/current-booking', {
      auth: true,
    });
    return normalizeBooking(data);
  },

  async cancelBooking(bookingId: string, reason = 'Cancelled by user'): Promise<CancelBookingData> {
    const data = await api.post<unknown>('/cancel-booking', {
      auth: true,
      body: {
        bookingId,
        reason,
      },
    });
    const record = asRecord(data);
    return {
      bookingId: firstRawString(record.bookingId, idFrom(record._id)),
      status: firstRawString(record.status),
    };
  },

  async getBookingHistory(): Promise<BookingHistoryData> {
    const data = await api.post<unknown>('/booking-history', {
      auth: true,
    });
    return normalizeBookingHistory(data);
  },
};
