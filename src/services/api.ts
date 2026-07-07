import {API_BASE_URL} from '../config/env';
import {ApiResponse} from '../types';
import {storage} from './storage';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  /** When true, attaches the stored JWT as `Authorization: Bearer <token>`. */
  auth?: boolean;
  body?: Record<string, unknown>;
}

/**
 * Thin wrapper around fetch that targets the CareFinger patient API.
 * All backend routes used by the app are POST and return
 * `{ success, message?, data?, error? }`.
 */
async function request<T>(
  path: string,
  {auth = false, body}: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = await storage.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new ApiError(
      'Network request failed. Check your connection and the API URL.',
      0,
    );
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('Unexpected server response.', response.status);
  }

  if (!response.ok || payload.success === false) {
    throw new ApiError(
      payload.message || payload.error || 'Something went wrong.',
      response.status,
    );
  }

  return payload.data as T;
}

export const api = {
  post: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, options),
};
