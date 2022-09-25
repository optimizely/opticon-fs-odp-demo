const VERSION = "0.0.2";
console.log(`demo_header.js loaded (v${VERSION})`);


/**
 *  Initialize the Flags SDK
 */

const OPTIMIZELY_SDK_KEY = "3DHbmsE3z3y3Fb1qmexbA";

const optimizelyClient = window.optimizelySdk.createInstance({
    sdkKey: OPTIMIZELY_SDK_KEY
});

optimizelyClient.onReady().then(() => {
    console.log("Optimizely client is ready");
    window.optimizelyClient = optimizelyClient;
    console.log(optimizelyClient);
});


/**
 * Instrument the header banner using a Flag
 */

const BANNER_SELECTOR = ".top-header__banner-text";
const BANNER_TEXT_SELECTOR = ".top-header__banner-text p";

function renderBanner(enabled, {
    banner_text = "Welcome to Mosey!",
    discount_pct = 0,
    banner_background_color = "black",
    banner_text_color = "white",
}) {
    waitForElm(BANNER_SELECTOR).then((banner) => {
        const text = document.querySelector(BANNER_TEXT_SELECTOR);

        if (enabled) {
            console.log("Rendering banner");
            text.innerHTML = banner_text.replace("$discount_pct", discount_pct);
            text.style.color = banner_text_color;
            banner.style.backgroundColor = banner_background_color;
            banner.style.visibility = "visible";
        } else {
            console.log("Hiding banner");
            banner.style.visibility = "hidden";
        }

    });
}


docReady().then(() => {

    // Hack. The banner is displayed by default, so we hide it and then display it according to the flag settings
    renderBanner(false, {});

    optimizelyClient.onReady().then(() => {
        const userCtx = window.optimizelyClient.createUserContext("user123");

        const decision = userCtx.decide("mosey_banner");

        console.log(decision.variables);

        renderBanner(decision.enabled, decision.variables);
    });
});

















/**
 * Library functions
 */




// Returns a promise that resolves when the document is ready
/**
 * docReady
 * @returns a Promise that resolves when document.body is ready
 */
function docReady() {
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            if (document.body) {
                resolve();
                clearInt();
            }
        }, 10);

        const clearInt = () => {
            clearInterval(interval);
        }
    });
}



// Use mutationovbservers to wait for a dom element to be loaded
// https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
function waitForElm(selector) {
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
 * getParam
 * @param {string} param 
 * @returns the value of the specified param (string or null)
 */
function getParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param) || null;
}