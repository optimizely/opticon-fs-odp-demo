import { enums } from "@optimizely/optimizely-sdk"

// ODP event type for flag events
export const ODP_EVENT_TYPE = "optimizely_full_stack";

/**
 * Transforms a `DecisionListenerPayload` into a `DecisionOdpPayload`
 * @param {optimizely.DecisionListenerPayload} d - A `DecisionListenerPayload`
 * @returns A corresponding `DecisionOdpPayload` object
 */
function createDecisionOdpPayload(d) {
    return {
        action: "decision",
        fs_user_id: d.userId,
        fs_attributes: serialize(d.attributes),
        fs_flag_key: d.decisionInfo.flagKey,
        fs_flag_enabled: d.decisionInfo.enabled,
        fs_variation_key: d.decisionInfo.variationKey || "",
        fs_rule_key: d.decisionInfo.ruleKey || "",
        fs_variables: serialize(d.decisionInfo.variables),
        fs_decision_reasons: serialize(d.decisionInfo.reasons),
    }
}

/**
 * Transforms a `TrackEventListenerPayload` into a `TrackEventOdpPayload`
 * @param {optimizely.TrackListenerPayload} e - A `TrackEventListenerPayload`
 * @returns A corresponding `DecisionOdpPayload` object
 */
function createTrackOdpPayload(e) {
    return {
        action: "track_event",
        fs_user_id: e.userId,
        fs_attributes: serialize(e.attributes),
        fs_event_key: e.eventKey
    }
}

/**
 * Add ODP notification listeners to a Full Stack SDK client
 * @param {optimizely.Client} fsClient - An Optimizely Full Stack SDK client
 * @param {ZaiusClient} odpClient - An Optimizely Data Platform SDK client
 */
export function addNotficationListeners(fsClient, odpClient) {
    console.log("Adding fs2odp notification listeners");
    // Send an ODP event whenever a flag decision is made
    fsClient.notificationCenter.addNotificationListener(
        enums.NOTIFICATION_TYPES.DECISION,
        (d) => {
            const payload = createDecisionOdpPayload(d);
            console.log("Sending ODP decision event");
            console.log(payload);
            odpClient.event(ODP_EVENT_TYPE, payload)
        }
    );

    // Send an ODP event whenever a Full Stack event is tracked
    fsClient.notificationCenter.addNotificationListener(
        enums.NOTIFICATION_TYPES.TRACK,
        (e) => {
            const payload = createTrackOdpPayload(e);
            console.log("Sending ODP track event");
            console.log(payload);
            odpClient.event(ODP_EVENT_TYPE, createTrackOdpPayload(e))
        }
    );
}

/**
 * Uses zaius.customer to sent Optimizely user context to ODP
 * @param {OptimizelyUserContext} userContext 
 * @param {ZaiusClient} odpClient 
 */
export function sendOdpUserContext(userContext, odpClient) {
    odpClient.customer(
        { fs_user_id: userContext.getUserId() },
        userContext.getAttributes()
    )
}

/**
 * ODP escapes quote characters, so we remove them from serialized objects
 * @param {any} obj 
 */
function serialize(obj) {
    let json = JSON.stringify(obj);
    return json.replaceAll("\"", "");
}