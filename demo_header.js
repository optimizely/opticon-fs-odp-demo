const VERSION = "0.0.1";
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


const BANNER_SELECTOR = ".top-header__banner-text p";

docReady().then(() => {

    // Hack. The banner is displayed by default, so we hide it and then display it according to the flag settings
    waitForElm(BANNER_SELECTOR).then((banner) => {
        console.log("Hiding banner");
        banner.style.visibility = "hidden";
    });

    optimizelyClient.onReady

});
















// Returns a promise that resolves when the document is ready
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