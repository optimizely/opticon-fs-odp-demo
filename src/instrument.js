/**
 * Site hacks and instrumentation
 */

import { documentReady } from './lib';

/**
 * Instrument the Add to Cart button to update hasPurchased in local storage
 */
function instrumentAddToCart() {

    documentReady().then(() => {

        const ADD_TO_CART_SELECTOR = ".addToCart";

        // Wait for the Add to Cart button to be added to the DOM
        elementReady(ADD_TO_CART_SELECTOR).then((addToCart) => {

            // When the button is clicked, add an attribute to the local storage, and set an
            // ODP customer attribute
            addToCart.addEventListener("click", () => {

                setLocalFlagsUserAttributes({ "has_purchased_local": true });
                window.odpClient.customer({}, {
                    "has_purchased": true
                });
            })
        });

    });

}
