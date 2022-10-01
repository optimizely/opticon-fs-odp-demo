import { odpReady } from "./odp";
import { getOptimizelyUserContext } from "./fs";
import { documentReady, setLocalFlagsUserAttributes } from "./lib";
import { renderBanner, renderHero } from "./features";
import * as optimizely from "@optimizely/optimizely-sdk";
import * as fs2odp from "./fs2odp";

const OPTIMIZELY_SDK_KEY = "3DHbmsE3z3y3Fb1qmexbA";


odpReady().then(() => {
    console.log("window.zaius is ready");

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
    fs2odp.addNotficationListeners(optimizelyClient, window.odpClient);
    optimizelyClient.onReady(() => {
        console.log("window.optimizelyCient is ready");
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


