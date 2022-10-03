# Opticon 2022 Feature Experimentation + ODP Demo

This repository contains code and documentation for the Opticon "Peanut Butter and Jelly: Feature Experimentation & Optimizely Data Platform"

## Demo Architecture

This Demo contains several components

- [Mosey Fashion](https://opticon2022.opti-us.com/) - An [Optimizely Foundation](https://docs.developers.optimizely.com/digital-experience-platform/v1.2.0-dxp-cloud-services/docs/optimizely-foundation-demo-sites) demo fashion retail website

- [optimizely/opticon-fs-odp-demo](https://github.com/optimizely/opticon-fs-odp-demo) - (This repository) contains JavaScript code implementing [Optimizely Feature Experimentation](https://www.optimizely.com/products/intelligence/full-stack-experimentation) and [Optimizely Data Platform](https://www.optimizely.com/products/intelligence/data-platform/) on Mosey Fashion

- [Opticon 22 ODP Demo (FS)](https://app.optimizely.com/v2/projects/22139720746/flags/list) - An Optimizely Feature Experimentation project containing the feature flags that control the behavior of the promotional "hero" and "banner" features on [Mosey Fashion](https://opticon2022.opti-us.com/)

- [Opticon 22 ODP Demo (Web)](https://app.optimizely.com/v2/projects/22138931278) - An Optimizely Web Experimentation containing an ODP audience shared with [Opticon 22 ODP Demo (FS)](https://app.optimizely.com/v2/projects/22139720746/flags/list) 

- [Optimizely Experimentation Demo](https://app.zaius.com/app?scope=3221) - An Optimizely Data Platform instance


## Building and deploying this repository

In the `/demo` directory, use the following to build the demo javascript payload

```sh
npm install
npm run build
```

Deploy by committing the contents of `/dist` to the `main` branch of this repository and pushing to Github. Github will use a webhook to tell the [Mosey Fashion](https://opticon2022.opti-us.com/) backend to download the contents of this repository and serve them statically.

You can trigger a "deploy" manually with

```sh
./bin/deploy.sh
```

## Demo Preparation Instructions

Open the following tabs:

0. [2022-10-04 Opticon Full Stack + ODP Demo](https://docs.google.com/presentation/d/1aNc8IxmpDd0aqe6ahfKdOHfIpKHMSEmx4LaHgQxQkgA/edit#slide=id.p) (Google Slides)

1. [Mosey Fashion](https://opticon2022.opti-us.com/) (Foundation)

    - Use the chrome inspector to clear application storage

2. [Opticon 22 ODP Demo (FS)](https://app.optimizely.com/v2/projects/22139720746/flags/list) (Feature Experimentation)
    
    - The [Production promo_hero flag Targeted Delivery rule](https://app.optimizely.com/v2/projects/22139720746/flags/manage/promo_hero/rules/production/edit/promo_hero_targeted_delivery) must Deliver the `20 Percent Off` variation the `Everyone` audience
    
    - The [Production promo_hero flag](https://app.optimizely.com/v2/projects/22139720746/flags/manage/promo_hero/rules/production) must be turned `Off` in `Production` 

    - The [promo_banner Targeted Delivery rule](https://app.optimizely.com/v2/projects/22139720746/flags/manage/promo_banner/rules/production/edit/promo_banner_targeted_delivery) must deliver the `20 Percent Off` variation to the `Has Seen Offer (ODP)` audience

    - The [Production promo_hero flag](https://app.optimizely.com/v2/projects/22139720746/flags/manage/promo_hero/rules/production) must be turned `Off` in `Production`  

3. [Optimizely Experimentation Demo](https://app.zaius.com/app?scope=3221) (Data Platform)

4. [Opticon 22 ODP Demo (Web)](https://app.optimizely.com/v2/projects/22138931278) (Web Experimentation)

5. [optimizely/opticon-fs-odp-demo](https://github.com/optimizely/opticon-fs-odp-demo) (Github)

    - It's fine to use Visual Studio with a local clone of this repository instead


## Demo Presentation instructions

- [[Slides 1-7](https://docs.google.com/presentation/d/1aNc8IxmpDd0aqe6ahfKdOHfIpKHMSEmx4LaHgQxQkgA/edit#slide=id.p)] **Title and Introduction** - Present slides 1-6 directly

- [[Slide 8 - 11](https://docs.google.com/presentation/d/1aNc8IxmpDd0aqe6ahfKdOHfIpKHMSEmx4LaHgQxQkgA/edit#slide=id.g15c4628a615_0_1)] **Feature Flags** - Do not present these slides, instead:
    
    1. Show [Mosey Fashion](https://opticon2022.opti-us.com/)
    
    2. Show the [promo_hero flag](https://app.optimizely.com/v2/projects/22139720746/flags/manage/promo_hero/rules/production) and and walk through the concept of variables, and show the specific variable values in the `20 Percent Off` variation
    
    3. Turn the `promo_hero` flag `On` in `Production` (_not_ `Development`!)
    
    4. Show the [`decideAndRenderPromo()`](https://github.com/optimizely/opticon-fs-odp-demo/blob/f4c136d198c91f56d0ab461923229b0e493ea36d/demo/src/flags.js#L9) function in [flags.js](https://github.com/optimizely/opticon-fs-odp-demo/blob/main/demo/src/flags.js) and explain how the flag implementation works, starting with the call to `getOptimizelyUserContext` and stopping after the call to `renderHero`
    
    5. Show [Mosey Fashion](https://opticon2022.opti-us.com/) and hard refresh. You should see the "promo hero" offering 20% off

- [[Slides 12-17](https://docs.google.com/presentation/d/1aNc8IxmpDd0aqe6ahfKdOHfIpKHMSEmx4LaHgQxQkgA/edit#slide=id.g15c4628a615_0_5)] **Feature Targeting** Do not present these slides, instead:

    1. Show the [`promo_hero` flag](https://app.optimizely.com/v2/projects/22139720746/flags/manage/promo_hero/rules/production) and target the Targeted Delivery rule to the `Has Purchased (Local)` audience

    2. Show the [`Has Purchased (Local)` audience](https://app.optimizely.com/v2/projects/22139720746/audiences/22244770413/#modal) and explain how the `has_purchased_local` attribute is used to construct it.

    3. Show the [`instrumentAddToCart()`](https://github.com/optimizely/opticon-fs-odp-demo/blob/main/demo/src/instrument.js) function in [`instrument.js](https://github.com/optimizely/opticon-fs-odp-demo/blob/main/demo/src/instrument.js) and explain how the `has_purchased_local` attribute is set in localstorage

    4. Show the [`getOptimizelyUserContext()`](https://github.com/optimizely/opticon-fs-odp-demo/blob/f4c136d198c91f56d0ab461923229b0e493ea36d/demo/src/fullstack.js#L27) function in [`fullstack.js`](https://github.com/optimizely/opticon-fs-odp-demo/blob/main/demo/src/fullstack.js) and explain how attributes are retrieved from local storage to create the `UserContext` object

    5. Show [Mosey Fashion](https://opticon2022.opti-us.com/) and hard refresh. You should NOT see the "promo hero" offer anymore

    6. Navigate to a [Product Detail Page](https://opticon2022.opti-us.com/en/fashion/womens/womens-jackets/p-40707713/) and add the item to your cart

    7. Navigate back to the [Home Page](https://opticon2022.opti-us.com/). You should now see the "promo hero" offer again (because you just "purchased")

- [[Slides 18-25](https://docs.google.com/presentation/d/1aNc8IxmpDd0aqe6ahfKdOHfIpKHMSEmx4LaHgQxQkgA/edit#slide=id.g15c4628a615_0_9)] **Feature Targeting with ODP** Present slides 19 and 20 directly, then

    1. Show [ODP Real Time Segments](https://app.zaius.com/app?scope=3221#/realtime_segments) and find the [`Has Purchased At Least Once` RTS](https://app.zaius.com/app?scope=3221#/realtime_segments/view/has_purchased_at_least_once) and explain what ODP attributes are, and how the `Has Purchased` attribute is used to build this audience

    2. Show the the [`Has Purchased (ODP)` audience] and explain how the ODP Audience Targeting works

    3. Show the [`promo_hero` flag](https://app.optimizely.com/v2/projects/22139720746/flags/manage/promo_hero/rules/production/edit/promo_hero_targeted_delivery) and remove the `Has Purchased (Local)` audience, and replace it with the `Has Purchased (ODP)` audience

    4. Show the [`instrumentAddToCart()`](https://github.com/optimizely/opticon-fs-odp-demo/blob/main/demo/src/instrument.js) function in [`instrument.js](https://github.com/optimizely/opticon-fs-odp-demo/blob/main/demo/src/instrument.js) again and explain the `window.odpClient.customer` call for setting the `has_purchased` ODP attribute

    5. Show the [`getOptimizelyUserContext()`](https://github.com/optimizely/opticon-fs-odp-demo/blob/f4c136d198c91f56d0ab461923229b0e493ea36d/demo/src/fullstack.js#L27) again and explain the `userCtx.fetchQualifiedSegments()` call

    6. Show [Mosey Fashion](https://opticon2022.opti-us.com/) and hard refresh. You should still see the "promo hero" offer. Open up the chrome inspector, look at local storage, and copy the `fs_user_id` value.

    7. Open up an incognito window and load [Mosey Fashion](https://opticon2022.opti-us.com/). You should not see the promo offer. Now, add a url parameter, `?userid=fs_user_id_XXXX`, pasting in the value you copied from local storage. NOW you should see the promo offer. You can ham it up by incrementing the number and demonstrating that the offer goes away, and then decrementing it and bringing the offer back

    8. Show the [`Has Purchased (ODP)` Optimizely Web audience](https://app.optimizely.com/v2/projects/22138931278/audiences/22256680135/#modal) while the speaker talks about audience portability

- [[Slides 26-28](https://docs.google.com/presentation/d/1aNc8IxmpDd0aqe6ahfKdOHfIpKHMSEmx4LaHgQxQkgA/edit#slide=id.g15d2517a75e_0_14)] **Hybrid Local+ODP Feature Targeting** Present slides 26 and 27 directly, then

    1. Show the [promo_hero flag](https://app.optimizely.com/v2/projects/22139720746/flags/manage/promo_hero/rules/production) and add the `Has Purchased (Local)` audience to the rule so that both the `Local` and `ODP` audiences are being targeted

- [[Slides 29-31](https://docs.google.com/presentation/d/1aNc8IxmpDd0aqe6ahfKdOHfIpKHMSEmx4LaHgQxQkgA/edit#slide=id.g15d2517a75e_0_10)] **Flag Observability** don't present these slides, instead

    1. Show the [Full Stack Flag Decisions Report](https://app.zaius.com/app?scope=3221#/reports/show?id=21224&activeTab=rocket_table&interval=hr&start=start_of_today&end=end_of_today&compareActive=false&metric=all_the_things&metricFields=%5B%22customer.customer_id%22%5D&expression=-1&dimensions=%5B%22ts%22%2C%22vdl_action%22%2C%22_fs_flag_enabled%22%2C%22_fs_flag_key%22%2C%22_fs_variables%22%2C%22_fs_variation_key%22%2C%22_event_fs_user_id%22%5D&rtRowStart=1&rtRowCount=100&rtSortColumn=0&rtSortAsc=0&rtFilters=%5B-1%5D&rtMetrics=%5B%5B%22count%22%5D%5D&rtFormats=%5B0%5D&rtNames=%5B%22All%20Events%22%5D&filters=%5B%5B%22vdl_action%22%2C%5B%22decision%22%5D%2C%22%3D%22%5D%5D)

    2. Show the [addNotificationListeners](https://github.com/optimizely/opticon-fs-odp-demo/blob/9117b050a8b8a6fed550a210c853e31aff68ec50/demo/src/fs2odp.js#L43) function in [`fs2odp.js`](https://github.com/optimizely/opticon-fs-odp-demo/blob/main/demo/src/fs2odp.js) and explain how it works 

- [[Slides 32-37](https://docs.google.com/presentation/d/1aNc8IxmpDd0aqe6ahfKdOHfIpKHMSEmx4LaHgQxQkgA/edit#slide=id.g15f3c9ce077_0_84)] **Flag Dependencies** do not present these slides directly

    1. Show the [`Has Seen Offer At Least Once` RTS](https://app.zaius.com/app?scope=3221#/realtime_segments/view/has_seen_offer_at_least_once) in ODP

    2. Show the [`decideAndRenderHeroPromo` function](https://github.com/optimizely/opticon-fs-odp-demo/blob/9117b050a8b8a6fed550a210c853e31aff68ec50/demo/src/flags.js#L9) in [`flags.js`](https://github.com/optimizely/opticon-fs-odp-demo/blob/main/demo/src/flags.js) and explain the `window.odpClient.customer` call when `hero_promo` is enabled

    3. Turn the [`promo_banner` flag](https://app.optimizely.com/v2/projects/22139720746/flags/manage/promo_banner/rules/production/edit/promo_banner_targeted_delivery) `On` and explain the targeting

    4. Show [Mosey Fashion](https://opticon2022.opti-us.com/) and navigate to a product detail page, demonstrating that you in fact now see the banner. If you like you can change the user ID again and show how it goes away.

- [[Slides 38-39](https://docs.google.com/presentation/d/1aNc8IxmpDd0aqe6ahfKdOHfIpKHMSEmx4LaHgQxQkgA/edit#slide=id.g15f3c9ce077_0_94)] Present the slides directly


    




## Demo Links

- [Mosey Fashion (Foundation Store)](https://opticon2022.opti-us.com/)
- [Optimizely Full Stack Project](https://app.optimizely.com/v2/projects/22139720746)
- [Optimizely Web Project]()
