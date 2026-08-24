import {ADMIN_API_BASE_URL} from '../config/env';
import {ApiResponse, DiscountOffer} from '../types';
import {ApiError} from './api';

const isDiscountOffer = (value: unknown): value is DiscountOffer =>
  typeof value === 'object' &&
  value !== null &&
  ('_id' in value || 'code' in value || 'name' in value);

const normalizeOffers = (data: unknown): DiscountOffer[] => {
  if (Array.isArray(data)) {
    return data.filter(isDiscountOffer);
  }

  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    if (Array.isArray(payload.discounts)) {
      return payload.discounts.filter(isDiscountOffer);
    }
    if (Array.isArray(payload.offers)) {
      return payload.offers.filter(isDiscountOffer);
    }
    if (isDiscountOffer(data)) {
      return [data];
    }
  }

  return [];
};

/**
 * Offers live under the shared `admin_link` API rather than the patient API,
 * so this uses its own fetch instead of the `api` client bound to `API_BASE_URL`.
 */
export const offersService = {
  async getOffers(): Promise<DiscountOffer[]> {
    let response: Response;
    try {
      response = await fetch(`${ADMIN_API_BASE_URL}/discount_get`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({}),
      });
    } catch {
      throw new ApiError(
        'Network request failed. Check your connection and the API URL.',
        0,
      );
    }

    let payload: ApiResponse<unknown>;
    try {
      payload = (await response.json()) as ApiResponse<unknown>;
    } catch {
      throw new ApiError('Unexpected server response.', response.status);
    }

    if (!response.ok || payload.success === false) {
      throw new ApiError(
        payload.message || payload.error || 'Could not load offers.',
        response.status,
      );
    }

    return normalizeOffers(payload.data);
  },
};
