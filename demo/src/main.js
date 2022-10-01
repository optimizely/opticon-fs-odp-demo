import { odpReady } from "./odp";
import { documentReady } from "./lib";
import { instrumentAddToCart } from "./instrument";
import { decideAndRenderHeroPromo, decideAndRenderBannerPromo } from "./flags";
import * as fs2odp from "./fs2odp";
import * as optimizely from "@optimizely/optimizely-sdk";

const OPTIMIZELY_SDK_KEY = "3DHbmsE3z3y3Fb1qmexbA";


odpReady().then(() => {
    console.log("window.zaius is ready");

    // Instrument the Add to Cart button to update hasPurchased in local storage
    instrumentAddToCart();

    /**
     * Initialize the Flags SDK
     * Doing this after odpReady() resolves ensures that the ODP client
     * is also initialized for any code that depends on both flags and
     * ODP 
     */
    const optimizelyClient = optimizely.createInstance({
        sdkKey: OPTIMIZELY_SDK_KEY
    });
    window.optimizelyClient = optimizelyClient;

    // Add fs2odp notification listeners
    // These will forward all Full Stack decision and track events to ODP
    fs2odp.addNotficationListeners(optimizelyClient, window.odpClient);

    documentReady().then(() => {

        // Decide and render the Hero promo according to the corresponding flag
        decideAndRenderHeroPromo();

        // Decide and render the Banner promo according to the corresponding flag
        decideAndRenderBannerPromo();

    });

});


