import {ADMIN_API_BASE_URL} from '../config/env';
import {ApiResponse, LegalDocument} from '../types';
import {ApiError} from './api';

/**
 * Legal content (terms, privacy) lives under the shared `admin_link` API rather
 * than the patient API, so it uses its own tiny fetch instead of the `api`
 * client that is bound to `API_BASE_URL`.
 */
async function fetchLegal(path: string): Promise<LegalDocument> {
  let response: Response;
  try {
    response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
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

  let payload: ApiResponse<LegalDocument>;
  try {
    payload = (await response.json()) as ApiResponse<LegalDocument>;
  } catch {
    throw new ApiError('Unexpected server response.', response.status);
  }

  if (!response.ok || payload.success === false || !payload.data) {
    throw new ApiError(
      payload.message || payload.error || 'Could not load the document.',
      response.status,
    );
  }

  return payload.data;
}

export const legalService = {
  getUserTerms: () => fetchLegal('/get_user_terms'),
  getUserPrivacy: () => fetchLegal('/get_user_privacy'),
};
