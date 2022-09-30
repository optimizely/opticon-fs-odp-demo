const VERSION = "0.0.11";
console.log(`demo_header.js loaded (v${VERSION})`);

const OPTIMIZELY_SDK_KEY = "3DHbmsE3z3y3Fb1qmexbA";







odpReady().then(() => {
    console.log("window.zaius is ready");

    /**
     * Initialize the Flags SDK
     * Doing this after odpReady() resolves ensures that the ODP client
     * is also initialized for any code that depends on both flags and
     * ODP 
     */
    const optimizelyClient = window.optimizelySdk.createInstance({
        sdkKey: OPTIMIZELY_SDK_KEY
    });
    window.optimizelyClient = optimizelyClient;
    optimizelyClient.onReady(() => {
        console.log("window.optimizelyCient is ready")
    })




    documentReady().then(() => {



        /**
         * Instrument hero offer with a flag
         */
        window.optimizelyClient.onReady().then(async () => {

            // create a UserContext object
            const userCtx = await getOptimizelyUserContext();

            // generate a flag decision for the hero feature
            const heroDecision = userCtx.decide("promo_hero");

            // render the hero element using the configuration specified
            // in the flag decision
            renderHero(
                heroDecision.enabled,
                heroDecision.variables
            );

            // If the hero offer flag was enabled, save that state so that
            // dependent flags will be decided correctly
            if (heroDecision.enabled) {

                // Set a user attribute in local storage
                setLocalFlagsUserAttributes({
                    has_seen_offer_local: true
                });

                // Set an ODP customer attribute
                window.odpClient.customer({}, {
                    has_seen_offer: true
                });
            }

        });


        /**
         * Instrument banner offer with a flag
         */
        window.optimizelyClient.onReady().then(async () => {

            // create a UserContext object
            const userCtx = await getOptimizelyUserContext();

            // generate a flag decision for the banner feature
            const bannerDecisision = userCtx.decide("promo_banner");

            // render the banner element using the configuration specified
            // in the flag decision
            renderBanner(
                bannerDecisision.enabled,
                bannerDecisision.variables
            );

        });








    });

});












/**
 * Library functions
 */

/**
 * Generates or retrieves an Optimizely Full Stack userId value
 * @returns {string} a locally-stored value for fs_user_id
 */
function getOptimizelyUserId() {
    const USER_ID_KEY = "fs_user_id"

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

/**
 * Store the user's email in local storage
 * @param {string} email 
 */
function setLocalEmail(email) {
    localStorage.setItem("email", email);
}

/**
 * Retrieves the user's email address from local storage
 * @returns {string} the user's email address
 */
function getLocalEmail() {
    const email = localStorage.getItem("email");

    return email
}

/**
 * renderHero
 * @param {boolean} enabled     true if the hero element should be displayed 
 * @param {*} param1            a set of variables that control the appearance of the hero offer 
 */
function renderHero(enabled, {
    image_url = "/globalassets/_mosey/start/woman1-large.png",
    h1_text = "Sustainable Clothing",
    h3_text = "Make a difference",
    text_color = "black",
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
            h1.style.color = text_color;

            const h3 = hero.querySelector(HERO_H3_SELECTOR);
            h3.innerHTML = h3_text
            h3.style.color = text_color;;

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
    const PRODUCT_DETAIL_SELECTOR = ".product-detail";
    const BANNER_SELECTOR = ".top-header";
    const BANNER_TEXT_SELECTOR = ".top-header__banner-text p";
    const MARKET_WRAPPER_SELECTOR = ".market-selector__wrapper";

    elementReady(PRODUCT_DETAIL_SELECTOR).then(() => {

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
                window.odpClient = window.zaius;
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


/**
 * Site hacks and instrumentation
 */

documentReady().then(() => {
    /**
     * Instrument the Add to Cart button to update hasPurchased in local storage
     */
    const ADD_TO_CART_SELECTOR = ".addToCart";

    elementReady(ADD_TO_CART_SELECTOR).then((addToCart) => {
        addToCart.addEventListener("click", () => {
            setLocalFlagsUserAttributes({ "has_purchased_local": true });
            window.odpClient.customer({}, {
                "has_purchased": true
            });
        })
    });

    const LOGIN_BUTTON_SELECTOR = ".jsUsersSigninBtn";
    const EMAIL_INPUT_SELECTOR = "#LoginViewModel_Email";

    elementReady(LOGIN_BUTTON_SELECTOR).then((loginBtn) => {

        loginBtn.addEventListener("click", () => {

            emailInput = document.querySelector(EMAIL_INPUT_SELECTOR);

            setLocalEmail(emailInput.value);

        });

    });


});
