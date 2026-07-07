import {CreateBookingData, CurrentBooking} from '../types';
import {api} from './api';

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

  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    await api.post<unknown>('/cancel-booking', {
      auth: true,
      body: {
        bookingId,
        reason,
      },
    });
  },
};
