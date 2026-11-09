import { invariant } from '../types.js';
/** Broker process event loop. Transport alone owns authenticated OS connection objects. */
export async function serveBroker(broker, transport, signal) {
    const inFlight = new Set();
    try {
        await broker.recover();
        while (!signal.aborted) {
            if (inFlight.size >= 16)
                await Promise.race(inFlight);
            const delivery = await transport.receive(signal);
            if (!delivery)
                break;
            invariant(delivery.body.byteLength <= 65536, 'M14_SERVICE_FRAME_LIMIT');
            const work = (async () => {
                let finished = false;
                // Closing a connection revokes it immediately. Dispatch's final peer fence observes the revocation.
                void delivery.disconnected.then(() => { if (!finished)
                    void broker.disconnect(delivery.channel).catch(() => { }); });
                try {
                    const result = await broker.dispatch(delivery.channel, delivery.body);
                    await delivery.respond(result);
                }
                catch (error) {
                    try {
                        await delivery.respond({ status: 'BLOCKED', reason: error.code ?? 'BROKER_UNCERTAIN', automatic_retry: false });
                    }
                    catch { }
                }
                finally {
                    finished = true;
                }
            })();
            inFlight.add(work);
            void work.then(() => inFlight.delete(work), () => inFlight.delete(work));
        }
    }
    finally {
        transport.close();
        broker.close();
        await Promise.allSettled(inFlight);
    }
}
