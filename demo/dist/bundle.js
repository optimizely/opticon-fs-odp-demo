(function (optimizely) {
    'use strict';

    function _interopNamespace(e) {
        if (e && e.__esModule) return e;
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n["default"] = e;
        return Object.freeze(n);
    }

    var optimizely__namespace = /*#__PURE__*/_interopNamespace(optimizely);

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
            };
        });
    }

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
            }
            else {
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
            };
        });
    }

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

    /**
     * Exports several functions that render new "features" on Mosey's storefront
     */
    /**
     * renderHero
     * @param {boolean} enabled     true if the hero element should be displayed
     * @param {*} param1            a set of variables that control the appearance of the hero offer
     */
    function renderHero(enabled, { image_url = "/globalassets/_mosey/start/woman1-large.png", h1_text = "Sustainable Clothing", h3_text = "Make a difference", text_color = "black", button_text = " Learn more ", button_url = "/en/fashion/mens/" }) {
        const HERO_CONTAINER_SELECTOR = "#heroBlock-174";
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
                h3.innerHTML = h3_text;
                h3.style.color = text_color;
                const button = hero.querySelector(HERO_BUTTON_SELECTOR);
                button.innerHTML = button_text;
                button.href = button_url;
                console.log("Rendering hero block");
                hero.style.display = "block";
            }
            else {
                console.log("Hiding hero block");
                hero.style.display = "none";
            }
        });
    }
    /**
     * Instrument the header banner using a Flag
     */
    function renderBanner(enabled, { banner_text = "Spend $500 dollars and get $50 Off", banner_background_color = "black", banner_text_color = "white", }) {
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
                    Object.assign(text.style, {
                        color: banner_text_color,
                        "margin-top": "7px" // Hack to center the banner text
                    });
                    banner.style.backgroundColor = banner_background_color;
                    console.log("Rendering banner block");
                    banner.style.display = "block";
                }
                else {
                    console.log("Hiding banner block");
                    banner.style.display = "none";
                }
            });
        });
    }

    // ODP event type for flag events
    const ODP_EVENT_TYPE = "optimizely_full_stack";
    /**
     * Transforms a `DecisionListenerPayload` into a `DecisionOdpPayload`
     * @param d - A `DecisionListenerPayload`
     * @returns A corresponding `DecisionOdpPayload` object
     */
    function createDecisionOdpPayload(d) {
        return {
            action: "decision",
            fs_user_id: d.userId,
            fs_attributes: serialize(d.attributes),
            fs_flag_key: d.decisionInfo.flagKey,
            fs_enabled: d.decisionInfo.enabled,
            fs_variation_key: d.decisionInfo.variationKey || "",
            fs_rule_key: d.decisionInfo.ruleKey || "",
            fs_variables: serialize(d.decisionInfo.variables),
            fs_reasons: serialize(d.decisionInfo.reasons),
        };
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
        };
    }
    /**
     * Add ODP notification listeners to a Full Stack SDK client
     * @param {optimizely.Client} client - An Optimizely Full Stack client
     */
    function addNotficationListeners(optimizelyClient, odpClient) {
        console.log("Adding fs2odp notification listeners");
        // Send an ODP event whenever a flag decision is made
        optimizelyClient.notificationCenter.addNotificationListener(optimizely.enums.NOTIFICATION_TYPES.DECISION, (d) => {
            const payload = createDecisionOdpPayload(d);
            console.log("Sending ODP decision event");
            console.log(payload);
            odpClient.event(ODP_EVENT_TYPE, payload);
        });
        // Send an ODP event whenever a Full Stack event is tracked
        optimizelyClient.notificationCenter.addNotificationListener(optimizely.enums.NOTIFICATION_TYPES.TRACK, (e) => {
            const payload = createTrackOdpPayload(e);
            console.log("Sending ODP track event");
            console.log(payload);
            odpClient.event(ODP_EVENT_TYPE, createTrackOdpPayload(e));
        });
    }
    /**
     * ODP escapes quote characters, so we remove them from serialized objects
     * @param {any} obj
     */
    function serialize(obj) {
        let json = JSON.stringify(obj);
        return json.replaceAll("\"", "");
    }

    const OPTIMIZELY_SDK_KEY = "3DHbmsE3z3y3Fb1qmexbA";
    odpReady().then(() => {
        console.log("window.zaius is ready");
        /**
         * Initialize the Flags SDK
         * Doing this after odpReady() resolves ensures that the ODP client
         * is also initialized for any code that depends on both flags and
         * ODP
         */
        const optimizelyClient = optimizely__namespace.createInstance({
            sdkKey: OPTIMIZELY_SDK_KEY
        });
        window.optimizelyClient = optimizelyClient;
        addNotficationListeners(optimizelyClient, window.odpClient);
        optimizelyClient.onReady(() => {
            console.log("window.optimizelyCient is ready");
        });
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
                renderHero(heroDecision.enabled, heroDecision.variables);
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
                renderBanner(bannerDecisision.enabled, bannerDecisision.variables);
            });
        });
    });

})(optimizelySdk);
