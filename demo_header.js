import { renderHero, renderBanner, docReady, odpReady } from "./demo_lib";

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
docReady().then(() => {

    // Hack. The banner is displayed by default, so we hide it and then display it according to the flag settings
    renderBanner(false, {});

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
docReady().then(() => {

    // Hack. The hero is displayed by default, so we hide it and then display it according to the flag settings
    renderHero(false, {});

    optimizelyClient.onReady().then(() => {
        const userCtx = optimizelyClient.createUserContext(USER_ID);

        const heroDecision = userCtx.decide(PROMO_HERO_FLAG);

        renderHero(
            heroDecision.enabled,
            heroDecision.variables
        );

    });
});





