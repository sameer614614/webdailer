export const TELNYX_DEFAULT_DOMAIN = "sip.telnyx.com";
export const TELNYX_DEFAULT_PORT = 443;
export const TELNYX_DEFAULT_COUNTRY_CODE = "1";

export const getTelnyxWebsocketUrl = (domain: string = TELNYX_DEFAULT_DOMAIN) =>
  `wss://${domain}:${TELNYX_DEFAULT_PORT}`;
