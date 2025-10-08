import { TELNYX_DEFAULT_DOMAIN } from "../constants/telnyx";

/**
 * Normalise a SIP domain string so downstream consumers do not need to worry
 * about casing or accidental whitespace. Defaults to Telnyx when the value is
 * blank which mirrors how the onboarding form behaves.
 */
export const normalizeSipDomain = (
  domain?: string,
  fallback: string = TELNYX_DEFAULT_DOMAIN,
): string => domain?.trim().toLowerCase() || fallback;
