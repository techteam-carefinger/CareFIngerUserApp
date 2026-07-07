import {CreateBookingData} from '../types';
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
};
