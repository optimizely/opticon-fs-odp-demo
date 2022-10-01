import { getOptimizelyUserContext } from "./fullstack";
import { renderHero, renderBanner } from "./mosey";
import { setLocalFlagsUserAttributes } from "./lib";


/**
 * Render the "Hero Offer" component according to to the promo_hero flag
 */
function decideAndRenderHeroPromo() {

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
}



/**
 * Render the "Hero Banner" component according to the promo_banner flag
 */
function decideAndRenderBannerPromo() {

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

}




export { decideAndRenderHeroPromo, decideAndRenderBannerPromo };