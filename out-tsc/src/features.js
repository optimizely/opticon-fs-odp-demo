/**
 * Exports several functions that render new "features" on Mosey's storefront
 */
import { elementReady } from "./lib";
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
            ;
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
export { renderBanner, renderHero };
