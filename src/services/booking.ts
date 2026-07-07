import {CancelBookingData, CreateBookingData, CurrentBooking, BookingHistoryData} from '../types';
import {api} from './api';

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
