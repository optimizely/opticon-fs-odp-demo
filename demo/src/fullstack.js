import { odpReady } from "./odp";
import { getLocalFlagsUserAttributes, getParam } from "./lib";

/**
 * Generates or retrieves an Optimizely Full Stack userId value
 * @returns {string} a locally-stored value for fs_user_id
 */
function getOptimizelyUserId() {
    const USER_ID_PARAM = "userid";
    const USER_ID_KEY = "fs_user_id";

    var userId = getParam(USER_ID_PARAM);

    // If the userId was not specified in an url param, try to retrieve from local storage
    if (userId === null) {
        userId = localStorage.getItem(USER_ID_KEY);
    }

    // If the userId wasn't specified in local storage either, generate one
    if (userId === null) {
        const rand = Math.floor(Math.random() * 10000);
        userId = `fs_user_id_${rand}`;
    }

    // Store the user ID in local storage
    localStorage.setItem(USER_ID_KEY, userId);

    return userId;
}

/**
 * Returns an Optimizely user context object
 */
async function getOptimizelyUserContext() {

    await odpReady();

    // generate a userId or retrieve it from local storage
    const userId = getOptimizelyUserId();

    // retrieve locally-stored user attributes
    const attrs = getLocalFlagsUserAttributes();

    // create a user context object
    const userCtx = window.optimizelyClient.createUserContext(userId, attrs);

    // Send ODP our fs_user_id identifier so that it can stitch identity
    window.odpClient.customer({
        fs_user_id: userId
    });

    // Fetch qualified segments from ODP
    await userCtx.fetchQualifiedSegments();

    return userCtx;
}

export { getOptimizelyUserId, getOptimizelyUserContext }