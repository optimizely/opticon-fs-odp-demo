import { odpReady } from "./odp";
import { getLocalFlagsUserAttributes } from "./lib";
/**
 * Generates or retrieves an Optimizely Full Stack userId value
 * @returns {string} a locally-stored value for fs_user_id
 */
function getOptimizelyUserId() {
    const USER_ID_KEY = "fs_user_id";
    var fromStorage = localStorage.getItem(USER_ID_KEY);
    // If a userId isn't found in local storage, generate one
    if (fromStorage === null || fromStorage === undefined) {
        const rand = Math.floor(Math.random() * 10000);
        const newUserId = `fs_user_id_${rand}`;
        localStorage.setItem(USER_ID_KEY, newUserId);
        fromStorage = newUserId;
    }
    return fromStorage;
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
export { getOptimizelyUserId, getOptimizelyUserContext };
