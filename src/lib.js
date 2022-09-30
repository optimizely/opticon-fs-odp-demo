/**
 * Library functions
 */

// Prefix used for storing user attributes in local storage
const ATTR_PREFIX = "_ATTR__";


/**
 * Set one or more local flag user attributes
 * @param {*} attrs 
 */
function setLocalFlagsUserAttributes(attrs) {

    Object.entries(attrs).forEach(([key, val]) => {
        if (val === null || val === undefined) {
            localStorage.removeItem(ATTR_PREFIX + key);
        } else {
            localStorage.setItem(ATTR_PREFIX + key, JSON.stringify(val));
        }
    });

    console.log("Set local flags attrs");
    console.log(attrs);
}


/**
 * Retrieve local flag user attributes
 */
function getLocalFlagsUserAttributes() {
    const attrs = {};

    Object.entries(localStorage).forEach(([key, val]) => {
        if (key.startsWith(ATTR_PREFIX)) {
            attrs[key.replace(ATTR_PREFIX, "")] = JSON.parse(val);
        }
    });

    console.log("Got local flags attrs");
    console.log(attrs);

    return attrs;
}


// Use mutationovbservers to wait for a dom element to be loaded
// https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
function elementReady(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}


/**
 * documentReady
 * @returns a Promise that resolves when document.body is ready
 */
function documentReady() {
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            if (document.body) {
                resolve();
                clearInt();
            }
        }, 5);

        const clearInt = () => {
            clearInterval(interval);
        }
    });
}


/**
 * getParam
 * @param {string} param 
 * @returns the value of the specified param (string or null)
 */
function getParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param) || null;
}

export { setLocalFlagsUserAttributes, getLocalFlagsUserAttributes, elementReady, documentReady, getParam }