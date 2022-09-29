const VERSION = "0.0.11";
console.log(`demo_header.js loaded (v${VERSION})`);

const OPTIMIZELY_SDK_KEY = "3DHbmsE3z3y3Fb1qmexbA";
const PROMO_HERO_FLAG = "promo_hero";
const PROMO_BANNER_FLAG = "promo_banner";
const USER_ID = "user123";



/**
 *  Initialize the Flags SDK
 */


const optimizelyClient = window.optimizelySdk.createInstance({
    sdkKey: OPTIMIZELY_SDK_KEY
});
window.optimizelyClient = optimizelyClient;



odpReady().then(() => {
    console.log("window.zaius is ready");
});


/**
 * Instrument the banner with a flag
 */
documentReady().then(() => {

    optimizelyClient.onReady().then(() => {
        const userCtx = optimizelyClient.createUserContext(USER_ID);

        const bannerDecisision = userCtx.decide(PROMO_BANNER_FLAG);

        renderBanner(
            bannerDecisision.enabled,
            bannerDecisision.variables
        );

    });
});

/**
 * Instrument the hero image with a flag
 */
documentReady().then(() => {

    optimizelyClient.onReady().then(() => {
        const userCtx = optimizelyClient.createUserContext(USER_ID);

        const heroDecision = userCtx.decide(PROMO_HERO_FLAG);

        renderHero(
            heroDecision.enabled,
            heroDecision.variables
        );

    });
});















/**
 * Library functions
 */

/**
 * renderHero
 * @param {boolean} enabled     true if the hero element should be displayed 
 * @param {*} param1            a set of variables that control the appearance of the hero offer 
 */
function renderHero(enabled, {
    image_url = "/globalassets/_mosey/start/woman1-large.png",
    h1_text = "Sustainable Clothing",
    h3_text = "Make a difference",
    button_text = " Learn more ",
    button_url = "/en/fashion/mens/"
}) {

    const HERO_CONTAINER_SELECTOR = "#heroBlock-174"
    const HERO_IMAGE_SELECTOR = ".hero-block__image";
    const HERO_H1_SELECTOR = ".hero-block__callout-content h1";
    const HERO_H3_SELECTOR = ".hero-block__callout-content h3";
    const HERO_BUTTON_SELECTOR = ".hero-block__callout-content a";

    elementReady(HERO_CONTAINER_SELECTOR).then((hero) => {

        if (enabled) {
            const heroImage = hero.querySelector(HERO_IMAGE_SELECTOR);
            heroImage.style.backgroundImage = `url(${image_url})`;

            const h1 = hero.querySelector(HERO_H1_SELECTOR);
            h1.innerHTML = h1_text;

            const h3 = hero.querySelector(HERO_H3_SELECTOR);
            h3.innerHTML = h3_text;

            const button = hero.querySelector(HERO_BUTTON_SELECTOR);
            button.innerHTML = button_text;
            button.href = button_url;

            console.log("Rendering hero block");
            hero.style.display = "block";
        } else {
            console.log("Hiding hero block");
            hero.style.display = "none";
        }

    });

}

/**
 * Instrument the header banner using a Flag
 */
function renderBanner(enabled, {
    banner_text = "Spend $500 dollars and get $50 Off",
    banner_background_color = "black",
    banner_text_color = "white",
}) {
    const BANNER_SELECTOR = ".top-header";
    const BANNER_TEXT_SELECTOR = ".top-header__banner-text p";
    const MARKET_WRAPPER_SELECTOR = ".market-selector__wrapper";

    elementReady(BANNER_SELECTOR).then((banner) => {
        const text = banner.querySelector(BANNER_TEXT_SELECTOR);
        const marketSel = banner.querySelector(MARKET_WRAPPER_SELECTOR);

        // always hide the market selector
        marketSel.style.visibility = "hidden";

        if (enabled) {
            text.innerHTML = banner_text;

            Object.assign(
                text.style,
                {
                    color: banner_text_color,
                    "margin-top": "7px" // Hack to center the banner text
                }
            )

            banner.style.backgroundColor = banner_background_color;

            console.log("Rendering banner block");
            banner.style.display = "block";
        } else {
            console.log("Hiding banner block");
            banner.style.display = "none";
        }

    });
}


/**
 * docReady
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
 * zaiusReady
 * @returns a Promise that resolves when window.zaius is ready
 */
function odpReady() {
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            if (window.zaius) {
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
 * getParam
 * @param {string} param 
 * @returns the value of the specified param (string or null)
 */
function getParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param) || null;
}