export const DAILY_METHODS = Object.freeze(['snapshot', 'daily.prepare', 'daily.execute', 'request.cancel', 'stream.ack']);
export const DAILY_QUALIFICATION = Object.freeze({
    status: 'BLOCKED',
    reason: 'DAILY_NATIVE_RUNTIME_AUTHENTICATION_NOT_IMPLEMENTED',
    medium_listener_created: false,
    uac_required: false,
    synthetic_protocol_available: true,
});
