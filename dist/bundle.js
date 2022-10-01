(function () {
    'use strict';

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

    // Unique ID creation requires a high quality random # generator. In the browser we therefore
    // require the crypto API and do not support built-in fallback to lower quality random number
    // generators (like Math.random()).
    var getRandomValues;
    var rnds8 = new Uint8Array(16);
    function rng$3() {
      // lazy load so that environments that need to polyfill have a chance to do so
      if (!getRandomValues) {
        // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
        // find the complete implementation of crypto (msCrypto) on IE11.
        getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);

        if (!getRandomValues) {
          throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
        }
      }

      return getRandomValues(rnds8);
    }

    var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

    function validate$5(uuid) {
      return typeof uuid === 'string' && REGEX.test(uuid);
    }

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */

    var byteToHex$1 = [];

    for (var i$1 = 0; i$1 < 256; ++i$1) {
      byteToHex$1.push((i$1 + 0x100).toString(16).substr(1));
    }

    function stringify$1(arr) {
      var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      // Note: Be careful editing this code!  It's been tuned for performance
      // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
      var uuid = (byteToHex$1[arr[offset + 0]] + byteToHex$1[arr[offset + 1]] + byteToHex$1[arr[offset + 2]] + byteToHex$1[arr[offset + 3]] + '-' + byteToHex$1[arr[offset + 4]] + byteToHex$1[arr[offset + 5]] + '-' + byteToHex$1[arr[offset + 6]] + byteToHex$1[arr[offset + 7]] + '-' + byteToHex$1[arr[offset + 8]] + byteToHex$1[arr[offset + 9]] + '-' + byteToHex$1[arr[offset + 10]] + byteToHex$1[arr[offset + 11]] + byteToHex$1[arr[offset + 12]] + byteToHex$1[arr[offset + 13]] + byteToHex$1[arr[offset + 14]] + byteToHex$1[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
      // of the following:
      // - One or more input array values don't map to a hex octet (leading to
      // "undefined" in the uuid)
      // - Invalid input values for the RFC `version` or `variant` fields

      if (!validate$5(uuid)) {
        throw TypeError('Stringified UUID is invalid');
      }

      return uuid;
    }

    function v4$2(options, buf, offset) {
      options = options || {};
      var rnds = options.random || (options.rng || rng$3)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

      rnds[6] = rnds[6] & 0x0f | 0x40;
      rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

      if (buf) {
        offset = offset || 0;

        for (var i = 0; i < 16; ++i) {
          buf[offset + i] = rnds[i];
        }

        return buf;
      }

      return stringify$1(rnds);
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getAugmentedNamespace(n) {
      var f = n.default;
    	if (typeof f == "function") {
    		var a = function () {
    			return f.apply(this, arguments);
    		};
    		a.prototype = f.prototype;
      } else a = {};
      Object.defineProperty(a, '__esModule', {value: true});
    	Object.keys(n).forEach(function (k) {
    		var d = Object.getOwnPropertyDescriptor(n, k);
    		Object.defineProperty(a, k, d.get ? d : {
    			enumerable: true,
    			get: function () {
    				return n[k];
    			}
    		});
    	});
    	return a;
    }

    var murmurhash$1 = {exports: {}};

    (function (module) {
    	(function(){

    	  const createBuffer = (val) => new TextEncoder().encode(val);

    	  /**
    	   * JS Implementation of MurmurHash2
    	   *
    	   * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
    	   * @see http://github.com/garycourt/murmurhash-js
    	   * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
    	   * @see http://sites.google.com/site/murmurhash/
    	   *
    	   * @param {Uint8Array | string} str ASCII only
    	   * @param {number} seed Positive integer only
    	   * @return {number} 32-bit positive integer hash
    	   */
    	  function MurmurHashV2(str, seed) {
    	    if (typeof str === 'string') str = createBuffer(str);
    	    let
    	      l = str.length,
    	      h = seed ^ l,
    	      i = 0,
    	      k;

    	    while (l >= 4) {
    	      k =
    	        ((str[i] & 0xff)) |
    	        ((str[++i] & 0xff) << 8) |
    	        ((str[++i] & 0xff) << 16) |
    	        ((str[++i] & 0xff) << 24);

    	      k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    	      k ^= k >>> 24;
    	      k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));

    	    h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;

    	      l -= 4;
    	      ++i;
    	    }

    	    switch (l) {
    	    case 3: h ^= (str[i + 2] & 0xff) << 16;
    	    case 2: h ^= (str[i + 1] & 0xff) << 8;
    	    case 1: h ^= (str[i] & 0xff);
    	            h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    	    }

    	    h ^= h >>> 13;
    	    h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    	    h ^= h >>> 15;

    	    return h >>> 0;
    	  }
    	  /*
    	   * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
    	   *
    	   * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
    	   * @see http://github.com/garycourt/murmurhash-js
    	   * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
    	   * @see http://sites.google.com/site/murmurhash/
    	   *
    	   * @param {Uint8Array | string} key ASCII only
    	   * @param {number} seed Positive integer only
    	   * @return {number} 32-bit positive integer hash
    	   */
    	  function MurmurHashV3(key, seed) {
    	    if (typeof key === 'string') key = createBuffer(key);

    	    let remainder, bytes, h1, h1b, c1, c2, k1, i;

    	    remainder = key.length & 3; // key.length % 4
    	    bytes = key.length - remainder;
    	    h1 = seed;
    	    c1 = 0xcc9e2d51;
    	    c2 = 0x1b873593;
    	    i = 0;

    	    while (i < bytes) {
    	        k1 =
    	          ((key[i] & 0xff)) |
    	          ((key[++i] & 0xff) << 8) |
    	          ((key[++i] & 0xff) << 16) |
    	          ((key[++i] & 0xff) << 24);
    	      ++i;

    	      k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
    	      k1 = (k1 << 15) | (k1 >>> 17);
    	      k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

    	      h1 ^= k1;
    	          h1 = (h1 << 13) | (h1 >>> 19);
    	      h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
    	      h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    	    }

    	    k1 = 0;

    	    switch (remainder) {
    	      case 3: k1 ^= (key[i + 2] & 0xff) << 16;
    	      case 2: k1 ^= (key[i + 1] & 0xff) << 8;
    	      case 1: k1 ^= (key[i] & 0xff);

    	      k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
    	      k1 = (k1 << 15) | (k1 >>> 17);
    	      k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
    	      h1 ^= k1;
    	    }

    	    h1 ^= key.length;

    	    h1 ^= h1 >>> 16;
    	    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    	    h1 ^= h1 >>> 13;
    	    h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
    	    h1 ^= h1 >>> 16;

    	    return h1 >>> 0;
    	  }

    	  const murmur = MurmurHashV3;
    	  murmur.v2 = MurmurHashV2;
    	  murmur.v3 = MurmurHashV3;

    	  {
    	    module.exports = murmur;
    	  }
    	}());
    } (murmurhash$1));

    var murmurhash = murmurhash$1.exports;

    var index_node = {};

    var nodeDatafileManager = {};

    var lib$1 = {};

    var errorHandler = {};

    Object.defineProperty(errorHandler, "__esModule", { value: true });
    /**
     * @export
     * @class NoopErrorHandler
     * @implements {ErrorHandler}
     */
    var NoopErrorHandler$1 = /** @class */ (function () {
        function NoopErrorHandler() {
        }
        /**
         * @param {Error} exception
         * @memberof NoopErrorHandler
         */
        NoopErrorHandler.prototype.handleError = function (exception) {
            // no-op
            return;
        };
        return NoopErrorHandler;
    }());
    errorHandler.NoopErrorHandler = NoopErrorHandler$1;
    var globalErrorHandler$1 = new NoopErrorHandler$1();
    /**
     * @export
     * @param {ErrorHandler} handler
     */
    function setErrorHandler$1(handler) {
        globalErrorHandler$1 = handler;
    }
    errorHandler.setErrorHandler = setErrorHandler$1;
    /**
     * @export
     * @returns {ErrorHandler}
     */
    function getErrorHandler$1() {
        return globalErrorHandler$1;
    }
    errorHandler.getErrorHandler = getErrorHandler$1;
    /**
     * @export
     */
    function resetErrorHandler() {
        globalErrorHandler$1 = new NoopErrorHandler$1();
    }
    errorHandler.resetErrorHandler = resetErrorHandler;

    var models = {};

    (function (exports) {
    	Object.defineProperty(exports, "__esModule", { value: true });
    	(function (LogLevel) {
    	    LogLevel[LogLevel["NOTSET"] = 0] = "NOTSET";
    	    LogLevel[LogLevel["DEBUG"] = 1] = "DEBUG";
    	    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    	    LogLevel[LogLevel["WARNING"] = 3] = "WARNING";
    	    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    	})(exports.LogLevel || (exports.LogLevel = {}));
    } (models));

    var logger$e = {};

    var lib = {};

    var _polyfillNode_crypto = {};

    var _polyfillNode_crypto$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': _polyfillNode_crypto
    });

    var require$$0$2 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_crypto$1);

    // Unique ID creation requires a high quality random # generator.  In node.js
    // this is pretty straight-forward - we use the crypto API.

    var crypto$1 = require$$0$2;

    var rng$2 = function nodeRNG() {
      return crypto$1.randomBytes(16);
    };

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */

    var byteToHex = [];
    for (var i = 0; i < 256; ++i) {
      byteToHex[i] = (i + 0x100).toString(16).substr(1);
    }

    function bytesToUuid$2(buf, offset) {
      var i = offset || 0;
      var bth = byteToHex;
      // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
      return ([
        bth[buf[i++]], bth[buf[i++]],
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]],
        bth[buf[i++]], bth[buf[i++]],
        bth[buf[i++]], bth[buf[i++]]
      ]).join('');
    }

    var bytesToUuid_1 = bytesToUuid$2;

    var rng$1 = rng$2;
    var bytesToUuid$1 = bytesToUuid_1;

    // **`v1()` - Generate time-based UUID**
    //
    // Inspired by https://github.com/LiosK/UUID.js
    // and http://docs.python.org/library/uuid.html

    var _nodeId;
    var _clockseq;

    // Previous uuid creation time
    var _lastMSecs = 0;
    var _lastNSecs = 0;

    // See https://github.com/uuidjs/uuid for API details
    function v1$1(options, buf, offset) {
      var i = buf && offset || 0;
      var b = buf || [];

      options = options || {};
      var node = options.node || _nodeId;
      var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

      // node and clockseq need to be initialized to random values if they're not
      // specified.  We do this lazily to minimize issues related to insufficient
      // system entropy.  See #189
      if (node == null || clockseq == null) {
        var seedBytes = rng$1();
        if (node == null) {
          // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
          node = _nodeId = [
            seedBytes[0] | 0x01,
            seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]
          ];
        }
        if (clockseq == null) {
          // Per 4.2.2, randomize (14 bit) clockseq
          clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
        }
      }

      // UUID timestamps are 100 nano-second units since the Gregorian epoch,
      // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
      // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
      // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
      var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

      // Per 4.2.1.2, use count of uuid's generated during the current clock
      // cycle to simulate higher resolution clock
      var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

      // Time since last uuid creation (in msecs)
      var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

      // Per 4.2.1.2, Bump clockseq on clock regression
      if (dt < 0 && options.clockseq === undefined) {
        clockseq = clockseq + 1 & 0x3fff;
      }

      // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
      // time interval
      if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
        nsecs = 0;
      }

      // Per 4.2.1.2 Throw error if too many uuids are requested
      if (nsecs >= 10000) {
        throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
      }

      _lastMSecs = msecs;
      _lastNSecs = nsecs;
      _clockseq = clockseq;

      // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
      msecs += 12219292800000;

      // `time_low`
      var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
      b[i++] = tl >>> 24 & 0xff;
      b[i++] = tl >>> 16 & 0xff;
      b[i++] = tl >>> 8 & 0xff;
      b[i++] = tl & 0xff;

      // `time_mid`
      var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
      b[i++] = tmh >>> 8 & 0xff;
      b[i++] = tmh & 0xff;

      // `time_high_and_version`
      b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
      b[i++] = tmh >>> 16 & 0xff;

      // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
      b[i++] = clockseq >>> 8 | 0x80;

      // `clock_seq_low`
      b[i++] = clockseq & 0xff;

      // `node`
      for (var n = 0; n < 6; ++n) {
        b[i + n] = node[n];
      }

      return buf ? buf : bytesToUuid$1(b);
    }

    var v1_1 = v1$1;

    var rng = rng$2;
    var bytesToUuid = bytesToUuid_1;

    function v4$1(options, buf, offset) {
      var i = buf && offset || 0;

      if (typeof(options) == 'string') {
        buf = options === 'binary' ? new Array(16) : null;
        options = null;
      }
      options = options || {};

      var rnds = options.random || (options.rng || rng)();

      // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
      rnds[6] = (rnds[6] & 0x0f) | 0x40;
      rnds[8] = (rnds[8] & 0x3f) | 0x80;

      // Copy bytes to buffer, if provided
      if (buf) {
        for (var ii = 0; ii < 16; ++ii) {
          buf[i + ii] = rnds[ii];
        }
      }

      return buf || bytesToUuid(rnds);
    }

    var v4_1 = v4$1;

    var v1 = v1_1;
    var v4 = v4_1;

    var uuid$1 = v4;
    uuid$1.v1 = v1;
    uuid$1.v4 = v4;

    var uuid_1 = uuid$1;

    (function (exports) {
    	Object.defineProperty(exports, "__esModule", { value: true });
    	/**
    	 * Copyright 2019, Optimizely
    	 *
    	 * Licensed under the Apache License, Version 2.0 (the "License");
    	 * you may not use this file except in compliance with the License.
    	 * You may obtain a copy of the License at
    	 *
    	 * http://www.apache.org/licenses/LICENSE-2.0
    	 *
    	 * Unless required by applicable law or agreed to in writing, software
    	 * distributed under the License is distributed on an "AS IS" BASIS,
    	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    	 * See the License for the specific language governing permissions and
    	 * limitations under the License.
    	 */
    	var uuid_1$1 = uuid_1;
    	function generateUUID() {
    	    return uuid_1$1.v4();
    	}
    	exports.generateUUID = generateUUID;
    	function getTimestamp() {
    	    return new Date().getTime();
    	}
    	exports.getTimestamp = getTimestamp;
    	/**
    	 * Validates a value is a valid TypeScript enum
    	 *
    	 * @export
    	 * @param {object} enumToCheck
    	 * @param {*} value
    	 * @returns {boolean}
    	 */
    	function isValidEnum(enumToCheck, value) {
    	    var found = false;
    	    var keys = Object.keys(enumToCheck);
    	    for (var index = 0; index < keys.length; index++) {
    	        if (value === enumToCheck[keys[index]]) {
    	            found = true;
    	            break;
    	        }
    	    }
    	    return found;
    	}
    	exports.isValidEnum = isValidEnum;
    	function groupBy(arr, grouperFn) {
    	    var grouper = {};
    	    arr.forEach(function (item) {
    	        var key = grouperFn(item);
    	        grouper[key] = grouper[key] || [];
    	        grouper[key].push(item);
    	    });
    	    return objectValues(grouper);
    	}
    	exports.groupBy = groupBy;
    	function objectValues(obj) {
    	    return Object.keys(obj).map(function (key) { return obj[key]; });
    	}
    	exports.objectValues = objectValues;
    	function objectEntries(obj) {
    	    return Object.keys(obj).map(function (key) { return [key, obj[key]]; });
    	}
    	exports.objectEntries = objectEntries;
    	function find(arr, cond) {
    	    var found;
    	    for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
    	        var item = arr_1[_i];
    	        if (cond(item)) {
    	            found = item;
    	            break;
    	        }
    	    }
    	    return found;
    	}
    	exports.find = find;
    	function keyBy(arr, keyByFn) {
    	    var map = {};
    	    arr.forEach(function (item) {
    	        var key = keyByFn(item);
    	        map[key] = item;
    	    });
    	    return map;
    	}
    	exports.keyBy = keyBy;
    	function sprintf(format) {
    	    var args = [];
    	    for (var _i = 1; _i < arguments.length; _i++) {
    	        args[_i - 1] = arguments[_i];
    	    }
    	    var i = 0;
    	    return format.replace(/%s/g, function () {
    	        var arg = args[i++];
    	        var type = typeof arg;
    	        if (type === 'function') {
    	            return arg();
    	        }
    	        else if (type === 'string') {
    	            return arg;
    	        }
    	        else {
    	            return String(arg);
    	        }
    	    });
    	}
    	exports.sprintf = sprintf;
    	(function (NOTIFICATION_TYPES) {
    	    NOTIFICATION_TYPES["ACTIVATE"] = "ACTIVATE:experiment, user_id,attributes, variation, event";
    	    NOTIFICATION_TYPES["DECISION"] = "DECISION:type, userId, attributes, decisionInfo";
    	    NOTIFICATION_TYPES["LOG_EVENT"] = "LOG_EVENT:logEvent";
    	    NOTIFICATION_TYPES["OPTIMIZELY_CONFIG_UPDATE"] = "OPTIMIZELY_CONFIG_UPDATE";
    	    NOTIFICATION_TYPES["TRACK"] = "TRACK:event_key, user_id, attributes, event_tags, event";
    	})(exports.NOTIFICATION_TYPES || (exports.NOTIFICATION_TYPES = {}));
    } (lib));

    var __spreadArrays = (commonjsGlobal && commonjsGlobal.__spreadArrays) || function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };
    Object.defineProperty(logger$e, "__esModule", { value: true });
    /**
     * Copyright 2019, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var errorHandler_1 = errorHandler;
    var js_sdk_utils_1$1 = lib;
    var models_1 = models;
    var stringToLogLevel$1 = {
        NOTSET: 0,
        DEBUG: 1,
        INFO: 2,
        WARNING: 3,
        ERROR: 4,
    };
    function coerceLogLevel$1(level) {
        if (typeof level !== 'string') {
            return level;
        }
        level = level.toUpperCase();
        if (level === 'WARN') {
            level = 'WARNING';
        }
        if (!stringToLogLevel$1[level]) {
            return level;
        }
        return stringToLogLevel$1[level];
    }
    var DefaultLogManager$1 = /** @class */ (function () {
        function DefaultLogManager() {
            this.defaultLoggerFacade = new OptimizelyLogger$1();
            this.loggers = {};
        }
        DefaultLogManager.prototype.getLogger = function (name) {
            if (!name) {
                return this.defaultLoggerFacade;
            }
            if (!this.loggers[name]) {
                this.loggers[name] = new OptimizelyLogger$1({ messagePrefix: name });
            }
            return this.loggers[name];
        };
        return DefaultLogManager;
    }());
    var ConsoleLogHandler$1 = /** @class */ (function () {
        /**
         * Creates an instance of ConsoleLogger.
         * @param {ConsoleLogHandlerConfig} config
         * @memberof ConsoleLogger
         */
        function ConsoleLogHandler(config) {
            if (config === void 0) { config = {}; }
            this.logLevel = models_1.LogLevel.NOTSET;
            if (config.logLevel !== undefined && js_sdk_utils_1$1.isValidEnum(models_1.LogLevel, config.logLevel)) {
                this.setLogLevel(config.logLevel);
            }
            this.logToConsole = config.logToConsole !== undefined ? !!config.logToConsole : true;
            this.prefix = config.prefix !== undefined ? config.prefix : '[OPTIMIZELY]';
        }
        /**
         * @param {LogLevel} level
         * @param {string} message
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.log = function (level, message) {
            if (!this.shouldLog(level) || !this.logToConsole) {
                return;
            }
            var logMessage = this.prefix + " - " + this.getLogLevelName(level) + " " + this.getTime() + " " + message;
            this.consoleLog(level, [logMessage]);
        };
        /**
         * @param {LogLevel} level
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.setLogLevel = function (level) {
            level = coerceLogLevel$1(level);
            if (!js_sdk_utils_1$1.isValidEnum(models_1.LogLevel, level) || level === undefined) {
                this.logLevel = models_1.LogLevel.ERROR;
            }
            else {
                this.logLevel = level;
            }
        };
        /**
         * @returns {string}
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.getTime = function () {
            return new Date().toISOString();
        };
        /**
         * @private
         * @param {LogLevel} targetLogLevel
         * @returns {boolean}
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.shouldLog = function (targetLogLevel) {
            return targetLogLevel >= this.logLevel;
        };
        /**
         * @private
         * @param {LogLevel} logLevel
         * @returns {string}
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.getLogLevelName = function (logLevel) {
            switch (logLevel) {
                case models_1.LogLevel.DEBUG:
                    return 'DEBUG';
                case models_1.LogLevel.INFO:
                    return 'INFO ';
                case models_1.LogLevel.WARNING:
                    return 'WARN ';
                case models_1.LogLevel.ERROR:
                    return 'ERROR';
                default:
                    return 'NOTSET';
            }
        };
        /**
         * @private
         * @param {LogLevel} logLevel
         * @param {string[]} logArguments
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.consoleLog = function (logLevel, logArguments) {
            switch (logLevel) {
                case models_1.LogLevel.DEBUG:
                    console.log.apply(console, logArguments);
                    break;
                case models_1.LogLevel.INFO:
                    console.info.apply(console, logArguments);
                    break;
                case models_1.LogLevel.WARNING:
                    console.warn.apply(console, logArguments);
                    break;
                case models_1.LogLevel.ERROR:
                    console.error.apply(console, logArguments);
                    break;
                default:
                    console.log.apply(console, logArguments);
            }
        };
        return ConsoleLogHandler;
    }());
    logger$e.ConsoleLogHandler = ConsoleLogHandler$1;
    var globalLogLevel$1 = models_1.LogLevel.NOTSET;
    var globalLogHandler$1 = null;
    var OptimizelyLogger$1 = /** @class */ (function () {
        function OptimizelyLogger(opts) {
            if (opts === void 0) { opts = {}; }
            this.messagePrefix = '';
            if (opts.messagePrefix) {
                this.messagePrefix = opts.messagePrefix;
            }
        }
        /**
         * @param {(LogLevel | LogInputObject)} levelOrObj
         * @param {string} [message]
         * @memberof OptimizelyLogger
         */
        OptimizelyLogger.prototype.log = function (level, message) {
            var splat = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                splat[_i - 2] = arguments[_i];
            }
            this.internalLog(coerceLogLevel$1(level), {
                message: message,
                splat: splat,
            });
        };
        OptimizelyLogger.prototype.info = function (message) {
            var splat = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                splat[_i - 1] = arguments[_i];
            }
            this.namedLog(models_1.LogLevel.INFO, message, splat);
        };
        OptimizelyLogger.prototype.debug = function (message) {
            var splat = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                splat[_i - 1] = arguments[_i];
            }
            this.namedLog(models_1.LogLevel.DEBUG, message, splat);
        };
        OptimizelyLogger.prototype.warn = function (message) {
            var splat = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                splat[_i - 1] = arguments[_i];
            }
            this.namedLog(models_1.LogLevel.WARNING, message, splat);
        };
        OptimizelyLogger.prototype.error = function (message) {
            var splat = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                splat[_i - 1] = arguments[_i];
            }
            this.namedLog(models_1.LogLevel.ERROR, message, splat);
        };
        OptimizelyLogger.prototype.format = function (data) {
            return "" + (this.messagePrefix ? this.messagePrefix + ': ' : '') + js_sdk_utils_1$1.sprintf.apply(void 0, __spreadArrays([data.message], data.splat));
        };
        OptimizelyLogger.prototype.internalLog = function (level, data) {
            if (!globalLogHandler$1) {
                return;
            }
            if (level < globalLogLevel$1) {
                return;
            }
            globalLogHandler$1.log(level, this.format(data));
            if (data.error && data.error instanceof Error) {
                errorHandler_1.getErrorHandler().handleError(data.error);
            }
        };
        OptimizelyLogger.prototype.namedLog = function (level, message, splat) {
            var error;
            if (message instanceof Error) {
                error = message;
                message = error.message;
                this.internalLog(level, {
                    error: error,
                    message: message,
                    splat: splat,
                });
                return;
            }
            if (splat.length === 0) {
                this.internalLog(level, {
                    message: message,
                    splat: splat,
                });
                return;
            }
            var last = splat[splat.length - 1];
            if (last instanceof Error) {
                error = last;
                splat.splice(-1);
            }
            this.internalLog(level, { message: message, error: error, splat: splat });
        };
        return OptimizelyLogger;
    }());
    var globalLogManager$1 = new DefaultLogManager$1();
    function getLogger$1(name) {
        return globalLogManager$1.getLogger(name);
    }
    logger$e.getLogger = getLogger$1;
    function setLogHandler$1(logger) {
        globalLogHandler$1 = logger;
    }
    logger$e.setLogHandler = setLogHandler$1;
    function setLogLevel$1(level) {
        level = coerceLogLevel$1(level);
        if (!js_sdk_utils_1$1.isValidEnum(models_1.LogLevel, level) || level === undefined) {
            globalLogLevel$1 = models_1.LogLevel.ERROR;
        }
        else {
            globalLogLevel$1 = level;
        }
    }
    logger$e.setLogLevel = setLogLevel$1;
    function getLogLevel() {
        return globalLogLevel$1;
    }
    logger$e.getLogLevel = getLogLevel;
    /**
     * Resets all global logger state to it's original
     */
    function resetLogger() {
        globalLogManager$1 = new DefaultLogManager$1();
        globalLogLevel$1 = models_1.LogLevel.NOTSET;
    }
    logger$e.resetLogger = resetLogger;

    (function (exports) {
    	function __export(m) {
    	    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    	}
    	Object.defineProperty(exports, "__esModule", { value: true });
    	/**
    	 * Copyright 2019, Optimizely
    	 *
    	 * Licensed under the Apache License, Version 2.0 (the "License");
    	 * you may not use this file except in compliance with the License.
    	 * You may obtain a copy of the License at
    	 *
    	 * http://www.apache.org/licenses/LICENSE-2.0
    	 *
    	 * Unless required by applicable law or agreed to in writing, software
    	 * distributed under the License is distributed on an "AS IS" BASIS,
    	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    	 * See the License for the specific language governing permissions and
    	 * limitations under the License.
    	 */
    	__export(errorHandler);
    	__export(models);
    	__export(logger$e);
    } (lib$1));

    var nodeRequest = {};

    var global$1 = (typeof global !== "undefined" ? global :
      typeof self !== "undefined" ? self :
      typeof window !== "undefined" ? window : {});

    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
    var inited = false;
    function init () {
      inited = true;
      var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      for (var i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }

      revLookup['-'.charCodeAt(0)] = 62;
      revLookup['_'.charCodeAt(0)] = 63;
    }

    function toByteArray (b64) {
      if (!inited) {
        init();
      }
      var i, j, l, tmp, placeHolders, arr;
      var len = b64.length;

      if (len % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4')
      }

      // the number of equal signs (place holders)
      // if there are two placeholders, than the two characters before it
      // represent one byte
      // if there is only one, then the three characters before it represent 2 bytes
      // this is just a cheap hack to not do indexOf twice
      placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

      // base64 is 4/3 + up to two characters of the original data
      arr = new Arr(len * 3 / 4 - placeHolders);

      // if there are placeholders, only get up to the last complete 4 chars
      l = placeHolders > 0 ? len - 4 : len;

      var L = 0;

      for (i = 0, j = 0; i < l; i += 4, j += 3) {
        tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
        arr[L++] = (tmp >> 16) & 0xFF;
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      if (placeHolders === 2) {
        tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
        arr[L++] = tmp & 0xFF;
      } else if (placeHolders === 1) {
        tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      return arr
    }

    function tripletToBase64 (num) {
      return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
    }

    function encodeChunk (uint8, start, end) {
      var tmp;
      var output = [];
      for (var i = start; i < end; i += 3) {
        tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
        output.push(tripletToBase64(tmp));
      }
      return output.join('')
    }

    function fromByteArray (uint8) {
      if (!inited) {
        init();
      }
      var tmp;
      var len = uint8.length;
      var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
      var output = '';
      var parts = [];
      var maxChunkLength = 16383; // must be multiple of 3

      // go through the array every three bytes, we'll deal with trailing stuff later
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
        parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
      }

      // pad the end with zeros, but make sure to not forget the extra bytes
      if (extraBytes === 1) {
        tmp = uint8[len - 1];
        output += lookup[tmp >> 2];
        output += lookup[(tmp << 4) & 0x3F];
        output += '==';
      } else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
        output += lookup[tmp >> 10];
        output += lookup[(tmp >> 4) & 0x3F];
        output += lookup[(tmp << 2) & 0x3F];
        output += '=';
      }

      parts.push(output);

      return parts.join('')
    }

    function read (buffer, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? (nBytes - 1) : 0;
      var d = isLE ? -1 : 1;
      var s = buffer[offset + i];

      i += d;

      e = s & ((1 << (-nBits)) - 1);
      s >>= (-nBits);
      nBits += eLen;
      for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      m = e & ((1 << (-nBits)) - 1);
      e >>= (-nBits);
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity)
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
    }

    function write (buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
      var i = isLE ? 0 : (nBytes - 1);
      var d = isLE ? 1 : -1;
      var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

      value = Math.abs(value);

      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }

        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }

      for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

      e = (e << mLen) | m;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

      buffer[offset + i - d] |= s * 128;
    }

    var toString = {}.toString;

    var isArray$2 = Array.isArray || function (arr) {
      return toString.call(arr) == '[object Array]';
    };

    /*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
     * @license  MIT
     */

    var INSPECT_MAX_BYTES = 50;

    /**
     * If `Buffer.TYPED_ARRAY_SUPPORT`:
     *   === true    Use Uint8Array implementation (fastest)
     *   === false   Use Object implementation (most compatible, even IE6)
     *
     * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
     * Opera 11.6+, iOS 4.2+.
     *
     * Due to various browser bugs, sometimes the Object implementation will be used even
     * when the browser supports typed arrays.
     *
     * Note:
     *
     *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
     *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
     *
     *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
     *
     *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
     *     incorrect length in some situations.

     * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
     * get the Object implementation, which is slower but behaves correctly.
     */
    Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
      ? global$1.TYPED_ARRAY_SUPPORT
      : true;

    /*
     * Export kMaxLength after typed array support is determined.
     */
    kMaxLength();

    function kMaxLength () {
      return Buffer.TYPED_ARRAY_SUPPORT
        ? 0x7fffffff
        : 0x3fffffff
    }

    function createBuffer (that, length) {
      if (kMaxLength() < length) {
        throw new RangeError('Invalid typed array length')
      }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = new Uint8Array(length);
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        if (that === null) {
          that = new Buffer(length);
        }
        that.length = length;
      }

      return that
    }

    /**
     * The Buffer constructor returns instances of `Uint8Array` that have their
     * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
     * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
     * and the `Uint8Array` methods. Square bracket notation works as expected -- it
     * returns a single octet.
     *
     * The `Uint8Array` prototype remains unmodified.
     */

    function Buffer (arg, encodingOrOffset, length) {
      if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
        return new Buffer(arg, encodingOrOffset, length)
      }

      // Common case.
      if (typeof arg === 'number') {
        if (typeof encodingOrOffset === 'string') {
          throw new Error(
            'If encoding is specified then the first argument must be a string'
          )
        }
        return allocUnsafe(this, arg)
      }
      return from(this, arg, encodingOrOffset, length)
    }

    Buffer.poolSize = 8192; // not used by this implementation

    // TODO: Legacy, not needed anymore. Remove in next major version.
    Buffer._augment = function (arr) {
      arr.__proto__ = Buffer.prototype;
      return arr
    };

    function from (that, value, encodingOrOffset, length) {
      if (typeof value === 'number') {
        throw new TypeError('"value" argument must not be a number')
      }

      if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
        return fromArrayBuffer(that, value, encodingOrOffset, length)
      }

      if (typeof value === 'string') {
        return fromString(that, value, encodingOrOffset)
      }

      return fromObject(that, value)
    }

    /**
     * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
     * if value is a number.
     * Buffer.from(str[, encoding])
     * Buffer.from(array)
     * Buffer.from(buffer)
     * Buffer.from(arrayBuffer[, byteOffset[, length]])
     **/
    Buffer.from = function (value, encodingOrOffset, length) {
      return from(null, value, encodingOrOffset, length)
    };

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      Buffer.prototype.__proto__ = Uint8Array.prototype;
      Buffer.__proto__ = Uint8Array;
    }

    function assertSize (size) {
      if (typeof size !== 'number') {
        throw new TypeError('"size" argument must be a number')
      } else if (size < 0) {
        throw new RangeError('"size" argument must not be negative')
      }
    }

    function alloc (that, size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(that, size)
      }
      if (fill !== undefined) {
        // Only pay attention to encoding if it's a string. This
        // prevents accidentally sending in a number that would
        // be interpretted as a start offset.
        return typeof encoding === 'string'
          ? createBuffer(that, size).fill(fill, encoding)
          : createBuffer(that, size).fill(fill)
      }
      return createBuffer(that, size)
    }

    /**
     * Creates a new filled Buffer instance.
     * alloc(size[, fill[, encoding]])
     **/
    Buffer.alloc = function (size, fill, encoding) {
      return alloc(null, size, fill, encoding)
    };

    function allocUnsafe (that, size) {
      assertSize(size);
      that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
      if (!Buffer.TYPED_ARRAY_SUPPORT) {
        for (var i = 0; i < size; ++i) {
          that[i] = 0;
        }
      }
      return that
    }

    /**
     * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
     * */
    Buffer.allocUnsafe = function (size) {
      return allocUnsafe(null, size)
    };
    /**
     * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
     */
    Buffer.allocUnsafeSlow = function (size) {
      return allocUnsafe(null, size)
    };

    function fromString (that, string, encoding) {
      if (typeof encoding !== 'string' || encoding === '') {
        encoding = 'utf8';
      }

      if (!Buffer.isEncoding(encoding)) {
        throw new TypeError('"encoding" must be a valid string encoding')
      }

      var length = byteLength(string, encoding) | 0;
      that = createBuffer(that, length);

      var actual = that.write(string, encoding);

      if (actual !== length) {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        that = that.slice(0, actual);
      }

      return that
    }

    function fromArrayLike (that, array) {
      var length = array.length < 0 ? 0 : checked(array.length) | 0;
      that = createBuffer(that, length);
      for (var i = 0; i < length; i += 1) {
        that[i] = array[i] & 255;
      }
      return that
    }

    function fromArrayBuffer (that, array, byteOffset, length) {
      array.byteLength; // this throws if `array` is not a valid ArrayBuffer

      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('\'offset\' is out of bounds')
      }

      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('\'length\' is out of bounds')
      }

      if (byteOffset === undefined && length === undefined) {
        array = new Uint8Array(array);
      } else if (length === undefined) {
        array = new Uint8Array(array, byteOffset);
      } else {
        array = new Uint8Array(array, byteOffset, length);
      }

      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = array;
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        that = fromArrayLike(that, array);
      }
      return that
    }

    function fromObject (that, obj) {
      if (internalIsBuffer(obj)) {
        var len = checked(obj.length) | 0;
        that = createBuffer(that, len);

        if (that.length === 0) {
          return that
        }

        obj.copy(that, 0, 0, len);
        return that
      }

      if (obj) {
        if ((typeof ArrayBuffer !== 'undefined' &&
            obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
          if (typeof obj.length !== 'number' || isnan(obj.length)) {
            return createBuffer(that, 0)
          }
          return fromArrayLike(that, obj)
        }

        if (obj.type === 'Buffer' && isArray$2(obj.data)) {
          return fromArrayLike(that, obj.data)
        }
      }

      throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
    }

    function checked (length) {
      // Note: cannot use `length < kMaxLength()` here because that fails when
      // length is NaN (which is otherwise coerced to zero.)
      if (length >= kMaxLength()) {
        throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                             'size: 0x' + kMaxLength().toString(16) + ' bytes')
      }
      return length | 0
    }
    Buffer.isBuffer = isBuffer;
    function internalIsBuffer (b) {
      return !!(b != null && b._isBuffer)
    }

    Buffer.compare = function compare (a, b) {
      if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
        throw new TypeError('Arguments must be Buffers')
      }

      if (a === b) return 0

      var x = a.length;
      var y = b.length;

      for (var i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
          x = a[i];
          y = b[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    Buffer.isEncoding = function isEncoding (encoding) {
      switch (String(encoding).toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'latin1':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return true
        default:
          return false
      }
    };

    Buffer.concat = function concat (list, length) {
      if (!isArray$2(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }

      if (list.length === 0) {
        return Buffer.alloc(0)
      }

      var i;
      if (length === undefined) {
        length = 0;
        for (i = 0; i < list.length; ++i) {
          length += list[i].length;
        }
      }

      var buffer = Buffer.allocUnsafe(length);
      var pos = 0;
      for (i = 0; i < list.length; ++i) {
        var buf = list[i];
        if (!internalIsBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers')
        }
        buf.copy(buffer, pos);
        pos += buf.length;
      }
      return buffer
    };

    function byteLength (string, encoding) {
      if (internalIsBuffer(string)) {
        return string.length
      }
      if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
          (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
        return string.byteLength
      }
      if (typeof string !== 'string') {
        string = '' + string;
      }

      var len = string.length;
      if (len === 0) return 0

      // Use a for loop to avoid recursion
      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'ascii':
          case 'latin1':
          case 'binary':
            return len
          case 'utf8':
          case 'utf-8':
          case undefined:
            return utf8ToBytes(string).length
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return len * 2
          case 'hex':
            return len >>> 1
          case 'base64':
            return base64ToBytes(string).length
          default:
            if (loweredCase) return utf8ToBytes(string).length // assume utf8
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer.byteLength = byteLength;

    function slowToString (encoding, start, end) {
      var loweredCase = false;

      // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
      // property of a typed array.

      // This behaves neither like String nor Uint8Array in that we set start/end
      // to their upper/lower bounds if the value passed is out of range.
      // undefined is handled specially as per ECMA-262 6th Edition,
      // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
      if (start === undefined || start < 0) {
        start = 0;
      }
      // Return early if start > this.length. Done here to prevent potential uint32
      // coercion fail below.
      if (start > this.length) {
        return ''
      }

      if (end === undefined || end > this.length) {
        end = this.length;
      }

      if (end <= 0) {
        return ''
      }

      // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
      end >>>= 0;
      start >>>= 0;

      if (end <= start) {
        return ''
      }

      if (!encoding) encoding = 'utf8';

      while (true) {
        switch (encoding) {
          case 'hex':
            return hexSlice(this, start, end)

          case 'utf8':
          case 'utf-8':
            return utf8Slice(this, start, end)

          case 'ascii':
            return asciiSlice(this, start, end)

          case 'latin1':
          case 'binary':
            return latin1Slice(this, start, end)

          case 'base64':
            return base64Slice(this, start, end)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return utf16leSlice(this, start, end)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = (encoding + '').toLowerCase();
            loweredCase = true;
        }
      }
    }

    // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
    // Buffer instances.
    Buffer.prototype._isBuffer = true;

    function swap (b, n, m) {
      var i = b[n];
      b[n] = b[m];
      b[m] = i;
    }

    Buffer.prototype.swap16 = function swap16 () {
      var len = this.length;
      if (len % 2 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 16-bits')
      }
      for (var i = 0; i < len; i += 2) {
        swap(this, i, i + 1);
      }
      return this
    };

    Buffer.prototype.swap32 = function swap32 () {
      var len = this.length;
      if (len % 4 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 32-bits')
      }
      for (var i = 0; i < len; i += 4) {
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
      }
      return this
    };

    Buffer.prototype.swap64 = function swap64 () {
      var len = this.length;
      if (len % 8 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 64-bits')
      }
      for (var i = 0; i < len; i += 8) {
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
      }
      return this
    };

    Buffer.prototype.toString = function toString () {
      var length = this.length | 0;
      if (length === 0) return ''
      if (arguments.length === 0) return utf8Slice(this, 0, length)
      return slowToString.apply(this, arguments)
    };

    Buffer.prototype.equals = function equals (b) {
      if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
      if (this === b) return true
      return Buffer.compare(this, b) === 0
    };

    Buffer.prototype.inspect = function inspect () {
      var str = '';
      var max = INSPECT_MAX_BYTES;
      if (this.length > 0) {
        str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
        if (this.length > max) str += ' ... ';
      }
      return '<Buffer ' + str + '>'
    };

    Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
      if (!internalIsBuffer(target)) {
        throw new TypeError('Argument must be a Buffer')
      }

      if (start === undefined) {
        start = 0;
      }
      if (end === undefined) {
        end = target ? target.length : 0;
      }
      if (thisStart === undefined) {
        thisStart = 0;
      }
      if (thisEnd === undefined) {
        thisEnd = this.length;
      }

      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError('out of range index')
      }

      if (thisStart >= thisEnd && start >= end) {
        return 0
      }
      if (thisStart >= thisEnd) {
        return -1
      }
      if (start >= end) {
        return 1
      }

      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;

      if (this === target) return 0

      var x = thisEnd - thisStart;
      var y = end - start;
      var len = Math.min(x, y);

      var thisCopy = this.slice(thisStart, thisEnd);
      var targetCopy = target.slice(start, end);

      for (var i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i];
          y = targetCopy[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
    // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
    //
    // Arguments:
    // - buffer - a Buffer to search
    // - val - a string, Buffer, or number
    // - byteOffset - an index into `buffer`; will be clamped to an int32
    // - encoding - an optional encoding, relevant is val is a string
    // - dir - true for indexOf, false for lastIndexOf
    function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
      // Empty buffer means no match
      if (buffer.length === 0) return -1

      // Normalize byteOffset
      if (typeof byteOffset === 'string') {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 0x7fffffff) {
        byteOffset = 0x7fffffff;
      } else if (byteOffset < -0x80000000) {
        byteOffset = -0x80000000;
      }
      byteOffset = +byteOffset;  // Coerce to Number.
      if (isNaN(byteOffset)) {
        // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
        byteOffset = dir ? 0 : (buffer.length - 1);
      }

      // Normalize byteOffset: negative offsets start from the end of the buffer
      if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
      if (byteOffset >= buffer.length) {
        if (dir) return -1
        else byteOffset = buffer.length - 1;
      } else if (byteOffset < 0) {
        if (dir) byteOffset = 0;
        else return -1
      }

      // Normalize val
      if (typeof val === 'string') {
        val = Buffer.from(val, encoding);
      }

      // Finally, search either indexOf (if dir is true) or lastIndexOf
      if (internalIsBuffer(val)) {
        // Special case: looking for empty string/buffer always fails
        if (val.length === 0) {
          return -1
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
      } else if (typeof val === 'number') {
        val = val & 0xFF; // Search for a byte value [0-255]
        if (Buffer.TYPED_ARRAY_SUPPORT &&
            typeof Uint8Array.prototype.indexOf === 'function') {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
          }
        }
        return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
      }

      throw new TypeError('val must be string, number or Buffer')
    }

    function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
      var indexSize = 1;
      var arrLength = arr.length;
      var valLength = val.length;

      if (encoding !== undefined) {
        encoding = String(encoding).toLowerCase();
        if (encoding === 'ucs2' || encoding === 'ucs-2' ||
            encoding === 'utf16le' || encoding === 'utf-16le') {
          if (arr.length < 2 || val.length < 2) {
            return -1
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }

      function read (buf, i) {
        if (indexSize === 1) {
          return buf[i]
        } else {
          return buf.readUInt16BE(i * indexSize)
        }
      }

      var i;
      if (dir) {
        var foundIndex = -1;
        for (i = byteOffset; i < arrLength; i++) {
          if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
            if (foundIndex === -1) foundIndex = i;
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
          } else {
            if (foundIndex !== -1) i -= i - foundIndex;
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
        for (i = byteOffset; i >= 0; i--) {
          var found = true;
          for (var j = 0; j < valLength; j++) {
            if (read(arr, i + j) !== read(val, j)) {
              found = false;
              break
            }
          }
          if (found) return i
        }
      }

      return -1
    }

    Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1
    };

    Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
    };

    Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
    };

    function hexWrite (buf, string, offset, length) {
      offset = Number(offset) || 0;
      var remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }

      // must be an even number of digits
      var strLen = string.length;
      if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

      if (length > strLen / 2) {
        length = strLen / 2;
      }
      for (var i = 0; i < length; ++i) {
        var parsed = parseInt(string.substr(i * 2, 2), 16);
        if (isNaN(parsed)) return i
        buf[offset + i] = parsed;
      }
      return i
    }

    function utf8Write (buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
    }

    function asciiWrite (buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length)
    }

    function latin1Write (buf, string, offset, length) {
      return asciiWrite(buf, string, offset, length)
    }

    function base64Write (buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length)
    }

    function ucs2Write (buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
    }

    Buffer.prototype.write = function write (string, offset, length, encoding) {
      // Buffer#write(string)
      if (offset === undefined) {
        encoding = 'utf8';
        length = this.length;
        offset = 0;
      // Buffer#write(string, encoding)
      } else if (length === undefined && typeof offset === 'string') {
        encoding = offset;
        length = this.length;
        offset = 0;
      // Buffer#write(string, offset[, length][, encoding])
      } else if (isFinite(offset)) {
        offset = offset | 0;
        if (isFinite(length)) {
          length = length | 0;
          if (encoding === undefined) encoding = 'utf8';
        } else {
          encoding = length;
          length = undefined;
        }
      // legacy write(string, encoding, offset, length) - remove in v0.13
      } else {
        throw new Error(
          'Buffer.write(string, encoding, offset[, length]) is no longer supported'
        )
      }

      var remaining = this.length - offset;
      if (length === undefined || length > remaining) length = remaining;

      if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
        throw new RangeError('Attempt to write outside buffer bounds')
      }

      if (!encoding) encoding = 'utf8';

      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'hex':
            return hexWrite(this, string, offset, length)

          case 'utf8':
          case 'utf-8':
            return utf8Write(this, string, offset, length)

          case 'ascii':
            return asciiWrite(this, string, offset, length)

          case 'latin1':
          case 'binary':
            return latin1Write(this, string, offset, length)

          case 'base64':
            // Warning: maxLength not taken into account in base64Write
            return base64Write(this, string, offset, length)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return ucs2Write(this, string, offset, length)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };

    Buffer.prototype.toJSON = function toJSON () {
      return {
        type: 'Buffer',
        data: Array.prototype.slice.call(this._arr || this, 0)
      }
    };

    function base64Slice (buf, start, end) {
      if (start === 0 && end === buf.length) {
        return fromByteArray(buf)
      } else {
        return fromByteArray(buf.slice(start, end))
      }
    }

    function utf8Slice (buf, start, end) {
      end = Math.min(buf.length, end);
      var res = [];

      var i = start;
      while (i < end) {
        var firstByte = buf[i];
        var codePoint = null;
        var bytesPerSequence = (firstByte > 0xEF) ? 4
          : (firstByte > 0xDF) ? 3
          : (firstByte > 0xBF) ? 2
          : 1;

        if (i + bytesPerSequence <= end) {
          var secondByte, thirdByte, fourthByte, tempCodePoint;

          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 0x80) {
                codePoint = firstByte;
              }
              break
            case 2:
              secondByte = buf[i + 1];
              if ((secondByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
                if (tempCodePoint > 0x7F) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 3:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
                if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 4:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              fourthByte = buf[i + 3];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
                if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }

        if (codePoint === null) {
          // we did not generate a valid codePoint so insert a
          // replacement char (U+FFFD) and advance only 1 byte
          codePoint = 0xFFFD;
          bytesPerSequence = 1;
        } else if (codePoint > 0xFFFF) {
          // encode to utf16 (surrogate pair dance)
          codePoint -= 0x10000;
          res.push(codePoint >>> 10 & 0x3FF | 0xD800);
          codePoint = 0xDC00 | codePoint & 0x3FF;
        }

        res.push(codePoint);
        i += bytesPerSequence;
      }

      return decodeCodePointsArray(res)
    }

    // Based on http://stackoverflow.com/a/22747272/680742, the browser with
    // the lowest limit is Chrome, with 0x10000 args.
    // We go 1 magnitude less, for safety
    var MAX_ARGUMENTS_LENGTH = 0x1000;

    function decodeCodePointsArray (codePoints) {
      var len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
      }

      // Decode in chunks to avoid "call stack size exceeded".
      var res = '';
      var i = 0;
      while (i < len) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
        );
      }
      return res
    }

    function asciiSlice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i] & 0x7F);
      }
      return ret
    }

    function latin1Slice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i]);
      }
      return ret
    }

    function hexSlice (buf, start, end) {
      var len = buf.length;

      if (!start || start < 0) start = 0;
      if (!end || end < 0 || end > len) end = len;

      var out = '';
      for (var i = start; i < end; ++i) {
        out += toHex(buf[i]);
      }
      return out
    }

    function utf16leSlice (buf, start, end) {
      var bytes = buf.slice(start, end);
      var res = '';
      for (var i = 0; i < bytes.length; i += 2) {
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
      }
      return res
    }

    Buffer.prototype.slice = function slice (start, end) {
      var len = this.length;
      start = ~~start;
      end = end === undefined ? len : ~~end;

      if (start < 0) {
        start += len;
        if (start < 0) start = 0;
      } else if (start > len) {
        start = len;
      }

      if (end < 0) {
        end += len;
        if (end < 0) end = 0;
      } else if (end > len) {
        end = len;
      }

      if (end < start) end = start;

      var newBuf;
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        newBuf = this.subarray(start, end);
        newBuf.__proto__ = Buffer.prototype;
      } else {
        var sliceLen = end - start;
        newBuf = new Buffer(sliceLen, undefined);
        for (var i = 0; i < sliceLen; ++i) {
          newBuf[i] = this[i + start];
        }
      }

      return newBuf
    };

    /*
     * Need to make sure that buffer isn't trying to write out of bounds.
     */
    function checkOffset (offset, ext, length) {
      if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
      if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
    }

    Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }

      return val
    };

    Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        checkOffset(offset, byteLength, this.length);
      }

      var val = this[offset + --byteLength];
      var mul = 1;
      while (byteLength > 0 && (mul *= 0x100)) {
        val += this[offset + --byteLength] * mul;
      }

      return val
    };

    Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 1, this.length);
      return this[offset]
    };

    Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] | (this[offset + 1] << 8)
    };

    Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      return (this[offset] << 8) | this[offset + 1]
    };

    Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return ((this[offset]) |
          (this[offset + 1] << 8) |
          (this[offset + 2] << 16)) +
          (this[offset + 3] * 0x1000000)
    };

    Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] * 0x1000000) +
        ((this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        this[offset + 3])
    };

    Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var i = byteLength;
      var mul = 1;
      var val = this[offset + --i];
      while (i > 0 && (mul *= 0x100)) {
        val += this[offset + --i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 1, this.length);
      if (!(this[offset] & 0x80)) return (this[offset])
      return ((0xff - this[offset] + 1) * -1)
    };

    Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      var val = this[offset] | (this[offset + 1] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      var val = this[offset + 1] | (this[offset] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16) |
        (this[offset + 3] << 24)
    };

    Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] << 24) |
        (this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        (this[offset + 3])
    };

    Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);
      return read(this, offset, true, 23, 4)
    };

    Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);
      return read(this, offset, false, 23, 4)
    };

    Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 8, this.length);
      return read(this, offset, true, 52, 8)
    };

    Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 8, this.length);
      return read(this, offset, false, 52, 8)
    };

    function checkInt (buf, value, offset, ext, max, min) {
      if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
      if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
    }

    Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var mul = 1;
      var i = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var i = byteLength - 1;
      var mul = 1;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
      if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
      this[offset] = (value & 0xff);
      return offset + 1
    };

    function objectWriteUInt16 (buf, value, offset, littleEndian) {
      if (value < 0) value = 0xffff + value + 1;
      for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
        buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
          (littleEndian ? i : 1 - i) * 8;
      }
    }

    Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    function objectWriteUInt32 (buf, value, offset, littleEndian) {
      if (value < 0) value = 0xffffffff + value + 1;
      for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
        buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
      }
    }

    Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset + 3] = (value >>> 24);
        this[offset + 2] = (value >>> 16);
        this[offset + 1] = (value >>> 8);
        this[offset] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = 0;
      var mul = 1;
      var sub = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = byteLength - 1;
      var mul = 1;
      var sub = 0;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
      if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
      if (value < 0) value = 0xff + value + 1;
      this[offset] = (value & 0xff);
      return offset + 1
    };

    Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
        this[offset + 2] = (value >>> 16);
        this[offset + 3] = (value >>> 24);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      if (value < 0) value = 0xffffffff + value + 1;
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    function checkIEEE754 (buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
      if (offset < 0) throw new RangeError('Index out of range')
    }

    function writeFloat (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4);
      }
      write(buf, value, offset, littleEndian, 23, 4);
      return offset + 4
    }

    Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert)
    };

    function writeDouble (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8);
      }
      write(buf, value, offset, littleEndian, 52, 8);
      return offset + 8
    }

    Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert)
    };

    // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
    Buffer.prototype.copy = function copy (target, targetStart, start, end) {
      if (!start) start = 0;
      if (!end && end !== 0) end = this.length;
      if (targetStart >= target.length) targetStart = target.length;
      if (!targetStart) targetStart = 0;
      if (end > 0 && end < start) end = start;

      // Copy 0 bytes; we're done
      if (end === start) return 0
      if (target.length === 0 || this.length === 0) return 0

      // Fatal error conditions
      if (targetStart < 0) {
        throw new RangeError('targetStart out of bounds')
      }
      if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
      if (end < 0) throw new RangeError('sourceEnd out of bounds')

      // Are we oob?
      if (end > this.length) end = this.length;
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }

      var len = end - start;
      var i;

      if (this === target && start < targetStart && targetStart < end) {
        // descending copy from end
        for (i = len - 1; i >= 0; --i) {
          target[i + targetStart] = this[i + start];
        }
      } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
        // ascending copy from start
        for (i = 0; i < len; ++i) {
          target[i + targetStart] = this[i + start];
        }
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, start + len),
          targetStart
        );
      }

      return len
    };

    // Usage:
    //    buffer.fill(number[, offset[, end]])
    //    buffer.fill(buffer[, offset[, end]])
    //    buffer.fill(string[, offset[, end]][, encoding])
    Buffer.prototype.fill = function fill (val, start, end, encoding) {
      // Handle string cases:
      if (typeof val === 'string') {
        if (typeof start === 'string') {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === 'string') {
          encoding = end;
          end = this.length;
        }
        if (val.length === 1) {
          var code = val.charCodeAt(0);
          if (code < 256) {
            val = code;
          }
        }
        if (encoding !== undefined && typeof encoding !== 'string') {
          throw new TypeError('encoding must be a string')
        }
        if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
          throw new TypeError('Unknown encoding: ' + encoding)
        }
      } else if (typeof val === 'number') {
        val = val & 255;
      }

      // Invalid ranges are not set to a default, so can range check early.
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError('Out of range index')
      }

      if (end <= start) {
        return this
      }

      start = start >>> 0;
      end = end === undefined ? this.length : end >>> 0;

      if (!val) val = 0;

      var i;
      if (typeof val === 'number') {
        for (i = start; i < end; ++i) {
          this[i] = val;
        }
      } else {
        var bytes = internalIsBuffer(val)
          ? val
          : utf8ToBytes(new Buffer(val, encoding).toString());
        var len = bytes.length;
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len];
        }
      }

      return this
    };

    // HELPER FUNCTIONS
    // ================

    var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

    function base64clean (str) {
      // Node strips out invalid characters like \n and \t from the string, base64-js does not
      str = stringtrim(str).replace(INVALID_BASE64_RE, '');
      // Node converts strings with length < 2 to ''
      if (str.length < 2) return ''
      // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
      while (str.length % 4 !== 0) {
        str = str + '=';
      }
      return str
    }

    function stringtrim (str) {
      if (str.trim) return str.trim()
      return str.replace(/^\s+|\s+$/g, '')
    }

    function toHex (n) {
      if (n < 16) return '0' + n.toString(16)
      return n.toString(16)
    }

    function utf8ToBytes (string, units) {
      units = units || Infinity;
      var codePoint;
      var length = string.length;
      var leadSurrogate = null;
      var bytes = [];

      for (var i = 0; i < length; ++i) {
        codePoint = string.charCodeAt(i);

        // is surrogate component
        if (codePoint > 0xD7FF && codePoint < 0xE000) {
          // last char was a lead
          if (!leadSurrogate) {
            // no lead yet
            if (codePoint > 0xDBFF) {
              // unexpected trail
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            } else if (i + 1 === length) {
              // unpaired lead
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            }

            // valid lead
            leadSurrogate = codePoint;

            continue
          }

          // 2 leads in a row
          if (codePoint < 0xDC00) {
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            leadSurrogate = codePoint;
            continue
          }

          // valid surrogate pair
          codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
        } else if (leadSurrogate) {
          // valid bmp char, but last char was a lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        }

        leadSurrogate = null;

        // encode utf8
        if (codePoint < 0x80) {
          if ((units -= 1) < 0) break
          bytes.push(codePoint);
        } else if (codePoint < 0x800) {
          if ((units -= 2) < 0) break
          bytes.push(
            codePoint >> 0x6 | 0xC0,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x10000) {
          if ((units -= 3) < 0) break
          bytes.push(
            codePoint >> 0xC | 0xE0,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x110000) {
          if ((units -= 4) < 0) break
          bytes.push(
            codePoint >> 0x12 | 0xF0,
            codePoint >> 0xC & 0x3F | 0x80,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else {
          throw new Error('Invalid code point')
        }
      }

      return bytes
    }

    function asciiToBytes (str) {
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 0xFF);
      }
      return byteArray
    }

    function utf16leToBytes (str, units) {
      var c, hi, lo;
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0) break

        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }

      return byteArray
    }


    function base64ToBytes (str) {
      return toByteArray(base64clean(str))
    }

    function blitBuffer (src, dst, offset, length) {
      for (var i = 0; i < length; ++i) {
        if ((i + offset >= dst.length) || (i >= src.length)) break
        dst[i + offset] = src[i];
      }
      return i
    }

    function isnan (val) {
      return val !== val // eslint-disable-line no-self-compare
    }


    // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
    // The _isBuffer check is for Safari 5-7 support, because it's missing
    // Object.prototype.constructor. Remove this eventually
    function isBuffer(obj) {
      return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
    }

    function isFastBuffer (obj) {
      return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
    }

    // For Node v0.10 support. Remove this eventually.
    function isSlowBuffer (obj) {
      return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
    }

    // shim for using process in browser
    // based off https://github.com/defunctzombie/node-process/blob/master/browser.js

    function defaultSetTimout() {
        throw new Error('setTimeout has not been defined');
    }
    function defaultClearTimeout () {
        throw new Error('clearTimeout has not been defined');
    }
    var cachedSetTimeout = defaultSetTimout;
    var cachedClearTimeout = defaultClearTimeout;
    if (typeof global$1.setTimeout === 'function') {
        cachedSetTimeout = setTimeout;
    }
    if (typeof global$1.clearTimeout === 'function') {
        cachedClearTimeout = clearTimeout;
    }

    function runTimeout(fun) {
        if (cachedSetTimeout === setTimeout) {
            //normal enviroments in sane situations
            return setTimeout(fun, 0);
        }
        // if setTimeout wasn't available but was latter defined
        if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
            cachedSetTimeout = setTimeout;
            return setTimeout(fun, 0);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedSetTimeout(fun, 0);
        } catch(e){
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                return cachedSetTimeout.call(null, fun, 0);
            } catch(e){
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                return cachedSetTimeout.call(this, fun, 0);
            }
        }


    }
    function runClearTimeout(marker) {
        if (cachedClearTimeout === clearTimeout) {
            //normal enviroments in sane situations
            return clearTimeout(marker);
        }
        // if clearTimeout wasn't available but was latter defined
        if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
            cachedClearTimeout = clearTimeout;
            return clearTimeout(marker);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedClearTimeout(marker);
        } catch (e){
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                return cachedClearTimeout.call(null, marker);
            } catch (e){
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                return cachedClearTimeout.call(this, marker);
            }
        }



    }
    var queue = [];
    var draining = false;
    var currentQueue;
    var queueIndex = -1;

    function cleanUpNextTick() {
        if (!draining || !currentQueue) {
            return;
        }
        draining = false;
        if (currentQueue.length) {
            queue = currentQueue.concat(queue);
        } else {
            queueIndex = -1;
        }
        if (queue.length) {
            drainQueue();
        }
    }

    function drainQueue() {
        if (draining) {
            return;
        }
        var timeout = runTimeout(cleanUpNextTick);
        draining = true;

        var len = queue.length;
        while(len) {
            currentQueue = queue;
            queue = [];
            while (++queueIndex < len) {
                if (currentQueue) {
                    currentQueue[queueIndex].run();
                }
            }
            queueIndex = -1;
            len = queue.length;
        }
        currentQueue = null;
        draining = false;
        runClearTimeout(timeout);
    }
    function nextTick(fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
                args[i - 1] = arguments[i];
            }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
            runTimeout(drainQueue);
        }
    }
    // v8 likes predictible objects
    function Item(fun, array) {
        this.fun = fun;
        this.array = array;
    }
    Item.prototype.run = function () {
        this.fun.apply(null, this.array);
    };
    var title = 'browser';
    var platform = 'browser';
    var browser = true;
    var env = {};
    var argv = [];
    var version = ''; // empty string to avoid regexp issues
    var versions = {};
    var release = {};
    var config$1 = {};

    function noop() {}

    var on = noop;
    var addListener = noop;
    var once = noop;
    var off = noop;
    var removeListener = noop;
    var removeAllListeners = noop;
    var emit = noop;

    function binding$1(name) {
        throw new Error('process.binding is not supported');
    }

    function cwd () { return '/' }
    function chdir (dir) {
        throw new Error('process.chdir is not supported');
    }function umask() { return 0; }

    // from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
    var performance = global$1.performance || {};
    var performanceNow =
      performance.now        ||
      performance.mozNow     ||
      performance.msNow      ||
      performance.oNow       ||
      performance.webkitNow  ||
      function(){ return (new Date()).getTime() };

    // generate timestamp or delta
    // see http://nodejs.org/api/process.html#process_process_hrtime
    function hrtime(previousTimestamp){
      var clocktime = performanceNow.call(performance)*1e-3;
      var seconds = Math.floor(clocktime);
      var nanoseconds = Math.floor((clocktime%1)*1e9);
      if (previousTimestamp) {
        seconds = seconds - previousTimestamp[0];
        nanoseconds = nanoseconds - previousTimestamp[1];
        if (nanoseconds<0) {
          seconds--;
          nanoseconds += 1e9;
        }
      }
      return [seconds,nanoseconds]
    }

    var startTime = new Date();
    function uptime() {
      var currentTime = new Date();
      var dif = currentTime - startTime;
      return dif / 1000;
    }

    var browser$1 = {
      nextTick: nextTick,
      title: title,
      browser: browser,
      env: env,
      argv: argv,
      version: version,
      versions: versions,
      on: on,
      addListener: addListener,
      once: once,
      off: off,
      removeListener: removeListener,
      removeAllListeners: removeAllListeners,
      emit: emit,
      binding: binding$1,
      cwd: cwd,
      chdir: chdir,
      umask: umask,
      hrtime: hrtime,
      platform: platform,
      release: release,
      config: config$1,
      uptime: uptime
    };

    var hasFetch = isFunction$1(global$1.fetch) && isFunction$1(global$1.ReadableStream);

    var _blobConstructor;
    function blobConstructor() {
      if (typeof _blobConstructor !== 'undefined') {
        return _blobConstructor;
      }
      try {
        new global$1.Blob([new ArrayBuffer(1)]);
        _blobConstructor = true;
      } catch (e) {
        _blobConstructor = false;
      }
      return _blobConstructor
    }
    var xhr;

    function checkTypeSupport(type) {
      if (!xhr) {
        xhr = new global$1.XMLHttpRequest();
        // If location.host is empty, e.g. if this page/worker was loaded
        // from a Blob, then use example.com to avoid an error
        xhr.open('GET', global$1.location.host ? '/' : 'https://example.com');
      }
      try {
        xhr.responseType = type;
        return xhr.responseType === type
      } catch (e) {
        return false
      }

    }

    // For some strange reason, Safari 7.0 reports typeof global.ArrayBuffer === 'object'.
    // Safari 7.1 appears to have fixed this bug.
    var haveArrayBuffer = typeof global$1.ArrayBuffer !== 'undefined';
    var haveSlice = haveArrayBuffer && isFunction$1(global$1.ArrayBuffer.prototype.slice);

    var arraybuffer = haveArrayBuffer && checkTypeSupport('arraybuffer');
      // These next two tests unavoidably show warnings in Chrome. Since fetch will always
      // be used if it's available, just return false for these to avoid the warnings.
    var msstream = !hasFetch && haveSlice && checkTypeSupport('ms-stream');
    var mozchunkedarraybuffer = !hasFetch && haveArrayBuffer &&
      checkTypeSupport('moz-chunked-arraybuffer');
    var overrideMimeType = isFunction$1(xhr.overrideMimeType);
    var vbArray = isFunction$1(global$1.VBArray);

    function isFunction$1(value) {
      return typeof value === 'function'
    }

    xhr = null; // Help gc

    var inherits;
    if (typeof Object.create === 'function'){
      inherits = function inherits(ctor, superCtor) {
        // implementation from standard node.js 'util' module
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      };
    } else {
      inherits = function inherits(ctor, superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function () {};
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      };
    }
    var inherits$1 = inherits;

    var formatRegExp = /%[sdj%]/g;
    function format$1(f) {
      if (!isString(f)) {
        var objects = [];
        for (var i = 0; i < arguments.length; i++) {
          objects.push(inspect(arguments[i]));
        }
        return objects.join(' ');
      }

      var i = 1;
      var args = arguments;
      var len = args.length;
      var str = String(f).replace(formatRegExp, function(x) {
        if (x === '%%') return '%';
        if (i >= len) return x;
        switch (x) {
          case '%s': return String(args[i++]);
          case '%d': return Number(args[i++]);
          case '%j':
            try {
              return JSON.stringify(args[i++]);
            } catch (_) {
              return '[Circular]';
            }
          default:
            return x;
        }
      });
      for (var x = args[i]; i < len; x = args[++i]) {
        if (isNull(x) || !isObject(x)) {
          str += ' ' + x;
        } else {
          str += ' ' + inspect(x);
        }
      }
      return str;
    }

    // Mark that a method should not be used.
    // Returns a modified function which warns once by default.
    // If --no-deprecation is set, then it is a no-op.
    function deprecate(fn, msg) {
      // Allow for deprecating things in the process of starting up.
      if (isUndefined(global$1.process)) {
        return function() {
          return deprecate(fn, msg).apply(this, arguments);
        };
      }

      if (browser$1.noDeprecation === true) {
        return fn;
      }

      var warned = false;
      function deprecated() {
        if (!warned) {
          if (browser$1.throwDeprecation) {
            throw new Error(msg);
          } else if (browser$1.traceDeprecation) {
            console.trace(msg);
          } else {
            console.error(msg);
          }
          warned = true;
        }
        return fn.apply(this, arguments);
      }

      return deprecated;
    }

    var debugs = {};
    var debugEnviron;
    function debuglog(set) {
      if (isUndefined(debugEnviron))
        debugEnviron = browser$1.env.NODE_DEBUG || '';
      set = set.toUpperCase();
      if (!debugs[set]) {
        if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
          var pid = 0;
          debugs[set] = function() {
            var msg = format$1.apply(null, arguments);
            console.error('%s %d: %s', set, pid, msg);
          };
        } else {
          debugs[set] = function() {};
        }
      }
      return debugs[set];
    }

    /**
     * Echos the value of a value. Trys to print the value out
     * in the best way possible given the different types.
     *
     * @param {Object} obj The object to print out.
     * @param {Object} opts Optional options object that alters the output.
     */
    /* legacy: obj, showHidden, depth, colors*/
    function inspect(obj, opts) {
      // default options
      var ctx = {
        seen: [],
        stylize: stylizeNoColor
      };
      // legacy...
      if (arguments.length >= 3) ctx.depth = arguments[2];
      if (arguments.length >= 4) ctx.colors = arguments[3];
      if (isBoolean(opts)) {
        // legacy...
        ctx.showHidden = opts;
      } else if (opts) {
        // got an "options" object
        _extend(ctx, opts);
      }
      // set default options
      if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
      if (isUndefined(ctx.depth)) ctx.depth = 2;
      if (isUndefined(ctx.colors)) ctx.colors = false;
      if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
      if (ctx.colors) ctx.stylize = stylizeWithColor;
      return formatValue(ctx, obj, ctx.depth);
    }

    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    inspect.colors = {
      'bold' : [1, 22],
      'italic' : [3, 23],
      'underline' : [4, 24],
      'inverse' : [7, 27],
      'white' : [37, 39],
      'grey' : [90, 39],
      'black' : [30, 39],
      'blue' : [34, 39],
      'cyan' : [36, 39],
      'green' : [32, 39],
      'magenta' : [35, 39],
      'red' : [31, 39],
      'yellow' : [33, 39]
    };

    // Don't use 'blue' not visible on cmd.exe
    inspect.styles = {
      'special': 'cyan',
      'number': 'yellow',
      'boolean': 'yellow',
      'undefined': 'grey',
      'null': 'bold',
      'string': 'green',
      'date': 'magenta',
      // "name": intentionally not styling
      'regexp': 'red'
    };


    function stylizeWithColor(str, styleType) {
      var style = inspect.styles[styleType];

      if (style) {
        return '\u001b[' + inspect.colors[style][0] + 'm' + str +
               '\u001b[' + inspect.colors[style][1] + 'm';
      } else {
        return str;
      }
    }


    function stylizeNoColor(str, styleType) {
      return str;
    }


    function arrayToHash(array) {
      var hash = {};

      array.forEach(function(val, idx) {
        hash[val] = true;
      });

      return hash;
    }


    function formatValue(ctx, value, recurseTimes) {
      // Provide a hook for user-specified inspect functions.
      // Check that value is an object with an inspect function on it
      if (ctx.customInspect &&
          value &&
          isFunction(value.inspect) &&
          // Filter out the util module, it's inspect function is special
          value.inspect !== inspect &&
          // Also filter out any prototype objects using the circular check.
          !(value.constructor && value.constructor.prototype === value)) {
        var ret = value.inspect(recurseTimes, ctx);
        if (!isString(ret)) {
          ret = formatValue(ctx, ret, recurseTimes);
        }
        return ret;
      }

      // Primitive types cannot have properties
      var primitive = formatPrimitive(ctx, value);
      if (primitive) {
        return primitive;
      }

      // Look up the keys of the object.
      var keys = Object.keys(value);
      var visibleKeys = arrayToHash(keys);

      if (ctx.showHidden) {
        keys = Object.getOwnPropertyNames(value);
      }

      // IE doesn't make error fields non-enumerable
      // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
      if (isError(value)
          && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
        return formatError(value);
      }

      // Some type of object without properties can be shortcutted.
      if (keys.length === 0) {
        if (isFunction(value)) {
          var name = value.name ? ': ' + value.name : '';
          return ctx.stylize('[Function' + name + ']', 'special');
        }
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        }
        if (isDate(value)) {
          return ctx.stylize(Date.prototype.toString.call(value), 'date');
        }
        if (isError(value)) {
          return formatError(value);
        }
      }

      var base = '', array = false, braces = ['{', '}'];

      // Make Array say that they are Array
      if (isArray$1(value)) {
        array = true;
        braces = ['[', ']'];
      }

      // Make functions say that they are functions
      if (isFunction(value)) {
        var n = value.name ? ': ' + value.name : '';
        base = ' [Function' + n + ']';
      }

      // Make RegExps say that they are RegExps
      if (isRegExp(value)) {
        base = ' ' + RegExp.prototype.toString.call(value);
      }

      // Make dates with properties first say the date
      if (isDate(value)) {
        base = ' ' + Date.prototype.toUTCString.call(value);
      }

      // Make error with message first say the error
      if (isError(value)) {
        base = ' ' + formatError(value);
      }

      if (keys.length === 0 && (!array || value.length == 0)) {
        return braces[0] + base + braces[1];
      }

      if (recurseTimes < 0) {
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        } else {
          return ctx.stylize('[Object]', 'special');
        }
      }

      ctx.seen.push(value);

      var output;
      if (array) {
        output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
      } else {
        output = keys.map(function(key) {
          return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
        });
      }

      ctx.seen.pop();

      return reduceToSingleString(output, base, braces);
    }


    function formatPrimitive(ctx, value) {
      if (isUndefined(value))
        return ctx.stylize('undefined', 'undefined');
      if (isString(value)) {
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return ctx.stylize(simple, 'string');
      }
      if (isNumber$2(value))
        return ctx.stylize('' + value, 'number');
      if (isBoolean(value))
        return ctx.stylize('' + value, 'boolean');
      // For some reason typeof null is "object", so special case here.
      if (isNull(value))
        return ctx.stylize('null', 'null');
    }


    function formatError(value) {
      return '[' + Error.prototype.toString.call(value) + ']';
    }


    function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
      var output = [];
      for (var i = 0, l = value.length; i < l; ++i) {
        if (hasOwnProperty$1(value, String(i))) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
              String(i), true));
        } else {
          output.push('');
        }
      }
      keys.forEach(function(key) {
        if (!key.match(/^\d+$/)) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
              key, true));
        }
      });
      return output;
    }


    function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
      var name, str, desc;
      desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
      if (desc.get) {
        if (desc.set) {
          str = ctx.stylize('[Getter/Setter]', 'special');
        } else {
          str = ctx.stylize('[Getter]', 'special');
        }
      } else {
        if (desc.set) {
          str = ctx.stylize('[Setter]', 'special');
        }
      }
      if (!hasOwnProperty$1(visibleKeys, key)) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (ctx.seen.indexOf(desc.value) < 0) {
          if (isNull(recurseTimes)) {
            str = formatValue(ctx, desc.value, null);
          } else {
            str = formatValue(ctx, desc.value, recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (array) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = ctx.stylize('[Circular]', 'special');
        }
      }
      if (isUndefined(name)) {
        if (array && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = ctx.stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = ctx.stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    }


    function reduceToSingleString(output, base, braces) {
      var length = output.reduce(function(prev, cur) {
        if (cur.indexOf('\n') >= 0) ;
        return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
      }, 0);

      if (length > 60) {
        return braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];
      }

      return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }


    // NOTE: These type checking functions intentionally don't use `instanceof`
    // because it is fragile and can be easily faked with `Object.create()`.
    function isArray$1(ar) {
      return Array.isArray(ar);
    }

    function isBoolean(arg) {
      return typeof arg === 'boolean';
    }

    function isNull(arg) {
      return arg === null;
    }

    function isNullOrUndefined(arg) {
      return arg == null;
    }

    function isNumber$2(arg) {
      return typeof arg === 'number';
    }

    function isString(arg) {
      return typeof arg === 'string';
    }

    function isUndefined(arg) {
      return arg === void 0;
    }

    function isRegExp(re) {
      return isObject(re) && objectToString(re) === '[object RegExp]';
    }

    function isObject(arg) {
      return typeof arg === 'object' && arg !== null;
    }

    function isDate(d) {
      return isObject(d) && objectToString(d) === '[object Date]';
    }

    function isError(e) {
      return isObject(e) &&
          (objectToString(e) === '[object Error]' || e instanceof Error);
    }

    function isFunction(arg) {
      return typeof arg === 'function';
    }

    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }

    function _extend(origin, add) {
      // Don't do anything if add isn't an object
      if (!add || !isObject(add)) return origin;

      var keys = Object.keys(add);
      var i = keys.length;
      while (i--) {
        origin[keys[i]] = add[keys[i]];
      }
      return origin;
    }
    function hasOwnProperty$1(obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    }

    var domain;

    // This constructor is used to store event handlers. Instantiating this is
    // faster than explicitly calling `Object.create(null)` to get a "clean" empty
    // object (tested with v8 v4.9).
    function EventHandlers() {}
    EventHandlers.prototype = Object.create(null);

    function EventEmitter$1() {
      EventEmitter$1.init.call(this);
    }

    // nodejs oddity
    // require('events') === require('events').EventEmitter
    EventEmitter$1.EventEmitter = EventEmitter$1;

    EventEmitter$1.usingDomains = false;

    EventEmitter$1.prototype.domain = undefined;
    EventEmitter$1.prototype._events = undefined;
    EventEmitter$1.prototype._maxListeners = undefined;

    // By default EventEmitters will print a warning if more than 10 listeners are
    // added to it. This is a useful default which helps finding memory leaks.
    EventEmitter$1.defaultMaxListeners = 10;

    EventEmitter$1.init = function() {
      this.domain = null;
      if (EventEmitter$1.usingDomains) {
        // if there is an active domain, then attach to it.
        if (domain.active ) ;
      }

      if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
        this._events = new EventHandlers();
        this._eventsCount = 0;
      }

      this._maxListeners = this._maxListeners || undefined;
    };

    // Obviously not all Emitters should be limited to 10. This function allows
    // that to be increased. Set to zero for unlimited.
    EventEmitter$1.prototype.setMaxListeners = function setMaxListeners(n) {
      if (typeof n !== 'number' || n < 0 || isNaN(n))
        throw new TypeError('"n" argument must be a positive number');
      this._maxListeners = n;
      return this;
    };

    function $getMaxListeners(that) {
      if (that._maxListeners === undefined)
        return EventEmitter$1.defaultMaxListeners;
      return that._maxListeners;
    }

    EventEmitter$1.prototype.getMaxListeners = function getMaxListeners() {
      return $getMaxListeners(this);
    };

    // These standalone emit* functions are used to optimize calling of event
    // handlers for fast cases because emit() itself often has a variable number of
    // arguments and can be deoptimized because of that. These functions always have
    // the same number of arguments and thus do not get deoptimized, so the code
    // inside them can execute faster.
    function emitNone(handler, isFn, self) {
      if (isFn)
        handler.call(self);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self);
      }
    }
    function emitOne(handler, isFn, self, arg1) {
      if (isFn)
        handler.call(self, arg1);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1);
      }
    }
    function emitTwo(handler, isFn, self, arg1, arg2) {
      if (isFn)
        handler.call(self, arg1, arg2);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2);
      }
    }
    function emitThree(handler, isFn, self, arg1, arg2, arg3) {
      if (isFn)
        handler.call(self, arg1, arg2, arg3);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2, arg3);
      }
    }

    function emitMany(handler, isFn, self, args) {
      if (isFn)
        handler.apply(self, args);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].apply(self, args);
      }
    }

    EventEmitter$1.prototype.emit = function emit(type) {
      var er, handler, len, args, i, events, domain;
      var doError = (type === 'error');

      events = this._events;
      if (events)
        doError = (doError && events.error == null);
      else if (!doError)
        return false;

      domain = this.domain;

      // If there is no 'error' event listener then throw.
      if (doError) {
        er = arguments[1];
        if (domain) {
          if (!er)
            er = new Error('Uncaught, unspecified "error" event');
          er.domainEmitter = this;
          er.domain = domain;
          er.domainThrown = false;
          domain.emit('error', er);
        } else if (er instanceof Error) {
          throw er; // Unhandled 'error' event
        } else {
          // At least give some kind of context to the user
          var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
          err.context = er;
          throw err;
        }
        return false;
      }

      handler = events[type];

      if (!handler)
        return false;

      var isFn = typeof handler === 'function';
      len = arguments.length;
      switch (len) {
        // fast cases
        case 1:
          emitNone(handler, isFn, this);
          break;
        case 2:
          emitOne(handler, isFn, this, arguments[1]);
          break;
        case 3:
          emitTwo(handler, isFn, this, arguments[1], arguments[2]);
          break;
        case 4:
          emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
          break;
        // slower
        default:
          args = new Array(len - 1);
          for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];
          emitMany(handler, isFn, this, args);
      }

      return true;
    };

    function _addListener(target, type, listener, prepend) {
      var m;
      var events;
      var existing;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = target._events;
      if (!events) {
        events = target._events = new EventHandlers();
        target._eventsCount = 0;
      } else {
        // To avoid recursion in the case that type === "newListener"! Before
        // adding it to the listeners, first emit "newListener".
        if (events.newListener) {
          target.emit('newListener', type,
                      listener.listener ? listener.listener : listener);

          // Re-assign `events` because a newListener handler could have caused the
          // this._events to be assigned to a new object
          events = target._events;
        }
        existing = events[type];
      }

      if (!existing) {
        // Optimize the case of one listener. Don't need the extra array object.
        existing = events[type] = listener;
        ++target._eventsCount;
      } else {
        if (typeof existing === 'function') {
          // Adding the second element, need to change to array.
          existing = events[type] = prepend ? [listener, existing] :
                                              [existing, listener];
        } else {
          // If we've already got an array, just append.
          if (prepend) {
            existing.unshift(listener);
          } else {
            existing.push(listener);
          }
        }

        // Check for listener leak
        if (!existing.warned) {
          m = $getMaxListeners(target);
          if (m && m > 0 && existing.length > m) {
            existing.warned = true;
            var w = new Error('Possible EventEmitter memory leak detected. ' +
                                existing.length + ' ' + type + ' listeners added. ' +
                                'Use emitter.setMaxListeners() to increase limit');
            w.name = 'MaxListenersExceededWarning';
            w.emitter = target;
            w.type = type;
            w.count = existing.length;
            emitWarning(w);
          }
        }
      }

      return target;
    }
    function emitWarning(e) {
      typeof console.warn === 'function' ? console.warn(e) : console.log(e);
    }
    EventEmitter$1.prototype.addListener = function addListener(type, listener) {
      return _addListener(this, type, listener, false);
    };

    EventEmitter$1.prototype.on = EventEmitter$1.prototype.addListener;

    EventEmitter$1.prototype.prependListener =
        function prependListener(type, listener) {
          return _addListener(this, type, listener, true);
        };

    function _onceWrap(target, type, listener) {
      var fired = false;
      function g() {
        target.removeListener(type, g);
        if (!fired) {
          fired = true;
          listener.apply(target, arguments);
        }
      }
      g.listener = listener;
      return g;
    }

    EventEmitter$1.prototype.once = function once(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.on(type, _onceWrap(this, type, listener));
      return this;
    };

    EventEmitter$1.prototype.prependOnceListener =
        function prependOnceListener(type, listener) {
          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');
          this.prependListener(type, _onceWrap(this, type, listener));
          return this;
        };

    // emits a 'removeListener' event iff the listener was removed
    EventEmitter$1.prototype.removeListener =
        function removeListener(type, listener) {
          var list, events, position, i, originalListener;

          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');

          events = this._events;
          if (!events)
            return this;

          list = events[type];
          if (!list)
            return this;

          if (list === listener || (list.listener && list.listener === listener)) {
            if (--this._eventsCount === 0)
              this._events = new EventHandlers();
            else {
              delete events[type];
              if (events.removeListener)
                this.emit('removeListener', type, list.listener || listener);
            }
          } else if (typeof list !== 'function') {
            position = -1;

            for (i = list.length; i-- > 0;) {
              if (list[i] === listener ||
                  (list[i].listener && list[i].listener === listener)) {
                originalListener = list[i].listener;
                position = i;
                break;
              }
            }

            if (position < 0)
              return this;

            if (list.length === 1) {
              list[0] = undefined;
              if (--this._eventsCount === 0) {
                this._events = new EventHandlers();
                return this;
              } else {
                delete events[type];
              }
            } else {
              spliceOne(list, position);
            }

            if (events.removeListener)
              this.emit('removeListener', type, originalListener || listener);
          }

          return this;
        };
        
    // Alias for removeListener added in NodeJS 10.0
    // https://nodejs.org/api/events.html#events_emitter_off_eventname_listener
    EventEmitter$1.prototype.off = function(type, listener){
        return this.removeListener(type, listener);
    };

    EventEmitter$1.prototype.removeAllListeners =
        function removeAllListeners(type) {
          var listeners, events;

          events = this._events;
          if (!events)
            return this;

          // not listening for removeListener, no need to emit
          if (!events.removeListener) {
            if (arguments.length === 0) {
              this._events = new EventHandlers();
              this._eventsCount = 0;
            } else if (events[type]) {
              if (--this._eventsCount === 0)
                this._events = new EventHandlers();
              else
                delete events[type];
            }
            return this;
          }

          // emit removeListener for all listeners on all events
          if (arguments.length === 0) {
            var keys = Object.keys(events);
            for (var i = 0, key; i < keys.length; ++i) {
              key = keys[i];
              if (key === 'removeListener') continue;
              this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = new EventHandlers();
            this._eventsCount = 0;
            return this;
          }

          listeners = events[type];

          if (typeof listeners === 'function') {
            this.removeListener(type, listeners);
          } else if (listeners) {
            // LIFO order
            do {
              this.removeListener(type, listeners[listeners.length - 1]);
            } while (listeners[0]);
          }

          return this;
        };

    EventEmitter$1.prototype.listeners = function listeners(type) {
      var evlistener;
      var ret;
      var events = this._events;

      if (!events)
        ret = [];
      else {
        evlistener = events[type];
        if (!evlistener)
          ret = [];
        else if (typeof evlistener === 'function')
          ret = [evlistener.listener || evlistener];
        else
          ret = unwrapListeners(evlistener);
      }

      return ret;
    };

    EventEmitter$1.listenerCount = function(emitter, type) {
      if (typeof emitter.listenerCount === 'function') {
        return emitter.listenerCount(type);
      } else {
        return listenerCount$1.call(emitter, type);
      }
    };

    EventEmitter$1.prototype.listenerCount = listenerCount$1;
    function listenerCount$1(type) {
      var events = this._events;

      if (events) {
        var evlistener = events[type];

        if (typeof evlistener === 'function') {
          return 1;
        } else if (evlistener) {
          return evlistener.length;
        }
      }

      return 0;
    }

    EventEmitter$1.prototype.eventNames = function eventNames() {
      return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
    };

    // About 1.5x faster than the two-arg version of Array#splice().
    function spliceOne(list, index) {
      for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
        list[i] = list[k];
      list.pop();
    }

    function arrayClone(arr, i) {
      var copy = new Array(i);
      while (i--)
        copy[i] = arr[i];
      return copy;
    }

    function unwrapListeners(arr) {
      var ret = new Array(arr.length);
      for (var i = 0; i < ret.length; ++i) {
        ret[i] = arr[i].listener || arr[i];
      }
      return ret;
    }

    function BufferList() {
      this.head = null;
      this.tail = null;
      this.length = 0;
    }

    BufferList.prototype.push = function (v) {
      var entry = { data: v, next: null };
      if (this.length > 0) this.tail.next = entry;else this.head = entry;
      this.tail = entry;
      ++this.length;
    };

    BufferList.prototype.unshift = function (v) {
      var entry = { data: v, next: this.head };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    };

    BufferList.prototype.shift = function () {
      if (this.length === 0) return;
      var ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
      --this.length;
      return ret;
    };

    BufferList.prototype.clear = function () {
      this.head = this.tail = null;
      this.length = 0;
    };

    BufferList.prototype.join = function (s) {
      if (this.length === 0) return '';
      var p = this.head;
      var ret = '' + p.data;
      while (p = p.next) {
        ret += s + p.data;
      }return ret;
    };

    BufferList.prototype.concat = function (n) {
      if (this.length === 0) return Buffer.alloc(0);
      if (this.length === 1) return this.head.data;
      var ret = Buffer.allocUnsafe(n >>> 0);
      var p = this.head;
      var i = 0;
      while (p) {
        p.data.copy(ret, i);
        i += p.data.length;
        p = p.next;
      }
      return ret;
    };

    // Copyright Joyent, Inc. and other Node contributors.
    var isBufferEncoding = Buffer.isEncoding
      || function(encoding) {
           switch (encoding && encoding.toLowerCase()) {
             case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
             default: return false;
           }
         };


    function assertEncoding(encoding) {
      if (encoding && !isBufferEncoding(encoding)) {
        throw new Error('Unknown encoding: ' + encoding);
      }
    }

    // StringDecoder provides an interface for efficiently splitting a series of
    // buffers into a series of JS strings without breaking apart multi-byte
    // characters. CESU-8 is handled as part of the UTF-8 encoding.
    //
    // @TODO Handling all encodings inside a single object makes it very difficult
    // to reason about this code, so it should be split up in the future.
    // @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
    // points as used by CESU-8.
    function StringDecoder(encoding) {
      this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
      assertEncoding(encoding);
      switch (this.encoding) {
        case 'utf8':
          // CESU-8 represents each of Surrogate Pair by 3-bytes
          this.surrogateSize = 3;
          break;
        case 'ucs2':
        case 'utf16le':
          // UTF-16 represents each of Surrogate Pair by 2-bytes
          this.surrogateSize = 2;
          this.detectIncompleteChar = utf16DetectIncompleteChar;
          break;
        case 'base64':
          // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
          this.surrogateSize = 3;
          this.detectIncompleteChar = base64DetectIncompleteChar;
          break;
        default:
          this.write = passThroughWrite;
          return;
      }

      // Enough space to store all bytes of a single character. UTF-8 needs 4
      // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
      this.charBuffer = new Buffer(6);
      // Number of bytes received for the current incomplete multi-byte character.
      this.charReceived = 0;
      // Number of bytes expected for the current incomplete multi-byte character.
      this.charLength = 0;
    }

    // write decodes the given buffer and returns it as JS string that is
    // guaranteed to not contain any partial multi-byte characters. Any partial
    // character found at the end of the buffer is buffered up, and will be
    // returned when calling write again with the remaining bytes.
    //
    // Note: Converting a Buffer containing an orphan surrogate to a String
    // currently works, but converting a String to a Buffer (via `new Buffer`, or
    // Buffer#write) will replace incomplete surrogates with the unicode
    // replacement character. See https://codereview.chromium.org/121173009/ .
    StringDecoder.prototype.write = function(buffer) {
      var charStr = '';
      // if our last write ended with an incomplete multibyte character
      while (this.charLength) {
        // determine how many remaining bytes this buffer has to offer for this char
        var available = (buffer.length >= this.charLength - this.charReceived) ?
            this.charLength - this.charReceived :
            buffer.length;

        // add the new bytes to the char buffer
        buffer.copy(this.charBuffer, this.charReceived, 0, available);
        this.charReceived += available;

        if (this.charReceived < this.charLength) {
          // still not enough chars in this buffer? wait for more ...
          return '';
        }

        // remove bytes belonging to the current character from the buffer
        buffer = buffer.slice(available, buffer.length);

        // get the character that was split
        charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

        // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
        var charCode = charStr.charCodeAt(charStr.length - 1);
        if (charCode >= 0xD800 && charCode <= 0xDBFF) {
          this.charLength += this.surrogateSize;
          charStr = '';
          continue;
        }
        this.charReceived = this.charLength = 0;

        // if there are no more bytes in this buffer, just emit our char
        if (buffer.length === 0) {
          return charStr;
        }
        break;
      }

      // determine and set charLength / charReceived
      this.detectIncompleteChar(buffer);

      var end = buffer.length;
      if (this.charLength) {
        // buffer the incomplete character bytes we got
        buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
        end -= this.charReceived;
      }

      charStr += buffer.toString(this.encoding, 0, end);

      var end = charStr.length - 1;
      var charCode = charStr.charCodeAt(end);
      // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
      if (charCode >= 0xD800 && charCode <= 0xDBFF) {
        var size = this.surrogateSize;
        this.charLength += size;
        this.charReceived += size;
        this.charBuffer.copy(this.charBuffer, size, 0, size);
        buffer.copy(this.charBuffer, 0, 0, size);
        return charStr.substring(0, end);
      }

      // or just emit the charStr
      return charStr;
    };

    // detectIncompleteChar determines if there is an incomplete UTF-8 character at
    // the end of the given buffer. If so, it sets this.charLength to the byte
    // length that character, and sets this.charReceived to the number of bytes
    // that are available for this character.
    StringDecoder.prototype.detectIncompleteChar = function(buffer) {
      // determine how many bytes we have to check at the end of this buffer
      var i = (buffer.length >= 3) ? 3 : buffer.length;

      // Figure out if one of the last i bytes of our buffer announces an
      // incomplete char.
      for (; i > 0; i--) {
        var c = buffer[buffer.length - i];

        // See http://en.wikipedia.org/wiki/UTF-8#Description

        // 110XXXXX
        if (i == 1 && c >> 5 == 0x06) {
          this.charLength = 2;
          break;
        }

        // 1110XXXX
        if (i <= 2 && c >> 4 == 0x0E) {
          this.charLength = 3;
          break;
        }

        // 11110XXX
        if (i <= 3 && c >> 3 == 0x1E) {
          this.charLength = 4;
          break;
        }
      }
      this.charReceived = i;
    };

    StringDecoder.prototype.end = function(buffer) {
      var res = '';
      if (buffer && buffer.length)
        res = this.write(buffer);

      if (this.charReceived) {
        var cr = this.charReceived;
        var buf = this.charBuffer;
        var enc = this.encoding;
        res += buf.slice(0, cr).toString(enc);
      }

      return res;
    };

    function passThroughWrite(buffer) {
      return buffer.toString(this.encoding);
    }

    function utf16DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 2;
      this.charLength = this.charReceived ? 2 : 0;
    }

    function base64DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 3;
      this.charLength = this.charReceived ? 3 : 0;
    }

    Readable.ReadableState = ReadableState;

    var debug = debuglog('stream');
    inherits$1(Readable, EventEmitter$1);

    function prependListener(emitter, event, fn) {
      // Sadly this is not cacheable as some libraries bundle their own
      // event emitter implementation with them.
      if (typeof emitter.prependListener === 'function') {
        return emitter.prependListener(event, fn);
      } else {
        // This is a hack to make sure that our error handler is attached before any
        // userland ones.  NEVER DO THIS. This is here only because this code needs
        // to continue to work with older versions of Node.js that do not include
        // the prependListener() method. The goal is to eventually remove this hack.
        if (!emitter._events || !emitter._events[event])
          emitter.on(event, fn);
        else if (Array.isArray(emitter._events[event]))
          emitter._events[event].unshift(fn);
        else
          emitter._events[event] = [fn, emitter._events[event]];
      }
    }
    function listenerCount (emitter, type) {
      return emitter.listeners(type).length;
    }
    function ReadableState(options, stream) {

      options = options || {};

      // object stream flag. Used to make read(n) ignore n and to
      // make all the buffer merging and length checks go away
      this.objectMode = !!options.objectMode;

      if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

      // the point at which it stops calling _read() to fill the buffer
      // Note: 0 is a valid value, means "don't call _read preemptively ever"
      var hwm = options.highWaterMark;
      var defaultHwm = this.objectMode ? 16 : 16 * 1024;
      this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

      // cast to ints.
      this.highWaterMark = ~ ~this.highWaterMark;

      // A linked list is used to store data chunks instead of an array because the
      // linked list can remove elements from the beginning faster than
      // array.shift()
      this.buffer = new BufferList();
      this.length = 0;
      this.pipes = null;
      this.pipesCount = 0;
      this.flowing = null;
      this.ended = false;
      this.endEmitted = false;
      this.reading = false;

      // a flag to be able to tell if the onwrite cb is called immediately,
      // or on a later tick.  We set this to true at first, because any
      // actions that shouldn't happen until "later" should generally also
      // not happen before the first write call.
      this.sync = true;

      // whenever we return null, then we set a flag to say
      // that we're awaiting a 'readable' event emission.
      this.needReadable = false;
      this.emittedReadable = false;
      this.readableListening = false;
      this.resumeScheduled = false;

      // Crypto is kind of old and crusty.  Historically, its default string
      // encoding is 'binary' so we have to make this configurable.
      // Everything else in the universe uses 'utf8', though.
      this.defaultEncoding = options.defaultEncoding || 'utf8';

      // when piping, we only care about 'readable' events that happen
      // after read()ing all the bytes and not getting any pushback.
      this.ranOut = false;

      // the number of writers that are awaiting a drain event in .pipe()s
      this.awaitDrain = 0;

      // if true, a maybeReadMore has been scheduled
      this.readingMore = false;

      this.decoder = null;
      this.encoding = null;
      if (options.encoding) {
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    function Readable(options) {

      if (!(this instanceof Readable)) return new Readable(options);

      this._readableState = new ReadableState(options, this);

      // legacy
      this.readable = true;

      if (options && typeof options.read === 'function') this._read = options.read;

      EventEmitter$1.call(this);
    }

    // Manually shove something into the read() buffer.
    // This returns true if the highWaterMark has not been hit yet,
    // similar to how Writable.write() returns true if you should
    // write() some more.
    Readable.prototype.push = function (chunk, encoding) {
      var state = this._readableState;

      if (!state.objectMode && typeof chunk === 'string') {
        encoding = encoding || state.defaultEncoding;
        if (encoding !== state.encoding) {
          chunk = Buffer.from(chunk, encoding);
          encoding = '';
        }
      }

      return readableAddChunk(this, state, chunk, encoding, false);
    };

    // Unshift should *always* be something directly out of read()
    Readable.prototype.unshift = function (chunk) {
      var state = this._readableState;
      return readableAddChunk(this, state, chunk, '', true);
    };

    Readable.prototype.isPaused = function () {
      return this._readableState.flowing === false;
    };

    function readableAddChunk(stream, state, chunk, encoding, addToFront) {
      var er = chunkInvalid(state, chunk);
      if (er) {
        stream.emit('error', er);
      } else if (chunk === null) {
        state.reading = false;
        onEofChunk(stream, state);
      } else if (state.objectMode || chunk && chunk.length > 0) {
        if (state.ended && !addToFront) {
          var e = new Error('stream.push() after EOF');
          stream.emit('error', e);
        } else if (state.endEmitted && addToFront) {
          var _e = new Error('stream.unshift() after end event');
          stream.emit('error', _e);
        } else {
          var skipAdd;
          if (state.decoder && !addToFront && !encoding) {
            chunk = state.decoder.write(chunk);
            skipAdd = !state.objectMode && chunk.length === 0;
          }

          if (!addToFront) state.reading = false;

          // Don't add to the buffer if we've decoded to an empty string chunk and
          // we're not in object mode
          if (!skipAdd) {
            // if we want the data now, just emit it.
            if (state.flowing && state.length === 0 && !state.sync) {
              stream.emit('data', chunk);
              stream.read(0);
            } else {
              // update the buffer info.
              state.length += state.objectMode ? 1 : chunk.length;
              if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

              if (state.needReadable) emitReadable(stream);
            }
          }

          maybeReadMore(stream, state);
        }
      } else if (!addToFront) {
        state.reading = false;
      }

      return needMoreData(state);
    }

    // if it's past the high water mark, we can push in some more.
    // Also, if we have no data yet, we can stand some
    // more bytes.  This is to work around cases where hwm=0,
    // such as the repl.  Also, if the push() triggered a
    // readable event, and the user called read(largeNumber) such that
    // needReadable was set, then we ought to push more, so that another
    // 'readable' event will be triggered.
    function needMoreData(state) {
      return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
    }

    // backwards compatibility.
    Readable.prototype.setEncoding = function (enc) {
      this._readableState.decoder = new StringDecoder(enc);
      this._readableState.encoding = enc;
      return this;
    };

    // Don't raise the hwm > 8MB
    var MAX_HWM = 0x800000;
    function computeNewHighWaterMark(n) {
      if (n >= MAX_HWM) {
        n = MAX_HWM;
      } else {
        // Get the next highest power of 2 to prevent increasing hwm excessively in
        // tiny amounts
        n--;
        n |= n >>> 1;
        n |= n >>> 2;
        n |= n >>> 4;
        n |= n >>> 8;
        n |= n >>> 16;
        n++;
      }
      return n;
    }

    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function howMuchToRead(n, state) {
      if (n <= 0 || state.length === 0 && state.ended) return 0;
      if (state.objectMode) return 1;
      if (n !== n) {
        // Only flow one buffer at a time
        if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
      }
      // If we're asking for more than the current hwm, then raise the hwm.
      if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
      if (n <= state.length) return n;
      // Don't have enough
      if (!state.ended) {
        state.needReadable = true;
        return 0;
      }
      return state.length;
    }

    // you can override either this method, or the async _read(n) below.
    Readable.prototype.read = function (n) {
      debug('read', n);
      n = parseInt(n, 10);
      var state = this._readableState;
      var nOrig = n;

      if (n !== 0) state.emittedReadable = false;

      // if we're doing read(0) to trigger a readable event, but we
      // already have a bunch of data in the buffer, then just trigger
      // the 'readable' event and move on.
      if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
        debug('read: emitReadable', state.length, state.ended);
        if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
        return null;
      }

      n = howMuchToRead(n, state);

      // if we've ended, and we're now clear, then finish it up.
      if (n === 0 && state.ended) {
        if (state.length === 0) endReadable(this);
        return null;
      }

      // All the actual chunk generation logic needs to be
      // *below* the call to _read.  The reason is that in certain
      // synthetic stream cases, such as passthrough streams, _read
      // may be a completely synchronous operation which may change
      // the state of the read buffer, providing enough data when
      // before there was *not* enough.
      //
      // So, the steps are:
      // 1. Figure out what the state of things will be after we do
      // a read from the buffer.
      //
      // 2. If that resulting state will trigger a _read, then call _read.
      // Note that this may be asynchronous, or synchronous.  Yes, it is
      // deeply ugly to write APIs this way, but that still doesn't mean
      // that the Readable class should behave improperly, as streams are
      // designed to be sync/async agnostic.
      // Take note if the _read call is sync or async (ie, if the read call
      // has returned yet), so that we know whether or not it's safe to emit
      // 'readable' etc.
      //
      // 3. Actually pull the requested chunks out of the buffer and return.

      // if we need a readable event, then we need to do some reading.
      var doRead = state.needReadable;
      debug('need readable', doRead);

      // if we currently have less than the highWaterMark, then also read some
      if (state.length === 0 || state.length - n < state.highWaterMark) {
        doRead = true;
        debug('length less than watermark', doRead);
      }

      // however, if we've ended, then there's no point, and if we're already
      // reading, then it's unnecessary.
      if (state.ended || state.reading) {
        doRead = false;
        debug('reading or ended', doRead);
      } else if (doRead) {
        debug('do read');
        state.reading = true;
        state.sync = true;
        // if the length is currently zero, then we *need* a readable event.
        if (state.length === 0) state.needReadable = true;
        // call internal read method
        this._read(state.highWaterMark);
        state.sync = false;
        // If _read pushed data synchronously, then `reading` will be false,
        // and we need to re-evaluate how much data we can return to the user.
        if (!state.reading) n = howMuchToRead(nOrig, state);
      }

      var ret;
      if (n > 0) ret = fromList(n, state);else ret = null;

      if (ret === null) {
        state.needReadable = true;
        n = 0;
      } else {
        state.length -= n;
      }

      if (state.length === 0) {
        // If we have nothing in the buffer, then we want to know
        // as soon as we *do* get something into the buffer.
        if (!state.ended) state.needReadable = true;

        // If we tried to read() past the EOF, then emit end on the next tick.
        if (nOrig !== n && state.ended) endReadable(this);
      }

      if (ret !== null) this.emit('data', ret);

      return ret;
    };

    function chunkInvalid(state, chunk) {
      var er = null;
      if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
        er = new TypeError('Invalid non-string/buffer chunk');
      }
      return er;
    }

    function onEofChunk(stream, state) {
      if (state.ended) return;
      if (state.decoder) {
        var chunk = state.decoder.end();
        if (chunk && chunk.length) {
          state.buffer.push(chunk);
          state.length += state.objectMode ? 1 : chunk.length;
        }
      }
      state.ended = true;

      // emit 'readable' now to make sure it gets picked up.
      emitReadable(stream);
    }

    // Don't emit readable right away in sync mode, because this can trigger
    // another read() call => stack overflow.  This way, it might trigger
    // a nextTick recursion warning, but that's not so bad.
    function emitReadable(stream) {
      var state = stream._readableState;
      state.needReadable = false;
      if (!state.emittedReadable) {
        debug('emitReadable', state.flowing);
        state.emittedReadable = true;
        if (state.sync) nextTick(emitReadable_, stream);else emitReadable_(stream);
      }
    }

    function emitReadable_(stream) {
      debug('emit readable');
      stream.emit('readable');
      flow(stream);
    }

    // at this point, the user has presumably seen the 'readable' event,
    // and called read() to consume some data.  that may have triggered
    // in turn another _read(n) call, in which case reading = true if
    // it's in progress.
    // However, if we're not ended, or reading, and the length < hwm,
    // then go ahead and try to read some more preemptively.
    function maybeReadMore(stream, state) {
      if (!state.readingMore) {
        state.readingMore = true;
        nextTick(maybeReadMore_, stream, state);
      }
    }

    function maybeReadMore_(stream, state) {
      var len = state.length;
      while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
        debug('maybeReadMore read 0');
        stream.read(0);
        if (len === state.length)
          // didn't get any data, stop spinning.
          break;else len = state.length;
      }
      state.readingMore = false;
    }

    // abstract method.  to be overridden in specific implementation classes.
    // call cb(er, data) where data is <= n in length.
    // for virtual (non-string, non-buffer) streams, "length" is somewhat
    // arbitrary, and perhaps not very meaningful.
    Readable.prototype._read = function (n) {
      this.emit('error', new Error('not implemented'));
    };

    Readable.prototype.pipe = function (dest, pipeOpts) {
      var src = this;
      var state = this._readableState;

      switch (state.pipesCount) {
        case 0:
          state.pipes = dest;
          break;
        case 1:
          state.pipes = [state.pipes, dest];
          break;
        default:
          state.pipes.push(dest);
          break;
      }
      state.pipesCount += 1;
      debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

      var doEnd = (!pipeOpts || pipeOpts.end !== false);

      var endFn = doEnd ? onend : cleanup;
      if (state.endEmitted) nextTick(endFn);else src.once('end', endFn);

      dest.on('unpipe', onunpipe);
      function onunpipe(readable) {
        debug('onunpipe');
        if (readable === src) {
          cleanup();
        }
      }

      function onend() {
        debug('onend');
        dest.end();
      }

      // when the dest drains, it reduces the awaitDrain counter
      // on the source.  This would be more elegant with a .once()
      // handler in flow(), but adding and removing repeatedly is
      // too slow.
      var ondrain = pipeOnDrain(src);
      dest.on('drain', ondrain);

      var cleanedUp = false;
      function cleanup() {
        debug('cleanup');
        // cleanup event handlers once the pipe is broken
        dest.removeListener('close', onclose);
        dest.removeListener('finish', onfinish);
        dest.removeListener('drain', ondrain);
        dest.removeListener('error', onerror);
        dest.removeListener('unpipe', onunpipe);
        src.removeListener('end', onend);
        src.removeListener('end', cleanup);
        src.removeListener('data', ondata);

        cleanedUp = true;

        // if the reader is waiting for a drain event from this
        // specific writer, then it would cause it to never start
        // flowing again.
        // So, if this is awaiting a drain, then we just call it now.
        // If we don't know, then assume that we are waiting for one.
        if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
      }

      // If the user pushes more data while we're writing to dest then we'll end up
      // in ondata again. However, we only want to increase awaitDrain once because
      // dest will only emit one 'drain' event for the multiple writes.
      // => Introduce a guard on increasing awaitDrain.
      var increasedAwaitDrain = false;
      src.on('data', ondata);
      function ondata(chunk) {
        debug('ondata');
        increasedAwaitDrain = false;
        var ret = dest.write(chunk);
        if (false === ret && !increasedAwaitDrain) {
          // If the user unpiped during `dest.write()`, it is possible
          // to get stuck in a permanently paused state if that write
          // also returned false.
          // => Check whether `dest` is still a piping destination.
          if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
            debug('false write response, pause', src._readableState.awaitDrain);
            src._readableState.awaitDrain++;
            increasedAwaitDrain = true;
          }
          src.pause();
        }
      }

      // if the dest has an error, then stop piping into it.
      // however, don't suppress the throwing behavior for this.
      function onerror(er) {
        debug('onerror', er);
        unpipe();
        dest.removeListener('error', onerror);
        if (listenerCount(dest, 'error') === 0) dest.emit('error', er);
      }

      // Make sure our error handler is attached before userland ones.
      prependListener(dest, 'error', onerror);

      // Both close and finish should trigger unpipe, but only once.
      function onclose() {
        dest.removeListener('finish', onfinish);
        unpipe();
      }
      dest.once('close', onclose);
      function onfinish() {
        debug('onfinish');
        dest.removeListener('close', onclose);
        unpipe();
      }
      dest.once('finish', onfinish);

      function unpipe() {
        debug('unpipe');
        src.unpipe(dest);
      }

      // tell the dest that it's being piped to
      dest.emit('pipe', src);

      // start the flow if it hasn't been started already.
      if (!state.flowing) {
        debug('pipe resume');
        src.resume();
      }

      return dest;
    };

    function pipeOnDrain(src) {
      return function () {
        var state = src._readableState;
        debug('pipeOnDrain', state.awaitDrain);
        if (state.awaitDrain) state.awaitDrain--;
        if (state.awaitDrain === 0 && src.listeners('data').length) {
          state.flowing = true;
          flow(src);
        }
      };
    }

    Readable.prototype.unpipe = function (dest) {
      var state = this._readableState;

      // if we're not piping anywhere, then do nothing.
      if (state.pipesCount === 0) return this;

      // just one destination.  most common case.
      if (state.pipesCount === 1) {
        // passed in one, but it's not the right one.
        if (dest && dest !== state.pipes) return this;

        if (!dest) dest = state.pipes;

        // got a match.
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;
        if (dest) dest.emit('unpipe', this);
        return this;
      }

      // slow case. multiple pipe destinations.

      if (!dest) {
        // remove all.
        var dests = state.pipes;
        var len = state.pipesCount;
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;

        for (var _i = 0; _i < len; _i++) {
          dests[_i].emit('unpipe', this);
        }return this;
      }

      // try to find the right one.
      var i = indexOf(state.pipes, dest);
      if (i === -1) return this;

      state.pipes.splice(i, 1);
      state.pipesCount -= 1;
      if (state.pipesCount === 1) state.pipes = state.pipes[0];

      dest.emit('unpipe', this);

      return this;
    };

    // set up data events if they are asked for
    // Ensure readable listeners eventually get something
    Readable.prototype.on = function (ev, fn) {
      var res = EventEmitter$1.prototype.on.call(this, ev, fn);

      if (ev === 'data') {
        // Start flowing on next tick if stream isn't explicitly paused
        if (this._readableState.flowing !== false) this.resume();
      } else if (ev === 'readable') {
        var state = this._readableState;
        if (!state.endEmitted && !state.readableListening) {
          state.readableListening = state.needReadable = true;
          state.emittedReadable = false;
          if (!state.reading) {
            nextTick(nReadingNextTick, this);
          } else if (state.length) {
            emitReadable(this);
          }
        }
      }

      return res;
    };
    Readable.prototype.addListener = Readable.prototype.on;

    function nReadingNextTick(self) {
      debug('readable nexttick read 0');
      self.read(0);
    }

    // pause() and resume() are remnants of the legacy readable stream API
    // If the user uses them, then switch into old mode.
    Readable.prototype.resume = function () {
      var state = this._readableState;
      if (!state.flowing) {
        debug('resume');
        state.flowing = true;
        resume(this, state);
      }
      return this;
    };

    function resume(stream, state) {
      if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        nextTick(resume_, stream, state);
      }
    }

    function resume_(stream, state) {
      if (!state.reading) {
        debug('resume read 0');
        stream.read(0);
      }

      state.resumeScheduled = false;
      state.awaitDrain = 0;
      stream.emit('resume');
      flow(stream);
      if (state.flowing && !state.reading) stream.read(0);
    }

    Readable.prototype.pause = function () {
      debug('call pause flowing=%j', this._readableState.flowing);
      if (false !== this._readableState.flowing) {
        debug('pause');
        this._readableState.flowing = false;
        this.emit('pause');
      }
      return this;
    };

    function flow(stream) {
      var state = stream._readableState;
      debug('flow', state.flowing);
      while (state.flowing && stream.read() !== null) {}
    }

    // wrap an old-style stream as the async data source.
    // This is *not* part of the readable stream interface.
    // It is an ugly unfortunate mess of history.
    Readable.prototype.wrap = function (stream) {
      var state = this._readableState;
      var paused = false;

      var self = this;
      stream.on('end', function () {
        debug('wrapped end');
        if (state.decoder && !state.ended) {
          var chunk = state.decoder.end();
          if (chunk && chunk.length) self.push(chunk);
        }

        self.push(null);
      });

      stream.on('data', function (chunk) {
        debug('wrapped data');
        if (state.decoder) chunk = state.decoder.write(chunk);

        // don't skip over falsy values in objectMode
        if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

        var ret = self.push(chunk);
        if (!ret) {
          paused = true;
          stream.pause();
        }
      });

      // proxy all the other methods.
      // important when wrapping filters and duplexes.
      for (var i in stream) {
        if (this[i] === undefined && typeof stream[i] === 'function') {
          this[i] = function (method) {
            return function () {
              return stream[method].apply(stream, arguments);
            };
          }(i);
        }
      }

      // proxy certain important events.
      var events = ['error', 'close', 'destroy', 'pause', 'resume'];
      forEach(events, function (ev) {
        stream.on(ev, self.emit.bind(self, ev));
      });

      // when we try to consume some more bytes, simply unpause the
      // underlying stream.
      self._read = function (n) {
        debug('wrapped _read', n);
        if (paused) {
          paused = false;
          stream.resume();
        }
      };

      return self;
    };

    // exposed for testing purposes only.
    Readable._fromList = fromList;

    // Pluck off n bytes from an array of buffers.
    // Length is the combined lengths of all the buffers in the list.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function fromList(n, state) {
      // nothing buffered
      if (state.length === 0) return null;

      var ret;
      if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
        // read it all, truncate the list
        if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
        state.buffer.clear();
      } else {
        // read part of list
        ret = fromListPartial(n, state.buffer, state.decoder);
      }

      return ret;
    }

    // Extracts only enough buffered data to satisfy the amount requested.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function fromListPartial(n, list, hasStrings) {
      var ret;
      if (n < list.head.data.length) {
        // slice is the same for buffers and strings
        ret = list.head.data.slice(0, n);
        list.head.data = list.head.data.slice(n);
      } else if (n === list.head.data.length) {
        // first chunk is a perfect match
        ret = list.shift();
      } else {
        // result spans more than one buffer
        ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
      }
      return ret;
    }

    // Copies a specified amount of characters from the list of buffered data
    // chunks.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function copyFromBufferString(n, list) {
      var p = list.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;
      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length) ret += str;else ret += str.slice(0, n);
        n -= nb;
        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next) list.head = p.next;else list.head = list.tail = null;
          } else {
            list.head = p;
            p.data = str.slice(nb);
          }
          break;
        }
        ++c;
      }
      list.length -= c;
      return ret;
    }

    // Copies a specified amount of bytes from the list of buffered data chunks.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function copyFromBuffer(n, list) {
      var ret = Buffer.allocUnsafe(n);
      var p = list.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;
      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;
        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next) list.head = p.next;else list.head = list.tail = null;
          } else {
            list.head = p;
            p.data = buf.slice(nb);
          }
          break;
        }
        ++c;
      }
      list.length -= c;
      return ret;
    }

    function endReadable(stream) {
      var state = stream._readableState;

      // If we get here before consuming all the bytes, then that is a
      // bug in node.  Should never happen.
      if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

      if (!state.endEmitted) {
        state.ended = true;
        nextTick(endReadableNT, state, stream);
      }
    }

    function endReadableNT(state, stream) {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    }

    function forEach(xs, f) {
      for (var i = 0, l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }

    function indexOf(xs, x) {
      for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) return i;
      }
      return -1;
    }

    // A bit simpler than readable streams.
    Writable.WritableState = WritableState;
    inherits$1(Writable, EventEmitter$1);

    function nop() {}

    function WriteReq(chunk, encoding, cb) {
      this.chunk = chunk;
      this.encoding = encoding;
      this.callback = cb;
      this.next = null;
    }

    function WritableState(options, stream) {
      Object.defineProperty(this, 'buffer', {
        get: deprecate(function () {
          return this.getBuffer();
        }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
      });
      options = options || {};

      // object stream flag to indicate whether or not this stream
      // contains buffers or objects.
      this.objectMode = !!options.objectMode;

      if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

      // the point at which write() starts returning false
      // Note: 0 is a valid value, means that we always return false if
      // the entire buffer is not flushed immediately on write()
      var hwm = options.highWaterMark;
      var defaultHwm = this.objectMode ? 16 : 16 * 1024;
      this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

      // cast to ints.
      this.highWaterMark = ~ ~this.highWaterMark;

      this.needDrain = false;
      // at the start of calling end()
      this.ending = false;
      // when end() has been called, and returned
      this.ended = false;
      // when 'finish' is emitted
      this.finished = false;

      // should we decode strings into buffers before passing to _write?
      // this is here so that some node-core streams can optimize string
      // handling at a lower level.
      var noDecode = options.decodeStrings === false;
      this.decodeStrings = !noDecode;

      // Crypto is kind of old and crusty.  Historically, its default string
      // encoding is 'binary' so we have to make this configurable.
      // Everything else in the universe uses 'utf8', though.
      this.defaultEncoding = options.defaultEncoding || 'utf8';

      // not an actual buffer we keep track of, but a measurement
      // of how much we're waiting to get pushed to some underlying
      // socket or file.
      this.length = 0;

      // a flag to see when we're in the middle of a write.
      this.writing = false;

      // when true all writes will be buffered until .uncork() call
      this.corked = 0;

      // a flag to be able to tell if the onwrite cb is called immediately,
      // or on a later tick.  We set this to true at first, because any
      // actions that shouldn't happen until "later" should generally also
      // not happen before the first write call.
      this.sync = true;

      // a flag to know if we're processing previously buffered items, which
      // may call the _write() callback in the same tick, so that we don't
      // end up in an overlapped onwrite situation.
      this.bufferProcessing = false;

      // the callback that's passed to _write(chunk,cb)
      this.onwrite = function (er) {
        onwrite(stream, er);
      };

      // the callback that the user supplies to write(chunk,encoding,cb)
      this.writecb = null;

      // the amount that is being written when _write is called.
      this.writelen = 0;

      this.bufferedRequest = null;
      this.lastBufferedRequest = null;

      // number of pending user-supplied write callbacks
      // this must be 0 before 'finish' can be emitted
      this.pendingcb = 0;

      // emit prefinish if the only thing we're waiting for is _write cbs
      // This is relevant for synchronous Transform streams
      this.prefinished = false;

      // True if the error was already emitted and should not be thrown again
      this.errorEmitted = false;

      // count buffered requests
      this.bufferedRequestCount = 0;

      // allocate the first CorkedRequest, there is always
      // one allocated and free to use, and we maintain at most two
      this.corkedRequestsFree = new CorkedRequest(this);
    }

    WritableState.prototype.getBuffer = function writableStateGetBuffer() {
      var current = this.bufferedRequest;
      var out = [];
      while (current) {
        out.push(current);
        current = current.next;
      }
      return out;
    };
    function Writable(options) {

      // Writable ctor is applied to Duplexes, though they're not
      // instanceof Writable, they're instanceof Readable.
      if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);

      this._writableState = new WritableState(options, this);

      // legacy.
      this.writable = true;

      if (options) {
        if (typeof options.write === 'function') this._write = options.write;

        if (typeof options.writev === 'function') this._writev = options.writev;
      }

      EventEmitter$1.call(this);
    }

    // Otherwise people can pipe Writable streams, which is just wrong.
    Writable.prototype.pipe = function () {
      this.emit('error', new Error('Cannot pipe, not readable'));
    };

    function writeAfterEnd(stream, cb) {
      var er = new Error('write after end');
      // TODO: defer error events consistently everywhere, not just the cb
      stream.emit('error', er);
      nextTick(cb, er);
    }

    // If we get something that is not a buffer, string, null, or undefined,
    // and we're not in objectMode, then that's an error.
    // Otherwise stream chunks are all considered to be of length=1, and the
    // watermarks determine how many objects to keep in the buffer, rather than
    // how many bytes or characters.
    function validChunk(stream, state, chunk, cb) {
      var valid = true;
      var er = false;
      // Always throw error if a null is written
      // if we are not in object mode then throw
      // if it is not a buffer, string, or undefined.
      if (chunk === null) {
        er = new TypeError('May not write null values to stream');
      } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
        er = new TypeError('Invalid non-string/buffer chunk');
      }
      if (er) {
        stream.emit('error', er);
        nextTick(cb, er);
        valid = false;
      }
      return valid;
    }

    Writable.prototype.write = function (chunk, encoding, cb) {
      var state = this._writableState;
      var ret = false;

      if (typeof encoding === 'function') {
        cb = encoding;
        encoding = null;
      }

      if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

      if (typeof cb !== 'function') cb = nop;

      if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
        state.pendingcb++;
        ret = writeOrBuffer(this, state, chunk, encoding, cb);
      }

      return ret;
    };

    Writable.prototype.cork = function () {
      var state = this._writableState;

      state.corked++;
    };

    Writable.prototype.uncork = function () {
      var state = this._writableState;

      if (state.corked) {
        state.corked--;

        if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
      }
    };

    Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
      // node::ParseEncoding() requires lower case.
      if (typeof encoding === 'string') encoding = encoding.toLowerCase();
      if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
      this._writableState.defaultEncoding = encoding;
      return this;
    };

    function decodeChunk(state, chunk, encoding) {
      if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
        chunk = Buffer.from(chunk, encoding);
      }
      return chunk;
    }

    // if we're already writing something, then just put this
    // in the queue, and wait our turn.  Otherwise, call _write
    // If we return false, then we need a drain event, so set that flag.
    function writeOrBuffer(stream, state, chunk, encoding, cb) {
      chunk = decodeChunk(state, chunk, encoding);

      if (Buffer.isBuffer(chunk)) encoding = 'buffer';
      var len = state.objectMode ? 1 : chunk.length;

      state.length += len;

      var ret = state.length < state.highWaterMark;
      // we must ensure that previous needDrain will not be reset to false.
      if (!ret) state.needDrain = true;

      if (state.writing || state.corked) {
        var last = state.lastBufferedRequest;
        state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
        if (last) {
          last.next = state.lastBufferedRequest;
        } else {
          state.bufferedRequest = state.lastBufferedRequest;
        }
        state.bufferedRequestCount += 1;
      } else {
        doWrite(stream, state, false, len, chunk, encoding, cb);
      }

      return ret;
    }

    function doWrite(stream, state, writev, len, chunk, encoding, cb) {
      state.writelen = len;
      state.writecb = cb;
      state.writing = true;
      state.sync = true;
      if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }

    function onwriteError(stream, state, sync, er, cb) {
      --state.pendingcb;
      if (sync) nextTick(cb, er);else cb(er);

      stream._writableState.errorEmitted = true;
      stream.emit('error', er);
    }

    function onwriteStateUpdate(state) {
      state.writing = false;
      state.writecb = null;
      state.length -= state.writelen;
      state.writelen = 0;
    }

    function onwrite(stream, er) {
      var state = stream._writableState;
      var sync = state.sync;
      var cb = state.writecb;

      onwriteStateUpdate(state);

      if (er) onwriteError(stream, state, sync, er, cb);else {
        // Check if we're actually ready to finish, but don't emit yet
        var finished = needFinish(state);

        if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
          clearBuffer(stream, state);
        }

        if (sync) {
          /*<replacement>*/
            nextTick(afterWrite, stream, state, finished, cb);
          /*</replacement>*/
        } else {
            afterWrite(stream, state, finished, cb);
          }
      }
    }

    function afterWrite(stream, state, finished, cb) {
      if (!finished) onwriteDrain(stream, state);
      state.pendingcb--;
      cb();
      finishMaybe(stream, state);
    }

    // Must force callback to be called on nextTick, so that we don't
    // emit 'drain' before the write() consumer gets the 'false' return
    // value, and has a chance to attach a 'drain' listener.
    function onwriteDrain(stream, state) {
      if (state.length === 0 && state.needDrain) {
        state.needDrain = false;
        stream.emit('drain');
      }
    }

    // if there's something in the buffer waiting, then process it
    function clearBuffer(stream, state) {
      state.bufferProcessing = true;
      var entry = state.bufferedRequest;

      if (stream._writev && entry && entry.next) {
        // Fast case, write everything using _writev()
        var l = state.bufferedRequestCount;
        var buffer = new Array(l);
        var holder = state.corkedRequestsFree;
        holder.entry = entry;

        var count = 0;
        while (entry) {
          buffer[count] = entry;
          entry = entry.next;
          count += 1;
        }

        doWrite(stream, state, true, state.length, buffer, '', holder.finish);

        // doWrite is almost always async, defer these to save a bit of time
        // as the hot path ends with doWrite
        state.pendingcb++;
        state.lastBufferedRequest = null;
        if (holder.next) {
          state.corkedRequestsFree = holder.next;
          holder.next = null;
        } else {
          state.corkedRequestsFree = new CorkedRequest(state);
        }
      } else {
        // Slow case, write chunks one-by-one
        while (entry) {
          var chunk = entry.chunk;
          var encoding = entry.encoding;
          var cb = entry.callback;
          var len = state.objectMode ? 1 : chunk.length;

          doWrite(stream, state, false, len, chunk, encoding, cb);
          entry = entry.next;
          // if we didn't call the onwrite immediately, then
          // it means that we need to wait until it does.
          // also, that means that the chunk and cb are currently
          // being processed, so move the buffer counter past them.
          if (state.writing) {
            break;
          }
        }

        if (entry === null) state.lastBufferedRequest = null;
      }

      state.bufferedRequestCount = 0;
      state.bufferedRequest = entry;
      state.bufferProcessing = false;
    }

    Writable.prototype._write = function (chunk, encoding, cb) {
      cb(new Error('not implemented'));
    };

    Writable.prototype._writev = null;

    Writable.prototype.end = function (chunk, encoding, cb) {
      var state = this._writableState;

      if (typeof chunk === 'function') {
        cb = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === 'function') {
        cb = encoding;
        encoding = null;
      }

      if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

      // .end() fully uncorks
      if (state.corked) {
        state.corked = 1;
        this.uncork();
      }

      // ignore unnecessary end() calls.
      if (!state.ending && !state.finished) endWritable(this, state, cb);
    };

    function needFinish(state) {
      return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
    }

    function prefinish(stream, state) {
      if (!state.prefinished) {
        state.prefinished = true;
        stream.emit('prefinish');
      }
    }

    function finishMaybe(stream, state) {
      var need = needFinish(state);
      if (need) {
        if (state.pendingcb === 0) {
          prefinish(stream, state);
          state.finished = true;
          stream.emit('finish');
        } else {
          prefinish(stream, state);
        }
      }
      return need;
    }

    function endWritable(stream, state, cb) {
      state.ending = true;
      finishMaybe(stream, state);
      if (cb) {
        if (state.finished) nextTick(cb);else stream.once('finish', cb);
      }
      state.ended = true;
      stream.writable = false;
    }

    // It seems a linked list but it is not
    // there will be only 2 of these for each stream
    function CorkedRequest(state) {
      var _this = this;

      this.next = null;
      this.entry = null;

      this.finish = function (err) {
        var entry = _this.entry;
        _this.entry = null;
        while (entry) {
          var cb = entry.callback;
          state.pendingcb--;
          cb(err);
          entry = entry.next;
        }
        if (state.corkedRequestsFree) {
          state.corkedRequestsFree.next = _this;
        } else {
          state.corkedRequestsFree = _this;
        }
      };
    }

    inherits$1(Duplex, Readable);

    var keys = Object.keys(Writable.prototype);
    for (var v = 0; v < keys.length; v++) {
      var method = keys[v];
      if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
    }
    function Duplex(options) {
      if (!(this instanceof Duplex)) return new Duplex(options);

      Readable.call(this, options);
      Writable.call(this, options);

      if (options && options.readable === false) this.readable = false;

      if (options && options.writable === false) this.writable = false;

      this.allowHalfOpen = true;
      if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

      this.once('end', onend);
    }

    // the no-half-open enforcer
    function onend() {
      // if we allow half-open state, or if the writable side ended,
      // then we're ok.
      if (this.allowHalfOpen || this._writableState.ended) return;

      // no more data can be written.
      // But allow more writes to happen in this tick.
      nextTick(onEndNT, this);
    }

    function onEndNT(self) {
      self.end();
    }

    // a transform stream is a readable/writable stream where you do
    inherits$1(Transform, Duplex);

    function TransformState(stream) {
      this.afterTransform = function (er, data) {
        return afterTransform(stream, er, data);
      };

      this.needTransform = false;
      this.transforming = false;
      this.writecb = null;
      this.writechunk = null;
      this.writeencoding = null;
    }

    function afterTransform(stream, er, data) {
      var ts = stream._transformState;
      ts.transforming = false;

      var cb = ts.writecb;

      if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

      ts.writechunk = null;
      ts.writecb = null;

      if (data !== null && data !== undefined) stream.push(data);

      cb(er);

      var rs = stream._readableState;
      rs.reading = false;
      if (rs.needReadable || rs.length < rs.highWaterMark) {
        stream._read(rs.highWaterMark);
      }
    }
    function Transform(options) {
      if (!(this instanceof Transform)) return new Transform(options);

      Duplex.call(this, options);

      this._transformState = new TransformState(this);

      // when the writable side finishes, then flush out anything remaining.
      var stream = this;

      // start out asking for a readable event once data is transformed.
      this._readableState.needReadable = true;

      // we have implemented the _read method, and done the other things
      // that Readable wants before the first _read call, so unset the
      // sync guard flag.
      this._readableState.sync = false;

      if (options) {
        if (typeof options.transform === 'function') this._transform = options.transform;

        if (typeof options.flush === 'function') this._flush = options.flush;
      }

      this.once('prefinish', function () {
        if (typeof this._flush === 'function') this._flush(function (er) {
          done(stream, er);
        });else done(stream);
      });
    }

    Transform.prototype.push = function (chunk, encoding) {
      this._transformState.needTransform = false;
      return Duplex.prototype.push.call(this, chunk, encoding);
    };

    // This is the part where you do stuff!
    // override this function in implementation classes.
    // 'chunk' is an input chunk.
    //
    // Call `push(newChunk)` to pass along transformed output
    // to the readable side.  You may call 'push' zero or more times.
    //
    // Call `cb(err)` when you are done with this chunk.  If you pass
    // an error, then that'll put the hurt on the whole operation.  If you
    // never call cb(), then you'll never get another chunk.
    Transform.prototype._transform = function (chunk, encoding, cb) {
      throw new Error('Not implemented');
    };

    Transform.prototype._write = function (chunk, encoding, cb) {
      var ts = this._transformState;
      ts.writecb = cb;
      ts.writechunk = chunk;
      ts.writeencoding = encoding;
      if (!ts.transforming) {
        var rs = this._readableState;
        if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
      }
    };

    // Doesn't matter what the args are here.
    // _transform does all the work.
    // That we got here means that the readable side wants more data.
    Transform.prototype._read = function (n) {
      var ts = this._transformState;

      if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
        ts.transforming = true;
        this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
      } else {
        // mark that we need a transform, so that any data that comes in
        // will get processed, now that we've asked for it.
        ts.needTransform = true;
      }
    };

    function done(stream, er) {
      if (er) return stream.emit('error', er);

      // if there's nothing in the write buffer, then that means
      // that nothing more will ever be provided
      var ws = stream._writableState;
      var ts = stream._transformState;

      if (ws.length) throw new Error('Calling transform done when ws.length != 0');

      if (ts.transforming) throw new Error('Calling transform done when still transforming');

      return stream.push(null);
    }

    inherits$1(PassThrough, Transform);
    function PassThrough(options) {
      if (!(this instanceof PassThrough)) return new PassThrough(options);

      Transform.call(this, options);
    }

    PassThrough.prototype._transform = function (chunk, encoding, cb) {
      cb(null, chunk);
    };

    inherits$1(Stream, EventEmitter$1);
    Stream.Readable = Readable;
    Stream.Writable = Writable;
    Stream.Duplex = Duplex;
    Stream.Transform = Transform;
    Stream.PassThrough = PassThrough;

    // Backwards-compat with node 0.4.x
    Stream.Stream = Stream;

    // old-style streams.  Note that the pipe method (the only relevant
    // part of this class) is overridden in the Readable class.

    function Stream() {
      EventEmitter$1.call(this);
    }

    Stream.prototype.pipe = function(dest, options) {
      var source = this;

      function ondata(chunk) {
        if (dest.writable) {
          if (false === dest.write(chunk) && source.pause) {
            source.pause();
          }
        }
      }

      source.on('data', ondata);

      function ondrain() {
        if (source.readable && source.resume) {
          source.resume();
        }
      }

      dest.on('drain', ondrain);

      // If the 'end' option is not supplied, dest.end() will be called when
      // source gets the 'end' or 'close' events.  Only dest.end() once.
      if (!dest._isStdio && (!options || options.end !== false)) {
        source.on('end', onend);
        source.on('close', onclose);
      }

      var didOnEnd = false;
      function onend() {
        if (didOnEnd) return;
        didOnEnd = true;

        dest.end();
      }


      function onclose() {
        if (didOnEnd) return;
        didOnEnd = true;

        if (typeof dest.destroy === 'function') dest.destroy();
      }

      // don't leave dangling pipes when there are errors.
      function onerror(er) {
        cleanup();
        if (EventEmitter$1.listenerCount(this, 'error') === 0) {
          throw er; // Unhandled stream error in pipe.
        }
      }

      source.on('error', onerror);
      dest.on('error', onerror);

      // remove all the event listeners that were added.
      function cleanup() {
        source.removeListener('data', ondata);
        dest.removeListener('drain', ondrain);

        source.removeListener('end', onend);
        source.removeListener('close', onclose);

        source.removeListener('error', onerror);
        dest.removeListener('error', onerror);

        source.removeListener('end', cleanup);
        source.removeListener('close', cleanup);

        dest.removeListener('close', cleanup);
      }

      source.on('end', cleanup);
      source.on('close', cleanup);

      dest.on('close', cleanup);

      dest.emit('pipe', source);

      // Allow for unix-like usage: A.pipe(B).pipe(C)
      return dest;
    };

    var _polyfillNode_stream = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': Stream,
        Readable: Readable,
        Writable: Writable,
        Duplex: Duplex,
        Transform: Transform,
        PassThrough: PassThrough,
        Stream: Stream
    });

    var rStates = {
      UNSENT: 0,
      OPENED: 1,
      HEADERS_RECEIVED: 2,
      LOADING: 3,
      DONE: 4
    };
    function IncomingMessage(xhr, response, mode) {
      var self = this;
      Readable.call(self);

      self._mode = mode;
      self.headers = {};
      self.rawHeaders = [];
      self.trailers = {};
      self.rawTrailers = [];

      // Fake the 'close' event, but only once 'end' fires
      self.on('end', function() {
        // The nextTick is necessary to prevent the 'request' module from causing an infinite loop
        browser$1.nextTick(function() {
          self.emit('close');
        });
      });
      var read;
      if (mode === 'fetch') {
        self._fetchResponse = response;

        self.url = response.url;
        self.statusCode = response.status;
        self.statusMessage = response.statusText;
          // backwards compatible version of for (<item> of <iterable>):
          // for (var <item>,_i,_it = <iterable>[Symbol.iterator](); <item> = (_i = _it.next()).value,!_i.done;)
        for (var header, _i, _it = response.headers[Symbol.iterator](); header = (_i = _it.next()).value, !_i.done;) {
          self.headers[header[0].toLowerCase()] = header[1];
          self.rawHeaders.push(header[0], header[1]);
        }

        // TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
        var reader = response.body.getReader();

        read = function () {
          reader.read().then(function(result) {
            if (self._destroyed)
              return
            if (result.done) {
              self.push(null);
              return
            }
            self.push(new Buffer(result.value));
            read();
          });
        };
        read();

      } else {
        self._xhr = xhr;
        self._pos = 0;

        self.url = xhr.responseURL;
        self.statusCode = xhr.status;
        self.statusMessage = xhr.statusText;
        var headers = xhr.getAllResponseHeaders().split(/\r?\n/);
        headers.forEach(function(header) {
          var matches = header.match(/^([^:]+):\s*(.*)/);
          if (matches) {
            var key = matches[1].toLowerCase();
            if (key === 'set-cookie') {
              if (self.headers[key] === undefined) {
                self.headers[key] = [];
              }
              self.headers[key].push(matches[2]);
            } else if (self.headers[key] !== undefined) {
              self.headers[key] += ', ' + matches[2];
            } else {
              self.headers[key] = matches[2];
            }
            self.rawHeaders.push(matches[1], matches[2]);
          }
        });

        self._charset = 'x-user-defined';
        if (!overrideMimeType) {
          var mimeType = self.rawHeaders['mime-type'];
          if (mimeType) {
            var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/);
            if (charsetMatch) {
              self._charset = charsetMatch[1].toLowerCase();
            }
          }
          if (!self._charset)
            self._charset = 'utf-8'; // best guess
        }
      }
    }

    inherits$1(IncomingMessage, Readable);

    IncomingMessage.prototype._read = function() {};

    IncomingMessage.prototype._onXHRProgress = function() {
      var self = this;

      var xhr = self._xhr;

      var response = null;
      switch (self._mode) {
      case 'text:vbarray': // For IE9
        if (xhr.readyState !== rStates.DONE)
          break
        try {
          // This fails in IE8
          response = new global$1.VBArray(xhr.responseBody).toArray();
        } catch (e) {
          // pass
        }
        if (response !== null) {
          self.push(new Buffer(response));
          break
        }
        // Falls through in IE8
      case 'text':
        try { // This will fail when readyState = 3 in IE9. Switch mode and wait for readyState = 4
          response = xhr.responseText;
        } catch (e) {
          self._mode = 'text:vbarray';
          break
        }
        if (response.length > self._pos) {
          var newData = response.substr(self._pos);
          if (self._charset === 'x-user-defined') {
            var buffer = new Buffer(newData.length);
            for (var i = 0; i < newData.length; i++)
              buffer[i] = newData.charCodeAt(i) & 0xff;

            self.push(buffer);
          } else {
            self.push(newData, self._charset);
          }
          self._pos = response.length;
        }
        break
      case 'arraybuffer':
        if (xhr.readyState !== rStates.DONE || !xhr.response)
          break
        response = xhr.response;
        self.push(new Buffer(new Uint8Array(response)));
        break
      case 'moz-chunked-arraybuffer': // take whole
        response = xhr.response;
        if (xhr.readyState !== rStates.LOADING || !response)
          break
        self.push(new Buffer(new Uint8Array(response)));
        break
      case 'ms-stream':
        response = xhr.response;
        if (xhr.readyState !== rStates.LOADING)
          break
        var reader = new global$1.MSStreamReader();
        reader.onprogress = function() {
          if (reader.result.byteLength > self._pos) {
            self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos))));
            self._pos = reader.result.byteLength;
          }
        };
        reader.onload = function() {
          self.push(null);
        };
          // reader.onerror = ??? // TODO: this
        reader.readAsArrayBuffer(response);
        break
      }

      // The ms-stream case handles end separately in reader.onload()
      if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
        self.push(null);
      }
    };

    // from https://github.com/jhiesey/to-arraybuffer/blob/6502d9850e70ba7935a7df4ad86b358fc216f9f0/index.js
    function toArrayBuffer (buf) {
      // If the buffer is backed by a Uint8Array, a faster version will work
      if (buf instanceof Uint8Array) {
        // If the buffer isn't a subarray, return the underlying ArrayBuffer
        if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
          return buf.buffer
        } else if (typeof buf.buffer.slice === 'function') {
          // Otherwise we need to get a proper copy
          return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
        }
      }

      if (isBuffer(buf)) {
        // This is the slow version that will work with any Buffer
        // implementation (even in old browsers)
        var arrayCopy = new Uint8Array(buf.length);
        var len = buf.length;
        for (var i = 0; i < len; i++) {
          arrayCopy[i] = buf[i];
        }
        return arrayCopy.buffer
      } else {
        throw new Error('Argument must be a Buffer')
      }
    }

    function decideMode(preferBinary, useFetch) {
      if (hasFetch && useFetch) {
        return 'fetch'
      } else if (mozchunkedarraybuffer) {
        return 'moz-chunked-arraybuffer'
      } else if (msstream) {
        return 'ms-stream'
      } else if (arraybuffer && preferBinary) {
        return 'arraybuffer'
      } else if (vbArray && preferBinary) {
        return 'text:vbarray'
      } else {
        return 'text'
      }
    }

    function ClientRequest(opts) {
      var self = this;
      Writable.call(self);

      self._opts = opts;
      self._body = [];
      self._headers = {};
      if (opts.auth)
        self.setHeader('Authorization', 'Basic ' + new Buffer(opts.auth).toString('base64'));
      Object.keys(opts.headers).forEach(function(name) {
        self.setHeader(name, opts.headers[name]);
      });

      var preferBinary;
      var useFetch = true;
      if (opts.mode === 'disable-fetch') {
        // If the use of XHR should be preferred and includes preserving the 'content-type' header
        useFetch = false;
        preferBinary = true;
      } else if (opts.mode === 'prefer-streaming') {
        // If streaming is a high priority but binary compatibility and
        // the accuracy of the 'content-type' header aren't
        preferBinary = false;
      } else if (opts.mode === 'allow-wrong-content-type') {
        // If streaming is more important than preserving the 'content-type' header
        preferBinary = !overrideMimeType;
      } else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
        // Use binary if text streaming may corrupt data or the content-type header, or for speed
        preferBinary = true;
      } else {
        throw new Error('Invalid value for opts.mode')
      }
      self._mode = decideMode(preferBinary, useFetch);

      self.on('finish', function() {
        self._onFinish();
      });
    }

    inherits$1(ClientRequest, Writable);
    // Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
    var unsafeHeaders = [
      'accept-charset',
      'accept-encoding',
      'access-control-request-headers',
      'access-control-request-method',
      'connection',
      'content-length',
      'cookie',
      'cookie2',
      'date',
      'dnt',
      'expect',
      'host',
      'keep-alive',
      'origin',
      'referer',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
      'user-agent',
      'via'
    ];
    ClientRequest.prototype.setHeader = function(name, value) {
      var self = this;
      var lowerName = name.toLowerCase();
        // This check is not necessary, but it prevents warnings from browsers about setting unsafe
        // headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
        // http-browserify did it, so I will too.
      if (unsafeHeaders.indexOf(lowerName) !== -1)
        return

      self._headers[lowerName] = {
        name: name,
        value: value
      };
    };

    ClientRequest.prototype.getHeader = function(name) {
      var self = this;
      return self._headers[name.toLowerCase()].value
    };

    ClientRequest.prototype.removeHeader = function(name) {
      var self = this;
      delete self._headers[name.toLowerCase()];
    };

    ClientRequest.prototype._onFinish = function() {
      var self = this;

      if (self._destroyed)
        return
      var opts = self._opts;

      var headersObj = self._headers;
      var body;
      if (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'PATCH') {
        if (blobConstructor()) {
          body = new global$1.Blob(self._body.map(function(buffer) {
            return toArrayBuffer(buffer)
          }), {
            type: (headersObj['content-type'] || {}).value || ''
          });
        } else {
          // get utf8 string
          body = Buffer.concat(self._body).toString();
        }
      }

      if (self._mode === 'fetch') {
        var headers = Object.keys(headersObj).map(function(name) {
          return [headersObj[name].name, headersObj[name].value]
        });

        global$1.fetch(self._opts.url, {
          method: self._opts.method,
          headers: headers,
          body: body,
          mode: 'cors',
          credentials: opts.withCredentials ? 'include' : 'same-origin'
        }).then(function(response) {
          self._fetchResponse = response;
          self._connect();
        }, function(reason) {
          self.emit('error', reason);
        });
      } else {
        var xhr = self._xhr = new global$1.XMLHttpRequest();
        try {
          xhr.open(self._opts.method, self._opts.url, true);
        } catch (err) {
          browser$1.nextTick(function() {
            self.emit('error', err);
          });
          return
        }

        // Can't set responseType on really old browsers
        if ('responseType' in xhr)
          xhr.responseType = self._mode.split(':')[0];

        if ('withCredentials' in xhr)
          xhr.withCredentials = !!opts.withCredentials;

        if (self._mode === 'text' && 'overrideMimeType' in xhr)
          xhr.overrideMimeType('text/plain; charset=x-user-defined');

        Object.keys(headersObj).forEach(function(name) {
          xhr.setRequestHeader(headersObj[name].name, headersObj[name].value);
        });

        self._response = null;
        xhr.onreadystatechange = function() {
          switch (xhr.readyState) {
          case rStates.LOADING:
          case rStates.DONE:
            self._onXHRProgress();
            break
          }
        };
          // Necessary for streaming in Firefox, since xhr.response is ONLY defined
          // in onprogress, not in onreadystatechange with xhr.readyState = 3
        if (self._mode === 'moz-chunked-arraybuffer') {
          xhr.onprogress = function() {
            self._onXHRProgress();
          };
        }

        xhr.onerror = function() {
          if (self._destroyed)
            return
          self.emit('error', new Error('XHR error'));
        };

        try {
          xhr.send(body);
        } catch (err) {
          browser$1.nextTick(function() {
            self.emit('error', err);
          });
          return
        }
      }
    };

    /**
     * Checks if xhr.status is readable and non-zero, indicating no error.
     * Even though the spec says it should be available in readyState 3,
     * accessing it throws an exception in IE8
     */
    function statusValid(xhr) {
      try {
        var status = xhr.status;
        return (status !== null && status !== 0)
      } catch (e) {
        return false
      }
    }

    ClientRequest.prototype._onXHRProgress = function() {
      var self = this;

      if (!statusValid(self._xhr) || self._destroyed)
        return

      if (!self._response)
        self._connect();

      self._response._onXHRProgress();
    };

    ClientRequest.prototype._connect = function() {
      var self = this;

      if (self._destroyed)
        return

      self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode);
      self.emit('response', self._response);
    };

    ClientRequest.prototype._write = function(chunk, encoding, cb) {
      var self = this;

      self._body.push(chunk);
      cb();
    };

    ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function() {
      var self = this;
      self._destroyed = true;
      if (self._response)
        self._response._destroyed = true;
      if (self._xhr)
        self._xhr.abort();
        // Currently, there isn't a way to truly abort a fetch.
        // If you like bikeshedding, see https://github.com/whatwg/fetch/issues/27
    };

    ClientRequest.prototype.end = function(data, encoding, cb) {
      var self = this;
      if (typeof data === 'function') {
        cb = data;
        data = undefined;
      }

      Writable.prototype.end.call(self, data, encoding, cb);
    };

    ClientRequest.prototype.flushHeaders = function() {};
    ClientRequest.prototype.setTimeout = function() {};
    ClientRequest.prototype.setNoDelay = function() {};
    ClientRequest.prototype.setSocketKeepAlive = function() {};

    /*! https://mths.be/punycode v1.4.1 by @mathias */


    /** Highest positive signed 32-bit float value */
    var maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1

    /** Bootstring parameters */
    var base = 36;
    var tMin = 1;
    var tMax = 26;
    var skew = 38;
    var damp = 700;
    var initialBias = 72;
    var initialN = 128; // 0x80
    var delimiter = '-'; // '\x2D'
    var regexNonASCII = /[^\x20-\x7E]/; // unprintable ASCII chars + non-ASCII chars
    var regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g; // RFC 3490 separators

    /** Error messages */
    var errors = {
      'overflow': 'Overflow: input needs wider integers to process',
      'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
      'invalid-input': 'Invalid input'
    };

    /** Convenience shortcuts */
    var baseMinusTMin = base - tMin;
    var floor = Math.floor;
    var stringFromCharCode = String.fromCharCode;

    /*--------------------------------------------------------------------------*/

    /**
     * A generic error utility function.
     * @private
     * @param {String} type The error type.
     * @returns {Error} Throws a `RangeError` with the applicable error message.
     */
    function error(type) {
      throw new RangeError(errors[type]);
    }

    /**
     * A generic `Array#map` utility function.
     * @private
     * @param {Array} array The array to iterate over.
     * @param {Function} callback The function that gets called for every array
     * item.
     * @returns {Array} A new array of values returned by the callback function.
     */
    function map$1(array, fn) {
      var length = array.length;
      var result = [];
      while (length--) {
        result[length] = fn(array[length]);
      }
      return result;
    }

    /**
     * A simple `Array#map`-like wrapper to work with domain name strings or email
     * addresses.
     * @private
     * @param {String} domain The domain name or email address.
     * @param {Function} callback The function that gets called for every
     * character.
     * @returns {Array} A new string of characters returned by the callback
     * function.
     */
    function mapDomain(string, fn) {
      var parts = string.split('@');
      var result = '';
      if (parts.length > 1) {
        // In email addresses, only the domain name should be punycoded. Leave
        // the local part (i.e. everything up to `@`) intact.
        result = parts[0] + '@';
        string = parts[1];
      }
      // Avoid `split(regex)` for IE8 compatibility. See #17.
      string = string.replace(regexSeparators, '\x2E');
      var labels = string.split('.');
      var encoded = map$1(labels, fn).join('.');
      return result + encoded;
    }

    /**
     * Creates an array containing the numeric code points of each Unicode
     * character in the string. While JavaScript uses UCS-2 internally,
     * this function will convert a pair of surrogate halves (each of which
     * UCS-2 exposes as separate characters) into a single code point,
     * matching UTF-16.
     * @see `punycode.ucs2.encode`
     * @see <https://mathiasbynens.be/notes/javascript-encoding>
     * @memberOf punycode.ucs2
     * @name decode
     * @param {String} string The Unicode input string (UCS-2).
     * @returns {Array} The new array of code points.
     */
    function ucs2decode(string) {
      var output = [],
        counter = 0,
        length = string.length,
        value,
        extra;
      while (counter < length) {
        value = string.charCodeAt(counter++);
        if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
          // high surrogate, and there is a next character
          extra = string.charCodeAt(counter++);
          if ((extra & 0xFC00) == 0xDC00) { // low surrogate
            output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
          } else {
            // unmatched surrogate; only append this code unit, in case the next
            // code unit is the high surrogate of a surrogate pair
            output.push(value);
            counter--;
          }
        } else {
          output.push(value);
        }
      }
      return output;
    }

    /**
     * Converts a digit/integer into a basic code point.
     * @see `basicToDigit()`
     * @private
     * @param {Number} digit The numeric value of a basic code point.
     * @returns {Number} The basic code point whose value (when used for
     * representing integers) is `digit`, which needs to be in the range
     * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
     * used; else, the lowercase form is used. The behavior is undefined
     * if `flag` is non-zero and `digit` has no uppercase form.
     */
    function digitToBasic(digit, flag) {
      //  0..25 map to ASCII a..z or A..Z
      // 26..35 map to ASCII 0..9
      return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
    }

    /**
     * Bias adaptation function as per section 3.4 of RFC 3492.
     * https://tools.ietf.org/html/rfc3492#section-3.4
     * @private
     */
    function adapt(delta, numPoints, firstTime) {
      var k = 0;
      delta = firstTime ? floor(delta / damp) : delta >> 1;
      delta += floor(delta / numPoints);
      for ( /* no initialization */ ; delta > baseMinusTMin * tMax >> 1; k += base) {
        delta = floor(delta / baseMinusTMin);
      }
      return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
    }

    /**
     * Converts a string of Unicode symbols (e.g. a domain name label) to a
     * Punycode string of ASCII-only symbols.
     * @memberOf punycode
     * @param {String} input The string of Unicode symbols.
     * @returns {String} The resulting Punycode string of ASCII-only symbols.
     */
    function encode(input) {
      var n,
        delta,
        handledCPCount,
        basicLength,
        bias,
        j,
        m,
        q,
        k,
        t,
        currentValue,
        output = [],
        /** `inputLength` will hold the number of code points in `input`. */
        inputLength,
        /** Cached calculation results */
        handledCPCountPlusOne,
        baseMinusT,
        qMinusT;

      // Convert the input in UCS-2 to Unicode
      input = ucs2decode(input);

      // Cache the length
      inputLength = input.length;

      // Initialize the state
      n = initialN;
      delta = 0;
      bias = initialBias;

      // Handle the basic code points
      for (j = 0; j < inputLength; ++j) {
        currentValue = input[j];
        if (currentValue < 0x80) {
          output.push(stringFromCharCode(currentValue));
        }
      }

      handledCPCount = basicLength = output.length;

      // `handledCPCount` is the number of code points that have been handled;
      // `basicLength` is the number of basic code points.

      // Finish the basic string - if it is not empty - with a delimiter
      if (basicLength) {
        output.push(delimiter);
      }

      // Main encoding loop:
      while (handledCPCount < inputLength) {

        // All non-basic code points < n have been handled already. Find the next
        // larger one:
        for (m = maxInt, j = 0; j < inputLength; ++j) {
          currentValue = input[j];
          if (currentValue >= n && currentValue < m) {
            m = currentValue;
          }
        }

        // Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
        // but guard against overflow
        handledCPCountPlusOne = handledCPCount + 1;
        if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
          error('overflow');
        }

        delta += (m - n) * handledCPCountPlusOne;
        n = m;

        for (j = 0; j < inputLength; ++j) {
          currentValue = input[j];

          if (currentValue < n && ++delta > maxInt) {
            error('overflow');
          }

          if (currentValue == n) {
            // Represent delta as a generalized variable-length integer
            for (q = delta, k = base; /* no condition */ ; k += base) {
              t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
              if (q < t) {
                break;
              }
              qMinusT = q - t;
              baseMinusT = base - t;
              output.push(
                stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
              );
              q = floor(qMinusT / baseMinusT);
            }

            output.push(stringFromCharCode(digitToBasic(q, 0)));
            bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
            delta = 0;
            ++handledCPCount;
          }
        }

        ++delta;
        ++n;

      }
      return output.join('');
    }

    /**
     * Converts a Unicode string representing a domain name or an email address to
     * Punycode. Only the non-ASCII parts of the domain name will be converted,
     * i.e. it doesn't matter if you call it with a domain that's already in
     * ASCII.
     * @memberOf punycode
     * @param {String} input The domain name or email address to convert, as a
     * Unicode string.
     * @returns {String} The Punycode representation of the given domain name or
     * email address.
     */
    function toASCII(input) {
      return mapDomain(input, function(string) {
        return regexNonASCII.test(string) ?
          'xn--' + encode(string) :
          string;
      });
    }

    // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.


    // If obj.hasOwnProperty has been overridden, then calling
    // obj.hasOwnProperty(prop) will break.
    // See: https://github.com/joyent/node/issues/1707
    function hasOwnProperty(obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    }
    var isArray = Array.isArray || function (xs) {
      return Object.prototype.toString.call(xs) === '[object Array]';
    };
    function stringifyPrimitive(v) {
      switch (typeof v) {
        case 'string':
          return v;

        case 'boolean':
          return v ? 'true' : 'false';

        case 'number':
          return isFinite(v) ? v : '';

        default:
          return '';
      }
    }

    function stringify (obj, sep, eq, name) {
      sep = sep || '&';
      eq = eq || '=';
      if (obj === null) {
        obj = undefined;
      }

      if (typeof obj === 'object') {
        return map(objectKeys(obj), function(k) {
          var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
          if (isArray(obj[k])) {
            return map(obj[k], function(v) {
              return ks + encodeURIComponent(stringifyPrimitive(v));
            }).join(sep);
          } else {
            return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
          }
        }).join(sep);

      }

      if (!name) return '';
      return encodeURIComponent(stringifyPrimitive(name)) + eq +
             encodeURIComponent(stringifyPrimitive(obj));
    }
    function map (xs, f) {
      if (xs.map) return xs.map(f);
      var res = [];
      for (var i = 0; i < xs.length; i++) {
        res.push(f(xs[i], i));
      }
      return res;
    }

    var objectKeys = Object.keys || function (obj) {
      var res = [];
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
      }
      return res;
    };

    function parse$1(qs, sep, eq, options) {
      sep = sep || '&';
      eq = eq || '=';
      var obj = {};

      if (typeof qs !== 'string' || qs.length === 0) {
        return obj;
      }

      var regexp = /\+/g;
      qs = qs.split(sep);

      var maxKeys = 1000;
      if (options && typeof options.maxKeys === 'number') {
        maxKeys = options.maxKeys;
      }

      var len = qs.length;
      // maxKeys <= 0 means that we should not limit keys count
      if (maxKeys > 0 && len > maxKeys) {
        len = maxKeys;
      }

      for (var i = 0; i < len; ++i) {
        var x = qs[i].replace(regexp, '%20'),
            idx = x.indexOf(eq),
            kstr, vstr, k, v;

        if (idx >= 0) {
          kstr = x.substr(0, idx);
          vstr = x.substr(idx + 1);
        } else {
          kstr = x;
          vstr = '';
        }

        k = decodeURIComponent(kstr);
        v = decodeURIComponent(vstr);

        if (!hasOwnProperty(obj, k)) {
          obj[k] = v;
        } else if (isArray(obj[k])) {
          obj[k].push(v);
        } else {
          obj[k] = [obj[k], v];
        }
      }

      return obj;
    }

    // Copyright Joyent, Inc. and other Node contributors.
    var _polyfillNode_url = {
      parse: urlParse,
      resolve: urlResolve,
      resolveObject: urlResolveObject,
      fileURLToPath: urlFileURLToPath,
      format: urlFormat,
      Url: Url
    };
    function Url() {
      this.protocol = null;
      this.slashes = null;
      this.auth = null;
      this.host = null;
      this.port = null;
      this.hostname = null;
      this.hash = null;
      this.search = null;
      this.query = null;
      this.pathname = null;
      this.path = null;
      this.href = null;
    }

    // Reference: RFC 3986, RFC 1808, RFC 2396

    // define these here so at least they only have to be
    // compiled once on the first module load.
    var protocolPattern = /^([a-z0-9.+-]+:)/i,
      portPattern = /:[0-9]*$/,

      // Special case for a simple path URL
      simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

      // RFC 2396: characters reserved for delimiting URLs.
      // We actually just auto-escape these.
      delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

      // RFC 2396: characters not allowed for various reasons.
      unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

      // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
      autoEscape = ['\''].concat(unwise),
      // Characters that are never ever allowed in a hostname.
      // Note that any invalid chars are also handled, but these
      // are the ones that are *expected* to be seen, so we fast-path
      // them.
      nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
      hostEndingChars = ['/', '?', '#'],
      hostnameMaxLen = 255,
      hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
      hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
      // protocols that can allow "unsafe" and "unwise" chars.
      unsafeProtocol = {
        'javascript': true,
        'javascript:': true
      },
      // protocols that never have a hostname.
      hostlessProtocol = {
        'javascript': true,
        'javascript:': true
      },
      // protocols that always contain a // bit.
      slashedProtocol = {
        'http': true,
        'https': true,
        'ftp': true,
        'gopher': true,
        'file': true,
        'http:': true,
        'https:': true,
        'ftp:': true,
        'gopher:': true,
        'file:': true
      };

    function urlParse(url, parseQueryString, slashesDenoteHost) {
      if (url && isObject(url) && url instanceof Url) return url;

      var u = new Url;
      u.parse(url, parseQueryString, slashesDenoteHost);
      return u;
    }
    Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
      return parse(this, url, parseQueryString, slashesDenoteHost);
    };

    function parse(self, url, parseQueryString, slashesDenoteHost) {
      if (!isString(url)) {
        throw new TypeError('Parameter \'url\' must be a string, not ' + typeof url);
      }

      // Copy chrome, IE, opera backslash-handling behavior.
      // Back slashes before the query string get converted to forward slashes
      // See: https://code.google.com/p/chromium/issues/detail?id=25916
      var queryIndex = url.indexOf('?'),
        splitter =
        (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
        uSplit = url.split(splitter),
        slashRegex = /\\/g;
      uSplit[0] = uSplit[0].replace(slashRegex, '/');
      url = uSplit.join(splitter);

      var rest = url;

      // trim before proceeding.
      // This is to support parse stuff like "  http://foo.com  \n"
      rest = rest.trim();

      if (!slashesDenoteHost && url.split('#').length === 1) {
        // Try fast path regexp
        var simplePath = simplePathPattern.exec(rest);
        if (simplePath) {
          self.path = rest;
          self.href = rest;
          self.pathname = simplePath[1];
          if (simplePath[2]) {
            self.search = simplePath[2];
            if (parseQueryString) {
              self.query = parse$1(self.search.substr(1));
            } else {
              self.query = self.search.substr(1);
            }
          } else if (parseQueryString) {
            self.search = '';
            self.query = {};
          }
          return self;
        }
      }

      var proto = protocolPattern.exec(rest);
      if (proto) {
        proto = proto[0];
        var lowerProto = proto.toLowerCase();
        self.protocol = lowerProto;
        rest = rest.substr(proto.length);
      }

      // figure out if it's got a host
      // user@server is *always* interpreted as a hostname, and url
      // resolution will treat //foo/bar as host=foo,path=bar because that's
      // how the browser resolves relative URLs.
      if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
        var slashes = rest.substr(0, 2) === '//';
        if (slashes && !(proto && hostlessProtocol[proto])) {
          rest = rest.substr(2);
          self.slashes = true;
        }
      }
      var i, hec, l, p;
      if (!hostlessProtocol[proto] &&
        (slashes || (proto && !slashedProtocol[proto]))) {

        // there's a hostname.
        // the first instance of /, ?, ;, or # ends the host.
        //
        // If there is an @ in the hostname, then non-host chars *are* allowed
        // to the left of the last @ sign, unless some host-ending character
        // comes *before* the @-sign.
        // URLs are obnoxious.
        //
        // ex:
        // http://a@b@c/ => user:a@b host:c
        // http://a@b?@c => user:a host:c path:/?@c

        // v0.12 TODO(isaacs): This is not quite how Chrome does things.
        // Review our test case against browsers more comprehensively.

        // find the first instance of any hostEndingChars
        var hostEnd = -1;
        for (i = 0; i < hostEndingChars.length; i++) {
          hec = rest.indexOf(hostEndingChars[i]);
          if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
            hostEnd = hec;
        }

        // at this point, either we have an explicit point where the
        // auth portion cannot go past, or the last @ char is the decider.
        var auth, atSign;
        if (hostEnd === -1) {
          // atSign can be anywhere.
          atSign = rest.lastIndexOf('@');
        } else {
          // atSign must be in auth portion.
          // http://a@b/c@d => host:b auth:a path:/c@d
          atSign = rest.lastIndexOf('@', hostEnd);
        }

        // Now we have a portion which is definitely the auth.
        // Pull that off.
        if (atSign !== -1) {
          auth = rest.slice(0, atSign);
          rest = rest.slice(atSign + 1);
          self.auth = decodeURIComponent(auth);
        }

        // the host is the remaining to the left of the first non-host char
        hostEnd = -1;
        for (i = 0; i < nonHostChars.length; i++) {
          hec = rest.indexOf(nonHostChars[i]);
          if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
            hostEnd = hec;
        }
        // if we still have not hit it, then the entire thing is a host.
        if (hostEnd === -1)
          hostEnd = rest.length;

        self.host = rest.slice(0, hostEnd);
        rest = rest.slice(hostEnd);

        // pull out port.
        parseHost(self);

        // we've indicated that there is a hostname,
        // so even if it's empty, it has to be present.
        self.hostname = self.hostname || '';

        // if hostname begins with [ and ends with ]
        // assume that it's an IPv6 address.
        var ipv6Hostname = self.hostname[0] === '[' &&
          self.hostname[self.hostname.length - 1] === ']';

        // validate a little.
        if (!ipv6Hostname) {
          var hostparts = self.hostname.split(/\./);
          for (i = 0, l = hostparts.length; i < l; i++) {
            var part = hostparts[i];
            if (!part) continue;
            if (!part.match(hostnamePartPattern)) {
              var newpart = '';
              for (var j = 0, k = part.length; j < k; j++) {
                if (part.charCodeAt(j) > 127) {
                  // we replace non-ASCII char with a temporary placeholder
                  // we need this to make sure size of hostname is not
                  // broken by replacing non-ASCII by nothing
                  newpart += 'x';
                } else {
                  newpart += part[j];
                }
              }
              // we test again with ASCII char only
              if (!newpart.match(hostnamePartPattern)) {
                var validParts = hostparts.slice(0, i);
                var notHost = hostparts.slice(i + 1);
                var bit = part.match(hostnamePartStart);
                if (bit) {
                  validParts.push(bit[1]);
                  notHost.unshift(bit[2]);
                }
                if (notHost.length) {
                  rest = '/' + notHost.join('.') + rest;
                }
                self.hostname = validParts.join('.');
                break;
              }
            }
          }
        }

        if (self.hostname.length > hostnameMaxLen) {
          self.hostname = '';
        } else {
          // hostnames are always lower case.
          self.hostname = self.hostname.toLowerCase();
        }

        if (!ipv6Hostname) {
          // IDNA Support: Returns a punycoded representation of "domain".
          // It only converts parts of the domain name that
          // have non-ASCII characters, i.e. it doesn't matter if
          // you call it with a domain that already is ASCII-only.
          self.hostname = toASCII(self.hostname);
        }

        p = self.port ? ':' + self.port : '';
        var h = self.hostname || '';
        self.host = h + p;
        self.href += self.host;

        // strip [ and ] from the hostname
        // the host field still retains them, though
        if (ipv6Hostname) {
          self.hostname = self.hostname.substr(1, self.hostname.length - 2);
          if (rest[0] !== '/') {
            rest = '/' + rest;
          }
        }
      }

      // now rest is set to the post-host stuff.
      // chop off any delim chars.
      if (!unsafeProtocol[lowerProto]) {

        // First, make 100% sure that any "autoEscape" chars get
        // escaped, even if encodeURIComponent doesn't think they
        // need to be.
        for (i = 0, l = autoEscape.length; i < l; i++) {
          var ae = autoEscape[i];
          if (rest.indexOf(ae) === -1)
            continue;
          var esc = encodeURIComponent(ae);
          if (esc === ae) {
            esc = escape(ae);
          }
          rest = rest.split(ae).join(esc);
        }
      }


      // chop off from the tail first.
      var hash = rest.indexOf('#');
      if (hash !== -1) {
        // got a fragment string.
        self.hash = rest.substr(hash);
        rest = rest.slice(0, hash);
      }
      var qm = rest.indexOf('?');
      if (qm !== -1) {
        self.search = rest.substr(qm);
        self.query = rest.substr(qm + 1);
        if (parseQueryString) {
          self.query = parse$1(self.query);
        }
        rest = rest.slice(0, qm);
      } else if (parseQueryString) {
        // no query string, but parseQueryString still requested
        self.search = '';
        self.query = {};
      }
      if (rest) self.pathname = rest;
      if (slashedProtocol[lowerProto] &&
        self.hostname && !self.pathname) {
        self.pathname = '/';
      }

      //to support http.request
      if (self.pathname || self.search) {
        p = self.pathname || '';
        var s = self.search || '';
        self.path = p + s;
      }

      // finally, reconstruct the href based on what has been validated.
      self.href = format(self);
      return self;
    }

    function urlFileURLToPath(path) {
      if (typeof path === 'string')
        path = new Url().parse(path);
      else if (!(path instanceof Url))
        throw new TypeError('The "path" argument must be of type string or an instance of URL. Received type ' + (typeof path) + String(path));
      if (path.protocol !== 'file:')
        throw new TypeError('The URL must be of scheme file');
      return getPathFromURLPosix(path);
    }

    function getPathFromURLPosix(url) {
      const pathname = url.pathname;
      for (let n = 0; n < pathname.length; n++) {
        if (pathname[n] === '%') {
          const third = pathname.codePointAt(n + 2) | 0x20;
          if (pathname[n + 1] === '2' && third === 102) {
            throw new TypeError(
              'must not include encoded / characters'
            );
          }
        }
      }
      return decodeURIComponent(pathname);
    }

    // format a parsed object into a url string
    function urlFormat(obj) {
      // ensure it's an object, and not a string url.
      // If it's an obj, this is a no-op.
      // this way, you can call url_format() on strings
      // to clean up potentially wonky urls.
      if (isString(obj)) obj = parse({}, obj);
      return format(obj);
    }

    function format(self) {
      var auth = self.auth || '';
      if (auth) {
        auth = encodeURIComponent(auth);
        auth = auth.replace(/%3A/i, ':');
        auth += '@';
      }

      var protocol = self.protocol || '',
        pathname = self.pathname || '',
        hash = self.hash || '',
        host = false,
        query = '';

      if (self.host) {
        host = auth + self.host;
      } else if (self.hostname) {
        host = auth + (self.hostname.indexOf(':') === -1 ?
          self.hostname :
          '[' + this.hostname + ']');
        if (self.port) {
          host += ':' + self.port;
        }
      }

      if (self.query &&
        isObject(self.query) &&
        Object.keys(self.query).length) {
        query = stringify(self.query);
      }

      var search = self.search || (query && ('?' + query)) || '';

      if (protocol && protocol.substr(-1) !== ':') protocol += ':';

      // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
      // unless they had them to begin with.
      if (self.slashes ||
        (!protocol || slashedProtocol[protocol]) && host !== false) {
        host = '//' + (host || '');
        if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
      } else if (!host) {
        host = '';
      }

      if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
      if (search && search.charAt(0) !== '?') search = '?' + search;

      pathname = pathname.replace(/[?#]/g, function(match) {
        return encodeURIComponent(match);
      });
      search = search.replace('#', '%23');

      return protocol + host + pathname + search + hash;
    }

    Url.prototype.format = function() {
      return format(this);
    };

    function urlResolve(source, relative) {
      return urlParse(source, false, true).resolve(relative);
    }

    Url.prototype.resolve = function(relative) {
      return this.resolveObject(urlParse(relative, false, true)).format();
    };

    function urlResolveObject(source, relative) {
      if (!source) return relative;
      return urlParse(source, false, true).resolveObject(relative);
    }

    Url.prototype.resolveObject = function(relative) {
      if (isString(relative)) {
        var rel = new Url();
        rel.parse(relative, false, true);
        relative = rel;
      }

      var result = new Url();
      var tkeys = Object.keys(this);
      for (var tk = 0; tk < tkeys.length; tk++) {
        var tkey = tkeys[tk];
        result[tkey] = this[tkey];
      }

      // hash is always overridden, no matter what.
      // even href="" will remove it.
      result.hash = relative.hash;

      // if the relative url is empty, then there's nothing left to do here.
      if (relative.href === '') {
        result.href = result.format();
        return result;
      }

      // hrefs like //foo/bar always cut to the protocol.
      if (relative.slashes && !relative.protocol) {
        // take everything except the protocol from relative
        var rkeys = Object.keys(relative);
        for (var rk = 0; rk < rkeys.length; rk++) {
          var rkey = rkeys[rk];
          if (rkey !== 'protocol')
            result[rkey] = relative[rkey];
        }

        //urlParse appends trailing / to urls like http://www.example.com
        if (slashedProtocol[result.protocol] &&
          result.hostname && !result.pathname) {
          result.path = result.pathname = '/';
        }

        result.href = result.format();
        return result;
      }
      var relPath;
      if (relative.protocol && relative.protocol !== result.protocol) {
        // if it's a known url protocol, then changing
        // the protocol does weird things
        // first, if it's not file:, then we MUST have a host,
        // and if there was a path
        // to begin with, then we MUST have a path.
        // if it is file:, then the host is dropped,
        // because that's known to be hostless.
        // anything else is assumed to be absolute.
        if (!slashedProtocol[relative.protocol]) {
          var keys = Object.keys(relative);
          for (var v = 0; v < keys.length; v++) {
            var k = keys[v];
            result[k] = relative[k];
          }
          result.href = result.format();
          return result;
        }

        result.protocol = relative.protocol;
        if (!relative.host && !hostlessProtocol[relative.protocol]) {
          relPath = (relative.pathname || '').split('/');
          while (relPath.length && !(relative.host = relPath.shift()));
          if (!relative.host) relative.host = '';
          if (!relative.hostname) relative.hostname = '';
          if (relPath[0] !== '') relPath.unshift('');
          if (relPath.length < 2) relPath.unshift('');
          result.pathname = relPath.join('/');
        } else {
          result.pathname = relative.pathname;
        }
        result.search = relative.search;
        result.query = relative.query;
        result.host = relative.host || '';
        result.auth = relative.auth;
        result.hostname = relative.hostname || relative.host;
        result.port = relative.port;
        // to support http.request
        if (result.pathname || result.search) {
          var p = result.pathname || '';
          var s = result.search || '';
          result.path = p + s;
        }
        result.slashes = result.slashes || relative.slashes;
        result.href = result.format();
        return result;
      }

      var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
        isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
        ),
        mustEndAbs = (isRelAbs || isSourceAbs ||
          (result.host && relative.pathname)),
        removeAllDots = mustEndAbs,
        srcPath = result.pathname && result.pathname.split('/') || [],
        psychotic = result.protocol && !slashedProtocol[result.protocol];
      relPath = relative.pathname && relative.pathname.split('/') || [];
      // if the url is a non-slashed url, then relative
      // links like ../.. should be able
      // to crawl up to the hostname, as well.  This is strange.
      // result.protocol has already been set by now.
      // Later on, put the first path part into the host field.
      if (psychotic) {
        result.hostname = '';
        result.port = null;
        if (result.host) {
          if (srcPath[0] === '') srcPath[0] = result.host;
          else srcPath.unshift(result.host);
        }
        result.host = '';
        if (relative.protocol) {
          relative.hostname = null;
          relative.port = null;
          if (relative.host) {
            if (relPath[0] === '') relPath[0] = relative.host;
            else relPath.unshift(relative.host);
          }
          relative.host = null;
        }
        mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
      }
      var authInHost;
      if (isRelAbs) {
        // it's absolute.
        result.host = (relative.host || relative.host === '') ?
          relative.host : result.host;
        result.hostname = (relative.hostname || relative.hostname === '') ?
          relative.hostname : result.hostname;
        result.search = relative.search;
        result.query = relative.query;
        srcPath = relPath;
        // fall through to the dot-handling below.
      } else if (relPath.length) {
        // it's relative
        // throw away the existing file, and take the new path instead.
        if (!srcPath) srcPath = [];
        srcPath.pop();
        srcPath = srcPath.concat(relPath);
        result.search = relative.search;
        result.query = relative.query;
      } else if (!isNullOrUndefined(relative.search)) {
        // just pull out the search.
        // like href='?foo'.
        // Put this after the other two cases because it simplifies the booleans
        if (psychotic) {
          result.hostname = result.host = srcPath.shift();
          //occationaly the auth can get stuck only in host
          //this especially happens in cases like
          //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
          authInHost = result.host && result.host.indexOf('@') > 0 ?
            result.host.split('@') : false;
          if (authInHost) {
            result.auth = authInHost.shift();
            result.host = result.hostname = authInHost.shift();
          }
        }
        result.search = relative.search;
        result.query = relative.query;
        //to support http.request
        if (!isNull(result.pathname) || !isNull(result.search)) {
          result.path = (result.pathname ? result.pathname : '') +
            (result.search ? result.search : '');
        }
        result.href = result.format();
        return result;
      }

      if (!srcPath.length) {
        // no path at all.  easy.
        // we've already handled the other stuff above.
        result.pathname = null;
        //to support http.request
        if (result.search) {
          result.path = '/' + result.search;
        } else {
          result.path = null;
        }
        result.href = result.format();
        return result;
      }

      // if a url ENDs in . or .., then it must get a trailing slash.
      // however, if it ends in anything else non-slashy,
      // then it must NOT get a trailing slash.
      var last = srcPath.slice(-1)[0];
      var hasTrailingSlash = (
        (result.host || relative.host || srcPath.length > 1) &&
        (last === '.' || last === '..') || last === '');

      // strip single dots, resolve double dots to parent dir
      // if the path tries to go above the root, `up` ends up > 0
      var up = 0;
      for (var i = srcPath.length; i >= 0; i--) {
        last = srcPath[i];
        if (last === '.') {
          srcPath.splice(i, 1);
        } else if (last === '..') {
          srcPath.splice(i, 1);
          up++;
        } else if (up) {
          srcPath.splice(i, 1);
          up--;
        }
      }

      // if the path is allowed to go above the root, restore leading ..s
      if (!mustEndAbs && !removeAllDots) {
        for (; up--; up) {
          srcPath.unshift('..');
        }
      }

      if (mustEndAbs && srcPath[0] !== '' &&
        (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
        srcPath.unshift('');
      }

      if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
        srcPath.push('');
      }

      var isAbsolute = srcPath[0] === '' ||
        (srcPath[0] && srcPath[0].charAt(0) === '/');

      // put the host back
      if (psychotic) {
        result.hostname = result.host = isAbsolute ? '' :
          srcPath.length ? srcPath.shift() : '';
        //occationaly the auth can get stuck only in host
        //this especially happens in cases like
        //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
        authInHost = result.host && result.host.indexOf('@') > 0 ?
          result.host.split('@') : false;
        if (authInHost) {
          result.auth = authInHost.shift();
          result.host = result.hostname = authInHost.shift();
        }
      }

      mustEndAbs = mustEndAbs || (result.host && srcPath.length);

      if (mustEndAbs && !isAbsolute) {
        srcPath.unshift('');
      }

      if (!srcPath.length) {
        result.pathname = null;
        result.path = null;
      } else {
        result.pathname = srcPath.join('/');
      }

      //to support request.http
      if (!isNull(result.pathname) || !isNull(result.search)) {
        result.path = (result.pathname ? result.pathname : '') +
          (result.search ? result.search : '');
      }
      result.auth = relative.auth || result.auth;
      result.slashes = result.slashes || relative.slashes;
      result.href = result.format();
      return result;
    };

    Url.prototype.parseHost = function() {
      return parseHost(this);
    };

    function parseHost(self) {
      var host = self.host;
      var port = portPattern.exec(host);
      if (port) {
        port = port[0];
        if (port !== ':') {
          self.port = port.substr(1);
        }
        host = host.substr(0, host.length - port.length);
      }
      if (host) self.hostname = host;
    }

    var _polyfillNode_url$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        parse: urlParse,
        resolve: urlResolve,
        resolveObject: urlResolveObject,
        fileURLToPath: urlFileURLToPath,
        format: urlFormat,
        'default': _polyfillNode_url,
        Url: Url
    });

    function request$1(opts, cb) {
      if (typeof opts === 'string')
        opts = urlParse(opts);


      // Normally, the page is loaded from http or https, so not specifying a protocol
      // will result in a (valid) protocol-relative url. However, this won't work if
      // the protocol is something else, like 'file:'
      var defaultProtocol = global$1.location.protocol.search(/^https?:$/) === -1 ? 'http:' : '';

      var protocol = opts.protocol || defaultProtocol;
      var host = opts.hostname || opts.host;
      var port = opts.port;
      var path = opts.path || '/';

      // Necessary for IPv6 addresses
      if (host && host.indexOf(':') !== -1)
        host = '[' + host + ']';

      // This may be a relative url. The browser should always be able to interpret it correctly.
      opts.url = (host ? (protocol + '//' + host) : '') + (port ? ':' + port : '') + path;
      opts.method = (opts.method || 'GET').toUpperCase();
      opts.headers = opts.headers || {};

      // Also valid opts.auth, opts.mode

      var req = new ClientRequest(opts);
      if (cb)
        req.on('response', cb);
      return req
    }

    function get$1(opts, cb) {
      var req = request$1(opts, cb);
      req.end();
      return req
    }

    function Agent$1() {}
    Agent$1.defaultMaxSockets = 4;

    var METHODS$1 = [
      'CHECKOUT',
      'CONNECT',
      'COPY',
      'DELETE',
      'GET',
      'HEAD',
      'LOCK',
      'M-SEARCH',
      'MERGE',
      'MKACTIVITY',
      'MKCOL',
      'MOVE',
      'NOTIFY',
      'OPTIONS',
      'PATCH',
      'POST',
      'PROPFIND',
      'PROPPATCH',
      'PURGE',
      'PUT',
      'REPORT',
      'SEARCH',
      'SUBSCRIBE',
      'TRACE',
      'UNLOCK',
      'UNSUBSCRIBE'
    ];
    var STATUS_CODES$1 = {
      100: 'Continue',
      101: 'Switching Protocols',
      102: 'Processing', // RFC 2518, obsoleted by RFC 4918
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      203: 'Non-Authoritative Information',
      204: 'No Content',
      205: 'Reset Content',
      206: 'Partial Content',
      207: 'Multi-Status', // RFC 4918
      300: 'Multiple Choices',
      301: 'Moved Permanently',
      302: 'Moved Temporarily',
      303: 'See Other',
      304: 'Not Modified',
      305: 'Use Proxy',
      307: 'Temporary Redirect',
      400: 'Bad Request',
      401: 'Unauthorized',
      402: 'Payment Required',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      406: 'Not Acceptable',
      407: 'Proxy Authentication Required',
      408: 'Request Time-out',
      409: 'Conflict',
      410: 'Gone',
      411: 'Length Required',
      412: 'Precondition Failed',
      413: 'Request Entity Too Large',
      414: 'Request-URI Too Large',
      415: 'Unsupported Media Type',
      416: 'Requested Range Not Satisfiable',
      417: 'Expectation Failed',
      418: 'I\'m a teapot', // RFC 2324
      422: 'Unprocessable Entity', // RFC 4918
      423: 'Locked', // RFC 4918
      424: 'Failed Dependency', // RFC 4918
      425: 'Unordered Collection', // RFC 4918
      426: 'Upgrade Required', // RFC 2817
      428: 'Precondition Required', // RFC 6585
      429: 'Too Many Requests', // RFC 6585
      431: 'Request Header Fields Too Large', // RFC 6585
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Time-out',
      505: 'HTTP Version Not Supported',
      506: 'Variant Also Negotiates', // RFC 2295
      507: 'Insufficient Storage', // RFC 4918
      509: 'Bandwidth Limit Exceeded',
      510: 'Not Extended', // RFC 2774
      511: 'Network Authentication Required' // RFC 6585
    };

    var _polyfillNode_http = {
      request: request$1,
      get: get$1,
      Agent: Agent$1,
      METHODS: METHODS$1,
      STATUS_CODES: STATUS_CODES$1
    };

    var _polyfillNode_http$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        request: request$1,
        get: get$1,
        Agent: Agent$1,
        METHODS: METHODS$1,
        STATUS_CODES: STATUS_CODES$1,
        'default': _polyfillNode_http
    });

    var require$$0$1 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_http$1);

    function request(opts, cb) {
      if (typeof opts === 'string')
        opts = urlParse(opts);


      // Normally, the page is loaded from http or https, so not specifying a protocol
      // will result in a (valid) protocol-relative url. However, this won't work if
      // the protocol is something else, like 'file:'
      var defaultProtocol = global$1.location.protocol.search(/^https?:$/) === -1 ? 'http:' : '';

      var protocol = opts.protocol || defaultProtocol;
      var host = opts.hostname || opts.host;
      var port = opts.port;
      var path = opts.path || '/';

      // Necessary for IPv6 addresses
      if (host && host.indexOf(':') !== -1)
        host = '[' + host + ']';

      // This may be a relative url. The browser should always be able to interpret it correctly.
      opts.url = (host ? (protocol + '//' + host) : '') + (port ? ':' + port : '') + path;
      opts.method = (opts.method || 'GET').toUpperCase();
      opts.headers = opts.headers || {};

      // Also valid opts.auth, opts.mode

      var req = new ClientRequest(opts);
      if (cb)
        req.on('response', cb);
      return req
    }

    function get(opts, cb) {
      var req = request(opts, cb);
      req.end();
      return req
    }

    function Agent() {}
    Agent.defaultMaxSockets = 4;

    var METHODS = [
      'CHECKOUT',
      'CONNECT',
      'COPY',
      'DELETE',
      'GET',
      'HEAD',
      'LOCK',
      'M-SEARCH',
      'MERGE',
      'MKACTIVITY',
      'MKCOL',
      'MOVE',
      'NOTIFY',
      'OPTIONS',
      'PATCH',
      'POST',
      'PROPFIND',
      'PROPPATCH',
      'PURGE',
      'PUT',
      'REPORT',
      'SEARCH',
      'SUBSCRIBE',
      'TRACE',
      'UNLOCK',
      'UNSUBSCRIBE'
    ];
    var STATUS_CODES = {
      100: 'Continue',
      101: 'Switching Protocols',
      102: 'Processing', // RFC 2518, obsoleted by RFC 4918
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      203: 'Non-Authoritative Information',
      204: 'No Content',
      205: 'Reset Content',
      206: 'Partial Content',
      207: 'Multi-Status', // RFC 4918
      300: 'Multiple Choices',
      301: 'Moved Permanently',
      302: 'Moved Temporarily',
      303: 'See Other',
      304: 'Not Modified',
      305: 'Use Proxy',
      307: 'Temporary Redirect',
      400: 'Bad Request',
      401: 'Unauthorized',
      402: 'Payment Required',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      406: 'Not Acceptable',
      407: 'Proxy Authentication Required',
      408: 'Request Time-out',
      409: 'Conflict',
      410: 'Gone',
      411: 'Length Required',
      412: 'Precondition Failed',
      413: 'Request Entity Too Large',
      414: 'Request-URI Too Large',
      415: 'Unsupported Media Type',
      416: 'Requested Range Not Satisfiable',
      417: 'Expectation Failed',
      418: 'I\'m a teapot', // RFC 2324
      422: 'Unprocessable Entity', // RFC 4918
      423: 'Locked', // RFC 4918
      424: 'Failed Dependency', // RFC 4918
      425: 'Unordered Collection', // RFC 4918
      426: 'Upgrade Required', // RFC 2817
      428: 'Precondition Required', // RFC 6585
      429: 'Too Many Requests', // RFC 6585
      431: 'Request Header Fields Too Large', // RFC 6585
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Time-out',
      505: 'HTTP Version Not Supported',
      506: 'Variant Also Negotiates', // RFC 2295
      507: 'Insufficient Storage', // RFC 4918
      509: 'Bandwidth Limit Exceeded',
      510: 'Not Extended', // RFC 2774
      511: 'Network Authentication Required' // RFC 6585
    };

    var _polyfillNode_https = {
      request,
      get,
      Agent,
      METHODS,
      STATUS_CODES
    };

    var _polyfillNode_https$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        request: request,
        get: get,
        Agent: Agent,
        METHODS: METHODS,
        STATUS_CODES: STATUS_CODES,
        'default': _polyfillNode_https
    });

    var require$$1$1 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_https$1);

    var require$$2 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_url$1);

    var config = {};

    /**
     * Copyright 2019-2020, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    Object.defineProperty(config, "__esModule", { value: true });
    config.DEFAULT_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
    config.MIN_UPDATE_INTERVAL = 1000;
    config.DEFAULT_URL_TEMPLATE = "https://cdn.optimizely.com/datafiles/%s.json";
    config.DEFAULT_AUTHENTICATED_URL_TEMPLATE = "https://config.optimizely.com/datafiles/auth/%s.json";
    config.BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT = [0, 8, 16, 32, 64, 128, 256, 512];
    config.REQUEST_TIMEOUT_MS = 60 * 1000; // 1 minute

    var decompressResponse$1 = {exports: {}};

    var require$$0 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_stream);

    var msg = {
      2:      'need dictionary',     /* Z_NEED_DICT       2  */
      1:      'stream end',          /* Z_STREAM_END      1  */
      0:      '',                    /* Z_OK              0  */
      '-1':   'file error',          /* Z_ERRNO         (-1) */
      '-2':   'stream error',        /* Z_STREAM_ERROR  (-2) */
      '-3':   'data error',          /* Z_DATA_ERROR    (-3) */
      '-4':   'insufficient memory', /* Z_MEM_ERROR     (-4) */
      '-5':   'buffer error',        /* Z_BUF_ERROR     (-5) */
      '-6':   'incompatible version' /* Z_VERSION_ERROR (-6) */
    };

    function ZStream() {
      /* next input byte */
      this.input = null; // JS specific, because we have no pointers
      this.next_in = 0;
      /* number of bytes available at input */
      this.avail_in = 0;
      /* total number of input bytes read so far */
      this.total_in = 0;
      /* next output byte should be put there */
      this.output = null; // JS specific, because we have no pointers
      this.next_out = 0;
      /* remaining free space at output */
      this.avail_out = 0;
      /* total number of bytes output so far */
      this.total_out = 0;
      /* last error message, NULL if no error */
      this.msg = ''/*Z_NULL*/;
      /* not visible by applications */
      this.state = null;
      /* best guess about the data type: binary or text */
      this.data_type = 2/*Z_UNKNOWN*/;
      /* adler32 value of the uncompressed data */
      this.adler = 0;
    }

    function arraySet(dest, src, src_offs, len, dest_offs) {
      if (src.subarray && dest.subarray) {
        dest.set(src.subarray(src_offs, src_offs + len), dest_offs);
        return;
      }
      // Fallback to ordinary array
      for (var i = 0; i < len; i++) {
        dest[dest_offs + i] = src[src_offs + i];
      }
    }


    var Buf8 = Uint8Array;
    var Buf16 = Uint16Array;
    var Buf32 = Int32Array;
    // Enable/Disable typed arrays use, for testing
    //

    /* Public constants ==========================================================*/
    /* ===========================================================================*/


    //var Z_FILTERED          = 1;
    //var Z_HUFFMAN_ONLY      = 2;
    //var Z_RLE               = 3;
    var Z_FIXED$2 = 4;
    //var Z_DEFAULT_STRATEGY  = 0;

    /* Possible values of the data_type field (though see inflate()) */
    var Z_BINARY$1 = 0;
    var Z_TEXT$1 = 1;
    //var Z_ASCII             = 1; // = Z_TEXT
    var Z_UNKNOWN$2 = 2;

    /*============================================================================*/


    function zero$1(buf) {
      var len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    }

    // From zutil.h

    var STORED_BLOCK = 0;
    var STATIC_TREES = 1;
    var DYN_TREES = 2;
    /* The three kinds of block type */

    var MIN_MATCH$1 = 3;
    var MAX_MATCH$1 = 258;
    /* The minimum and maximum match lengths */

    // From deflate.h
    /* ===========================================================================
     * Internal compression state.
     */

    var LENGTH_CODES$1 = 29;
    /* number of length codes, not counting the special END_BLOCK code */

    var LITERALS$1 = 256;
    /* number of literal bytes 0..255 */

    var L_CODES$1 = LITERALS$1 + 1 + LENGTH_CODES$1;
    /* number of Literal or Length codes, including the END_BLOCK code */

    var D_CODES$1 = 30;
    /* number of distance codes */

    var BL_CODES$1 = 19;
    /* number of codes used to transfer the bit lengths */

    var HEAP_SIZE$1 = 2 * L_CODES$1 + 1;
    /* maximum heap size */

    var MAX_BITS$1 = 15;
    /* All codes must not exceed MAX_BITS bits */

    var Buf_size = 16;
    /* size of bit buffer in bi_buf */


    /* ===========================================================================
     * Constants
     */

    var MAX_BL_BITS = 7;
    /* Bit length codes must not exceed MAX_BL_BITS bits */

    var END_BLOCK = 256;
    /* end of block literal code */

    var REP_3_6 = 16;
    /* repeat previous bit length 3-6 times (2 bits of repeat count) */

    var REPZ_3_10 = 17;
    /* repeat a zero length 3-10 times  (3 bits of repeat count) */

    var REPZ_11_138 = 18;
    /* repeat a zero length 11-138 times  (7 bits of repeat count) */

    /* eslint-disable comma-spacing,array-bracket-spacing */
    var extra_lbits = /* extra bits for each length code */ [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];

    var extra_dbits = /* extra bits for each distance code */ [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

    var extra_blbits = /* extra bits for each bit length code */ [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];

    var bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    /* eslint-enable comma-spacing,array-bracket-spacing */

    /* The lengths of the bit length codes are sent in order of decreasing
     * probability, to avoid transmitting the lengths for unused bit length codes.
     */

    /* ===========================================================================
     * Local data. These are initialized only once.
     */

    // We pre-fill arrays with 0 to avoid uninitialized gaps

    var DIST_CODE_LEN = 512; /* see definition of array dist_code below */

    // !!!! Use flat array insdead of structure, Freq = i*2, Len = i*2+1
    var static_ltree = new Array((L_CODES$1 + 2) * 2);
    zero$1(static_ltree);
    /* The static literal tree. Since the bit lengths are imposed, there is no
     * need for the L_CODES extra codes used during heap construction. However
     * The codes 286 and 287 are needed to build a canonical tree (see _tr_init
     * below).
     */

    var static_dtree = new Array(D_CODES$1 * 2);
    zero$1(static_dtree);
    /* The static distance tree. (Actually a trivial tree since all codes use
     * 5 bits.)
     */

    var _dist_code = new Array(DIST_CODE_LEN);
    zero$1(_dist_code);
    /* Distance codes. The first 256 values correspond to the distances
     * 3 .. 258, the last 256 values correspond to the top 8 bits of
     * the 15 bit distances.
     */

    var _length_code = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);
    zero$1(_length_code);
    /* length code for each normalized match length (0 == MIN_MATCH) */

    var base_length = new Array(LENGTH_CODES$1);
    zero$1(base_length);
    /* First normalized length for each code (0 = MIN_MATCH) */

    var base_dist = new Array(D_CODES$1);
    zero$1(base_dist);
    /* First normalized distance for each code (0 = distance of 1) */


    function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {

      this.static_tree = static_tree; /* static tree or NULL */
      this.extra_bits = extra_bits; /* extra bits for each code or NULL */
      this.extra_base = extra_base; /* base index for extra_bits */
      this.elems = elems; /* max number of elements in the tree */
      this.max_length = max_length; /* max bit length for the codes */

      // show if `static_tree` has data or dummy - needed for monomorphic objects
      this.has_stree = static_tree && static_tree.length;
    }


    var static_l_desc;
    var static_d_desc;
    var static_bl_desc;


    function TreeDesc(dyn_tree, stat_desc) {
      this.dyn_tree = dyn_tree; /* the dynamic tree */
      this.max_code = 0; /* largest code with non zero frequency */
      this.stat_desc = stat_desc; /* the corresponding static tree */
    }



    function d_code(dist) {
      return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
    }


    /* ===========================================================================
     * Output a short LSB first on the stream.
     * IN assertion: there is enough room in pendingBuf.
     */
    function put_short(s, w) {
      //    put_byte(s, (uch)((w) & 0xff));
      //    put_byte(s, (uch)((ush)(w) >> 8));
      s.pending_buf[s.pending++] = (w) & 0xff;
      s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
    }


    /* ===========================================================================
     * Send a value on a given number of bits.
     * IN assertion: length <= 16 and value fits in length bits.
     */
    function send_bits(s, value, length) {
      if (s.bi_valid > (Buf_size - length)) {
        s.bi_buf |= (value << s.bi_valid) & 0xffff;
        put_short(s, s.bi_buf);
        s.bi_buf = value >> (Buf_size - s.bi_valid);
        s.bi_valid += length - Buf_size;
      } else {
        s.bi_buf |= (value << s.bi_valid) & 0xffff;
        s.bi_valid += length;
      }
    }


    function send_code(s, c, tree) {
      send_bits(s, tree[c * 2] /*.Code*/ , tree[c * 2 + 1] /*.Len*/ );
    }


    /* ===========================================================================
     * Reverse the first len bits of a code, using straightforward code (a faster
     * method would use a table)
     * IN assertion: 1 <= len <= 15
     */
    function bi_reverse(code, len) {
      var res = 0;
      do {
        res |= code & 1;
        code >>>= 1;
        res <<= 1;
      } while (--len > 0);
      return res >>> 1;
    }


    /* ===========================================================================
     * Flush the bit buffer, keeping at most 7 bits in it.
     */
    function bi_flush(s) {
      if (s.bi_valid === 16) {
        put_short(s, s.bi_buf);
        s.bi_buf = 0;
        s.bi_valid = 0;

      } else if (s.bi_valid >= 8) {
        s.pending_buf[s.pending++] = s.bi_buf & 0xff;
        s.bi_buf >>= 8;
        s.bi_valid -= 8;
      }
    }


    /* ===========================================================================
     * Compute the optimal bit lengths for a tree and update the total bit length
     * for the current block.
     * IN assertion: the fields freq and dad are set, heap[heap_max] and
     *    above are the tree nodes sorted by increasing frequency.
     * OUT assertions: the field len is set to the optimal bit length, the
     *     array bl_count contains the frequencies for each bit length.
     *     The length opt_len is updated; static_len is also updated if stree is
     *     not null.
     */
    function gen_bitlen(s, desc) {
    //    deflate_state *s;
    //    tree_desc *desc;    /* the tree descriptor */
      var tree = desc.dyn_tree;
      var max_code = desc.max_code;
      var stree = desc.stat_desc.static_tree;
      var has_stree = desc.stat_desc.has_stree;
      var extra = desc.stat_desc.extra_bits;
      var base = desc.stat_desc.extra_base;
      var max_length = desc.stat_desc.max_length;
      var h; /* heap index */
      var n, m; /* iterate over the tree elements */
      var bits; /* bit length */
      var xbits; /* extra bits */
      var f; /* frequency */
      var overflow = 0; /* number of elements with bit length too large */

      for (bits = 0; bits <= MAX_BITS$1; bits++) {
        s.bl_count[bits] = 0;
      }

      /* In a first pass, compute the optimal bit lengths (which may
       * overflow in the case of the bit length tree).
       */
      tree[s.heap[s.heap_max] * 2 + 1] /*.Len*/ = 0; /* root of the heap */

      for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
        n = s.heap[h];
        bits = tree[tree[n * 2 + 1] /*.Dad*/ * 2 + 1] /*.Len*/ + 1;
        if (bits > max_length) {
          bits = max_length;
          overflow++;
        }
        tree[n * 2 + 1] /*.Len*/ = bits;
        /* We overwrite tree[n].Dad which is no longer needed */

        if (n > max_code) {
          continue;
        } /* not a leaf node */

        s.bl_count[bits]++;
        xbits = 0;
        if (n >= base) {
          xbits = extra[n - base];
        }
        f = tree[n * 2] /*.Freq*/ ;
        s.opt_len += f * (bits + xbits);
        if (has_stree) {
          s.static_len += f * (stree[n * 2 + 1] /*.Len*/ + xbits);
        }
      }
      if (overflow === 0) {
        return;
      }

      // Trace((stderr,"\nbit length overflow\n"));
      /* This happens for example on obj2 and pic of the Calgary corpus */

      /* Find the first bit length which could increase: */
      do {
        bits = max_length - 1;
        while (s.bl_count[bits] === 0) {
          bits--;
        }
        s.bl_count[bits]--; /* move one leaf down the tree */
        s.bl_count[bits + 1] += 2; /* move one overflow item as its brother */
        s.bl_count[max_length]--;
        /* The brother of the overflow item also moves one step up,
         * but this does not affect bl_count[max_length]
         */
        overflow -= 2;
      } while (overflow > 0);

      /* Now recompute all bit lengths, scanning in increasing frequency.
       * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
       * lengths instead of fixing only the wrong ones. This idea is taken
       * from 'ar' written by Haruhiko Okumura.)
       */
      for (bits = max_length; bits !== 0; bits--) {
        n = s.bl_count[bits];
        while (n !== 0) {
          m = s.heap[--h];
          if (m > max_code) {
            continue;
          }
          if (tree[m * 2 + 1] /*.Len*/ !== bits) {
            // Trace((stderr,"code %d bits %d->%d\n", m, tree[m].Len, bits));
            s.opt_len += (bits - tree[m * 2 + 1] /*.Len*/ ) * tree[m * 2] /*.Freq*/ ;
            tree[m * 2 + 1] /*.Len*/ = bits;
          }
          n--;
        }
      }
    }


    /* ===========================================================================
     * Generate the codes for a given tree and bit counts (which need not be
     * optimal).
     * IN assertion: the array bl_count contains the bit length statistics for
     * the given tree and the field len is set for all tree elements.
     * OUT assertion: the field code is set for all tree elements of non
     *     zero code length.
     */
    function gen_codes(tree, max_code, bl_count) {
    //    ct_data *tree;             /* the tree to decorate */
    //    int max_code;              /* largest code with non zero frequency */
    //    ushf *bl_count;            /* number of codes at each bit length */

      var next_code = new Array(MAX_BITS$1 + 1); /* next code value for each bit length */
      var code = 0; /* running code value */
      var bits; /* bit index */
      var n; /* code index */

      /* The distribution counts are first used to generate the code values
       * without bit reversal.
       */
      for (bits = 1; bits <= MAX_BITS$1; bits++) {
        next_code[bits] = code = (code + bl_count[bits - 1]) << 1;
      }
      /* Check that the bit counts in bl_count are consistent. The last code
       * must be all ones.
       */
      //Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
      //        "inconsistent bit counts");
      //Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

      for (n = 0; n <= max_code; n++) {
        var len = tree[n * 2 + 1] /*.Len*/ ;
        if (len === 0) {
          continue;
        }
        /* Now reverse the bits */
        tree[n * 2] /*.Code*/ = bi_reverse(next_code[len]++, len);

        //Tracecv(tree != static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ",
        //     n, (isgraph(n) ? n : ' '), len, tree[n].Code, next_code[len]-1));
      }
    }


    /* ===========================================================================
     * Initialize the various 'constant' tables.
     */
    function tr_static_init() {
      var n; /* iterates over tree elements */
      var bits; /* bit counter */
      var length; /* length value */
      var code; /* code value */
      var dist; /* distance index */
      var bl_count = new Array(MAX_BITS$1 + 1);
      /* number of codes at each bit length for an optimal tree */

      // do check in _tr_init()
      //if (static_init_done) return;

      /* For some embedded targets, global variables are not initialized: */
      /*#ifdef NO_INIT_GLOBAL_POINTERS
        static_l_desc.static_tree = static_ltree;
        static_l_desc.extra_bits = extra_lbits;
        static_d_desc.static_tree = static_dtree;
        static_d_desc.extra_bits = extra_dbits;
        static_bl_desc.extra_bits = extra_blbits;
      #endif*/

      /* Initialize the mapping length (0..255) -> length code (0..28) */
      length = 0;
      for (code = 0; code < LENGTH_CODES$1 - 1; code++) {
        base_length[code] = length;
        for (n = 0; n < (1 << extra_lbits[code]); n++) {
          _length_code[length++] = code;
        }
      }
      //Assert (length == 256, "tr_static_init: length != 256");
      /* Note that the length 255 (match length 258) can be represented
       * in two different ways: code 284 + 5 bits or code 285, so we
       * overwrite length_code[255] to use the best encoding:
       */
      _length_code[length - 1] = code;

      /* Initialize the mapping dist (0..32K) -> dist code (0..29) */
      dist = 0;
      for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n = 0; n < (1 << extra_dbits[code]); n++) {
          _dist_code[dist++] = code;
        }
      }
      //Assert (dist == 256, "tr_static_init: dist != 256");
      dist >>= 7; /* from now on, all distances are divided by 128 */
      for (; code < D_CODES$1; code++) {
        base_dist[code] = dist << 7;
        for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
          _dist_code[256 + dist++] = code;
        }
      }
      //Assert (dist == 256, "tr_static_init: 256+dist != 512");

      /* Construct the codes of the static literal tree */
      for (bits = 0; bits <= MAX_BITS$1; bits++) {
        bl_count[bits] = 0;
      }

      n = 0;
      while (n <= 143) {
        static_ltree[n * 2 + 1] /*.Len*/ = 8;
        n++;
        bl_count[8]++;
      }
      while (n <= 255) {
        static_ltree[n * 2 + 1] /*.Len*/ = 9;
        n++;
        bl_count[9]++;
      }
      while (n <= 279) {
        static_ltree[n * 2 + 1] /*.Len*/ = 7;
        n++;
        bl_count[7]++;
      }
      while (n <= 287) {
        static_ltree[n * 2 + 1] /*.Len*/ = 8;
        n++;
        bl_count[8]++;
      }
      /* Codes 286 and 287 do not exist, but we must include them in the
       * tree construction to get a canonical Huffman tree (longest code
       * all ones)
       */
      gen_codes(static_ltree, L_CODES$1 + 1, bl_count);

      /* The static distance tree is trivial: */
      for (n = 0; n < D_CODES$1; n++) {
        static_dtree[n * 2 + 1] /*.Len*/ = 5;
        static_dtree[n * 2] /*.Code*/ = bi_reverse(n, 5);
      }

      // Now data ready and we can init static trees
      static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS$1 + 1, L_CODES$1, MAX_BITS$1);
      static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES$1, MAX_BITS$1);
      static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES$1, MAX_BL_BITS);

      //static_init_done = true;
    }


    /* ===========================================================================
     * Initialize a new block.
     */
    function init_block(s) {
      var n; /* iterates over tree elements */

      /* Initialize the trees. */
      for (n = 0; n < L_CODES$1; n++) {
        s.dyn_ltree[n * 2] /*.Freq*/ = 0;
      }
      for (n = 0; n < D_CODES$1; n++) {
        s.dyn_dtree[n * 2] /*.Freq*/ = 0;
      }
      for (n = 0; n < BL_CODES$1; n++) {
        s.bl_tree[n * 2] /*.Freq*/ = 0;
      }

      s.dyn_ltree[END_BLOCK * 2] /*.Freq*/ = 1;
      s.opt_len = s.static_len = 0;
      s.last_lit = s.matches = 0;
    }


    /* ===========================================================================
     * Flush the bit buffer and align the output on a byte boundary
     */
    function bi_windup(s) {
      if (s.bi_valid > 8) {
        put_short(s, s.bi_buf);
      } else if (s.bi_valid > 0) {
        //put_byte(s, (Byte)s->bi_buf);
        s.pending_buf[s.pending++] = s.bi_buf;
      }
      s.bi_buf = 0;
      s.bi_valid = 0;
    }

    /* ===========================================================================
     * Copy a stored block, storing first the length and its
     * one's complement if requested.
     */
    function copy_block(s, buf, len, header) {
    //DeflateState *s;
    //charf    *buf;    /* the input data */
    //unsigned len;     /* its length */
    //int      header;  /* true if block header must be written */

      bi_windup(s); /* align on byte boundary */

      if (header) {
        put_short(s, len);
        put_short(s, ~len);
      }
      //  while (len--) {
      //    put_byte(s, *buf++);
      //  }
      arraySet(s.pending_buf, s.window, buf, len, s.pending);
      s.pending += len;
    }

    /* ===========================================================================
     * Compares to subtrees, using the tree depth as tie breaker when
     * the subtrees have equal frequency. This minimizes the worst case length.
     */
    function smaller(tree, n, m, depth) {
      var _n2 = n * 2;
      var _m2 = m * 2;
      return (tree[_n2] /*.Freq*/ < tree[_m2] /*.Freq*/ ||
        (tree[_n2] /*.Freq*/ === tree[_m2] /*.Freq*/ && depth[n] <= depth[m]));
    }

    /* ===========================================================================
     * Restore the heap property by moving down the tree starting at node k,
     * exchanging a node with the smallest of its two sons if necessary, stopping
     * when the heap property is re-established (each father smaller than its
     * two sons).
     */
    function pqdownheap(s, tree, k)
    //    deflate_state *s;
    //    ct_data *tree;  /* the tree to restore */
    //    int k;               /* node to move down */
    {
      var v = s.heap[k];
      var j = k << 1; /* left son of k */
      while (j <= s.heap_len) {
        /* Set j to the smallest of the two sons: */
        if (j < s.heap_len &&
          smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
          j++;
        }
        /* Exit if v is smaller than both sons */
        if (smaller(tree, v, s.heap[j], s.depth)) {
          break;
        }

        /* Exchange v with the smallest son */
        s.heap[k] = s.heap[j];
        k = j;

        /* And continue down the tree, setting j to the left son of k */
        j <<= 1;
      }
      s.heap[k] = v;
    }


    // inlined manually
    // var SMALLEST = 1;

    /* ===========================================================================
     * Send the block data compressed using the given Huffman trees
     */
    function compress_block(s, ltree, dtree)
    //    deflate_state *s;
    //    const ct_data *ltree; /* literal tree */
    //    const ct_data *dtree; /* distance tree */
    {
      var dist; /* distance of matched string */
      var lc; /* match length or unmatched char (if dist == 0) */
      var lx = 0; /* running index in l_buf */
      var code; /* the code to send */
      var extra; /* number of extra bits to send */

      if (s.last_lit !== 0) {
        do {
          dist = (s.pending_buf[s.d_buf + lx * 2] << 8) | (s.pending_buf[s.d_buf + lx * 2 + 1]);
          lc = s.pending_buf[s.l_buf + lx];
          lx++;

          if (dist === 0) {
            send_code(s, lc, ltree); /* send a literal byte */
            //Tracecv(isgraph(lc), (stderr," '%c' ", lc));
          } else {
            /* Here, lc is the match length - MIN_MATCH */
            code = _length_code[lc];
            send_code(s, code + LITERALS$1 + 1, ltree); /* send the length code */
            extra = extra_lbits[code];
            if (extra !== 0) {
              lc -= base_length[code];
              send_bits(s, lc, extra); /* send the extra length bits */
            }
            dist--; /* dist is now the match distance - 1 */
            code = d_code(dist);
            //Assert (code < D_CODES, "bad d_code");

            send_code(s, code, dtree); /* send the distance code */
            extra = extra_dbits[code];
            if (extra !== 0) {
              dist -= base_dist[code];
              send_bits(s, dist, extra); /* send the extra distance bits */
            }
          } /* literal or match pair ? */

          /* Check that the overlay between pending_buf and d_buf+l_buf is ok: */
          //Assert((uInt)(s->pending) < s->lit_bufsize + 2*lx,
          //       "pendingBuf overflow");

        } while (lx < s.last_lit);
      }

      send_code(s, END_BLOCK, ltree);
    }


    /* ===========================================================================
     * Construct one Huffman tree and assigns the code bit strings and lengths.
     * Update the total bit length for the current block.
     * IN assertion: the field freq is set for all tree elements.
     * OUT assertions: the fields len and code are set to the optimal bit length
     *     and corresponding code. The length opt_len is updated; static_len is
     *     also updated if stree is not null. The field max_code is set.
     */
    function build_tree(s, desc)
    //    deflate_state *s;
    //    tree_desc *desc; /* the tree descriptor */
    {
      var tree = desc.dyn_tree;
      var stree = desc.stat_desc.static_tree;
      var has_stree = desc.stat_desc.has_stree;
      var elems = desc.stat_desc.elems;
      var n, m; /* iterate over heap elements */
      var max_code = -1; /* largest code with non zero frequency */
      var node; /* new node being created */

      /* Construct the initial heap, with least frequent element in
       * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
       * heap[0] is not used.
       */
      s.heap_len = 0;
      s.heap_max = HEAP_SIZE$1;

      for (n = 0; n < elems; n++) {
        if (tree[n * 2] /*.Freq*/ !== 0) {
          s.heap[++s.heap_len] = max_code = n;
          s.depth[n] = 0;

        } else {
          tree[n * 2 + 1] /*.Len*/ = 0;
        }
      }

      /* The pkzip format requires that at least one distance code exists,
       * and that at least one bit should be sent even if there is only one
       * possible code. So to avoid special checks later on we force at least
       * two codes of non zero frequency.
       */
      while (s.heap_len < 2) {
        node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
        tree[node * 2] /*.Freq*/ = 1;
        s.depth[node] = 0;
        s.opt_len--;

        if (has_stree) {
          s.static_len -= stree[node * 2 + 1] /*.Len*/ ;
        }
        /* node is 0 or 1 so it does not have extra bits */
      }
      desc.max_code = max_code;

      /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
       * establish sub-heaps of increasing lengths:
       */
      for (n = (s.heap_len >> 1 /*int /2*/ ); n >= 1; n--) {
        pqdownheap(s, tree, n);
      }

      /* Construct the Huffman tree by repeatedly combining the least two
       * frequent nodes.
       */
      node = elems; /* next internal node of the tree */
      do {
        //pqremove(s, tree, n);  /* n = node of least frequency */
        /*** pqremove ***/
        n = s.heap[1 /*SMALLEST*/ ];
        s.heap[1 /*SMALLEST*/ ] = s.heap[s.heap_len--];
        pqdownheap(s, tree, 1 /*SMALLEST*/ );
        /***/

        m = s.heap[1 /*SMALLEST*/ ]; /* m = node of next least frequency */

        s.heap[--s.heap_max] = n; /* keep the nodes sorted by frequency */
        s.heap[--s.heap_max] = m;

        /* Create a new node father of n and m */
        tree[node * 2] /*.Freq*/ = tree[n * 2] /*.Freq*/ + tree[m * 2] /*.Freq*/ ;
        s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
        tree[n * 2 + 1] /*.Dad*/ = tree[m * 2 + 1] /*.Dad*/ = node;

        /* and insert the new node in the heap */
        s.heap[1 /*SMALLEST*/ ] = node++;
        pqdownheap(s, tree, 1 /*SMALLEST*/ );

      } while (s.heap_len >= 2);

      s.heap[--s.heap_max] = s.heap[1 /*SMALLEST*/ ];

      /* At this point, the fields freq and dad are set. We can now
       * generate the bit lengths.
       */
      gen_bitlen(s, desc);

      /* The field len is now set, we can generate the bit codes */
      gen_codes(tree, max_code, s.bl_count);
    }


    /* ===========================================================================
     * Scan a literal or distance tree to determine the frequencies of the codes
     * in the bit length tree.
     */
    function scan_tree(s, tree, max_code)
    //    deflate_state *s;
    //    ct_data *tree;   /* the tree to be scanned */
    //    int max_code;    /* and its largest code of non zero frequency */
    {
      var n; /* iterates over all tree elements */
      var prevlen = -1; /* last emitted length */
      var curlen; /* length of current code */

      var nextlen = tree[0 * 2 + 1] /*.Len*/ ; /* length of next code */

      var count = 0; /* repeat count of the current code */
      var max_count = 7; /* max repeat count */
      var min_count = 4; /* min repeat count */

      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      tree[(max_code + 1) * 2 + 1] /*.Len*/ = 0xffff; /* guard */

      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1] /*.Len*/ ;

        if (++count < max_count && curlen === nextlen) {
          continue;

        } else if (count < min_count) {
          s.bl_tree[curlen * 2] /*.Freq*/ += count;

        } else if (curlen !== 0) {

          if (curlen !== prevlen) {
            s.bl_tree[curlen * 2] /*.Freq*/ ++;
          }
          s.bl_tree[REP_3_6 * 2] /*.Freq*/ ++;

        } else if (count <= 10) {
          s.bl_tree[REPZ_3_10 * 2] /*.Freq*/ ++;

        } else {
          s.bl_tree[REPZ_11_138 * 2] /*.Freq*/ ++;
        }

        count = 0;
        prevlen = curlen;

        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;

        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;

        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }


    /* ===========================================================================
     * Send a literal or distance tree in compressed form, using the codes in
     * bl_tree.
     */
    function send_tree(s, tree, max_code)
    //    deflate_state *s;
    //    ct_data *tree; /* the tree to be scanned */
    //    int max_code;       /* and its largest code of non zero frequency */
    {
      var n; /* iterates over all tree elements */
      var prevlen = -1; /* last emitted length */
      var curlen; /* length of current code */

      var nextlen = tree[0 * 2 + 1] /*.Len*/ ; /* length of next code */

      var count = 0; /* repeat count of the current code */
      var max_count = 7; /* max repeat count */
      var min_count = 4; /* min repeat count */

      /* tree[max_code+1].Len = -1; */
      /* guard already set */
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }

      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1] /*.Len*/ ;

        if (++count < max_count && curlen === nextlen) {
          continue;

        } else if (count < min_count) {
          do {
            send_code(s, curlen, s.bl_tree);
          } while (--count !== 0);

        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            send_code(s, curlen, s.bl_tree);
            count--;
          }
          //Assert(count >= 3 && count <= 6, " 3_6?");
          send_code(s, REP_3_6, s.bl_tree);
          send_bits(s, count - 3, 2);

        } else if (count <= 10) {
          send_code(s, REPZ_3_10, s.bl_tree);
          send_bits(s, count - 3, 3);

        } else {
          send_code(s, REPZ_11_138, s.bl_tree);
          send_bits(s, count - 11, 7);
        }

        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;

        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;

        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }


    /* ===========================================================================
     * Construct the Huffman tree for the bit lengths and return the index in
     * bl_order of the last bit length code to send.
     */
    function build_bl_tree(s) {
      var max_blindex; /* index of last bit length code of non zero freq */

      /* Determine the bit length frequencies for literal and distance trees */
      scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
      scan_tree(s, s.dyn_dtree, s.d_desc.max_code);

      /* Build the bit length tree: */
      build_tree(s, s.bl_desc);
      /* opt_len now includes the length of the tree representations, except
       * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
       */

      /* Determine the number of bit length codes to send. The pkzip format
       * requires that at least 4 bit length codes be sent. (appnote.txt says
       * 3 but the actual value used is 4.)
       */
      for (max_blindex = BL_CODES$1 - 1; max_blindex >= 3; max_blindex--) {
        if (s.bl_tree[bl_order[max_blindex] * 2 + 1] /*.Len*/ !== 0) {
          break;
        }
      }
      /* Update opt_len to include the bit length tree and counts */
      s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
      //Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
      //        s->opt_len, s->static_len));

      return max_blindex;
    }


    /* ===========================================================================
     * Send the header for a block using dynamic Huffman trees: the counts, the
     * lengths of the bit length codes, the literal tree and the distance tree.
     * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
     */
    function send_all_trees(s, lcodes, dcodes, blcodes)
    //    deflate_state *s;
    //    int lcodes, dcodes, blcodes; /* number of codes for each tree */
    {
      var rank; /* index in bl_order */

      //Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
      //Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES,
      //        "too many codes");
      //Tracev((stderr, "\nbl counts: "));
      send_bits(s, lcodes - 257, 5); /* not +255 as stated in appnote.txt */
      send_bits(s, dcodes - 1, 5);
      send_bits(s, blcodes - 4, 4); /* not -3 as stated in appnote.txt */
      for (rank = 0; rank < blcodes; rank++) {
        //Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
        send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1] /*.Len*/ , 3);
      }
      //Tracev((stderr, "\nbl tree: sent %ld", s->bits_sent));

      send_tree(s, s.dyn_ltree, lcodes - 1); /* literal tree */
      //Tracev((stderr, "\nlit tree: sent %ld", s->bits_sent));

      send_tree(s, s.dyn_dtree, dcodes - 1); /* distance tree */
      //Tracev((stderr, "\ndist tree: sent %ld", s->bits_sent));
    }


    /* ===========================================================================
     * Check if the data type is TEXT or BINARY, using the following algorithm:
     * - TEXT if the two conditions below are satisfied:
     *    a) There are no non-portable control characters belonging to the
     *       "black list" (0..6, 14..25, 28..31).
     *    b) There is at least one printable character belonging to the
     *       "white list" (9 {TAB}, 10 {LF}, 13 {CR}, 32..255).
     * - BINARY otherwise.
     * - The following partially-portable control characters form a
     *   "gray list" that is ignored in this detection algorithm:
     *   (7 {BEL}, 8 {BS}, 11 {VT}, 12 {FF}, 26 {SUB}, 27 {ESC}).
     * IN assertion: the fields Freq of dyn_ltree are set.
     */
    function detect_data_type(s) {
      /* black_mask is the bit mask of black-listed bytes
       * set bits 0..6, 14..25, and 28..31
       * 0xf3ffc07f = binary 11110011111111111100000001111111
       */
      var black_mask = 0xf3ffc07f;
      var n;

      /* Check for non-textual ("black-listed") bytes. */
      for (n = 0; n <= 31; n++, black_mask >>>= 1) {
        if ((black_mask & 1) && (s.dyn_ltree[n * 2] /*.Freq*/ !== 0)) {
          return Z_BINARY$1;
        }
      }

      /* Check for textual ("white-listed") bytes. */
      if (s.dyn_ltree[9 * 2] /*.Freq*/ !== 0 || s.dyn_ltree[10 * 2] /*.Freq*/ !== 0 ||
        s.dyn_ltree[13 * 2] /*.Freq*/ !== 0) {
        return Z_TEXT$1;
      }
      for (n = 32; n < LITERALS$1; n++) {
        if (s.dyn_ltree[n * 2] /*.Freq*/ !== 0) {
          return Z_TEXT$1;
        }
      }

      /* There are no "black-listed" or "white-listed" bytes:
       * this stream either is empty or has tolerated ("gray-listed") bytes only.
       */
      return Z_BINARY$1;
    }


    var static_init_done = false;

    /* ===========================================================================
     * Initialize the tree data structures for a new zlib stream.
     */
    function _tr_init(s) {

      if (!static_init_done) {
        tr_static_init();
        static_init_done = true;
      }

      s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
      s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
      s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);

      s.bi_buf = 0;
      s.bi_valid = 0;

      /* Initialize the first block of the first file: */
      init_block(s);
    }


    /* ===========================================================================
     * Send a stored block
     */
    function _tr_stored_block(s, buf, stored_len, last)
    //DeflateState *s;
    //charf *buf;       /* input block */
    //ulg stored_len;   /* length of input block */
    //int last;         /* one if this is the last block for a file */
    {
      send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3); /* send block type */
      copy_block(s, buf, stored_len, true); /* with header */
    }


    /* ===========================================================================
     * Send one empty static block to give enough lookahead for inflate.
     * This takes 10 bits, of which 7 may remain in the bit buffer.
     */
    function _tr_align(s) {
      send_bits(s, STATIC_TREES << 1, 3);
      send_code(s, END_BLOCK, static_ltree);
      bi_flush(s);
    }


    /* ===========================================================================
     * Determine the best encoding for the current block: dynamic trees, static
     * trees or store, and output the encoded block to the zip file.
     */
    function _tr_flush_block(s, buf, stored_len, last)
    //DeflateState *s;
    //charf *buf;       /* input block, or NULL if too old */
    //ulg stored_len;   /* length of input block */
    //int last;         /* one if this is the last block for a file */
    {
      var opt_lenb, static_lenb; /* opt_len and static_len in bytes */
      var max_blindex = 0; /* index of last bit length code of non zero freq */

      /* Build the Huffman trees unless a stored block is forced */
      if (s.level > 0) {

        /* Check if the file is binary or text */
        if (s.strm.data_type === Z_UNKNOWN$2) {
          s.strm.data_type = detect_data_type(s);
        }

        /* Construct the literal and distance trees */
        build_tree(s, s.l_desc);
        // Tracev((stderr, "\nlit data: dyn %ld, stat %ld", s->opt_len,
        //        s->static_len));

        build_tree(s, s.d_desc);
        // Tracev((stderr, "\ndist data: dyn %ld, stat %ld", s->opt_len,
        //        s->static_len));
        /* At this point, opt_len and static_len are the total bit lengths of
         * the compressed block data, excluding the tree representations.
         */

        /* Build the bit length tree for the above two trees, and get the index
         * in bl_order of the last bit length code to send.
         */
        max_blindex = build_bl_tree(s);

        /* Determine the best encoding. Compute the block lengths in bytes. */
        opt_lenb = (s.opt_len + 3 + 7) >>> 3;
        static_lenb = (s.static_len + 3 + 7) >>> 3;

        // Tracev((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u ",
        //        opt_lenb, s->opt_len, static_lenb, s->static_len, stored_len,
        //        s->last_lit));

        if (static_lenb <= opt_lenb) {
          opt_lenb = static_lenb;
        }

      } else {
        // Assert(buf != (char*)0, "lost buf");
        opt_lenb = static_lenb = stored_len + 5; /* force a stored block */
      }

      if ((stored_len + 4 <= opt_lenb) && (buf !== -1)) {
        /* 4: two words for the lengths */

        /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
         * Otherwise we can't have processed more than WSIZE input bytes since
         * the last block flush, because compression would have been
         * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
         * transform a block into a stored block.
         */
        _tr_stored_block(s, buf, stored_len, last);

      } else if (s.strategy === Z_FIXED$2 || static_lenb === opt_lenb) {

        send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
        compress_block(s, static_ltree, static_dtree);

      } else {
        send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
        send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
        compress_block(s, s.dyn_ltree, s.dyn_dtree);
      }
      // Assert (s->compressed_len == s->bits_sent, "bad compressed size");
      /* The above check is made mod 2^32, for files larger than 512 MB
       * and uLong implemented on 32 bits.
       */
      init_block(s);

      if (last) {
        bi_windup(s);
      }
      // Tracev((stderr,"\ncomprlen %lu(%lu) ", s->compressed_len>>3,
      //       s->compressed_len-7*last));
    }

    /* ===========================================================================
     * Save the match info and tally the frequency counts. Return true if
     * the current block must be flushed.
     */
    function _tr_tally(s, dist, lc)
    //    deflate_state *s;
    //    unsigned dist;  /* distance of matched string */
    //    unsigned lc;    /* match length-MIN_MATCH or unmatched char (if dist==0) */
    {
      //var out_length, in_length, dcode;

      s.pending_buf[s.d_buf + s.last_lit * 2] = (dist >>> 8) & 0xff;
      s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;

      s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
      s.last_lit++;

      if (dist === 0) {
        /* lc is the unmatched char */
        s.dyn_ltree[lc * 2] /*.Freq*/ ++;
      } else {
        s.matches++;
        /* Here, lc is the match length - MIN_MATCH */
        dist--; /* dist = match distance - 1 */
        //Assert((ush)dist < (ush)MAX_DIST(s) &&
        //       (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) &&
        //       (ush)d_code(dist) < (ush)D_CODES,  "_tr_tally: bad match");

        s.dyn_ltree[(_length_code[lc] + LITERALS$1 + 1) * 2] /*.Freq*/ ++;
        s.dyn_dtree[d_code(dist) * 2] /*.Freq*/ ++;
      }

      // (!) This block is disabled in zlib defailts,
      // don't enable it for binary compatibility

      //#ifdef TRUNCATE_BLOCK
      //  /* Try to guess if it is profitable to stop the current block here */
      //  if ((s.last_lit & 0x1fff) === 0 && s.level > 2) {
      //    /* Compute an upper bound for the compressed length */
      //    out_length = s.last_lit*8;
      //    in_length = s.strstart - s.block_start;
      //
      //    for (dcode = 0; dcode < D_CODES; dcode++) {
      //      out_length += s.dyn_dtree[dcode*2]/*.Freq*/ * (5 + extra_dbits[dcode]);
      //    }
      //    out_length >>>= 3;
      //    //Tracev((stderr,"\nlast_lit %u, in %ld, out ~%ld(%ld%%) ",
      //    //       s->last_lit, in_length, out_length,
      //    //       100L - out_length*100L/in_length));
      //    if (s.matches < (s.last_lit>>1)/*int /2*/ && out_length < (in_length>>1)/*int /2*/) {
      //      return true;
      //    }
      //  }
      //#endif

      return (s.last_lit === s.lit_bufsize - 1);
      /* We avoid equality with lit_bufsize because of wraparound at 64K
       * on 16 bit machines and because stored blocks are restricted to
       * 64K-1 bytes.
       */
    }

    // Note: adler32 takes 12% for level 0 and 2% for level 6.
    // It doesn't worth to make additional optimizationa as in original.
    // Small size is preferable.

    function adler32(adler, buf, len, pos) {
      var s1 = (adler & 0xffff) |0,
          s2 = ((adler >>> 16) & 0xffff) |0,
          n = 0;

      while (len !== 0) {
        // Set limit ~ twice less than 5552, to keep
        // s2 in 31-bits, because we force signed ints.
        // in other case %= will fail.
        n = len > 2000 ? 2000 : len;
        len -= n;

        do {
          s1 = (s1 + buf[pos++]) |0;
          s2 = (s2 + s1) |0;
        } while (--n);

        s1 %= 65521;
        s2 %= 65521;
      }

      return (s1 | (s2 << 16)) |0;
    }

    // Note: we can't get significant speed boost here.
    // So write code to minimize size - no pregenerated tables
    // and array tools dependencies.


    // Use ordinary array, since untyped makes no boost here
    function makeTable() {
      var c, table = [];

      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
      }

      return table;
    }

    // Create table on load. Just 255 signed longs. Not a problem.
    var crcTable = makeTable();


    function crc32(crc, buf, len, pos) {
      var t = crcTable,
          end = pos + len;

      crc ^= -1;

      for (var i = pos; i < end; i++) {
        crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
      }

      return (crc ^ (-1)); // >>> 0;
    }

    /* Public constants ==========================================================*/
    /* ===========================================================================*/


    /* Allowed flush values; see deflate() and inflate() below for details */
    var Z_NO_FLUSH$1 = 0;
    var Z_PARTIAL_FLUSH$1 = 1;
    //var Z_SYNC_FLUSH    = 2;
    var Z_FULL_FLUSH$1 = 3;
    var Z_FINISH$2 = 4;
    var Z_BLOCK$2 = 5;
    //var Z_TREES         = 6;


    /* Return codes for the compression/decompression functions. Negative values
     * are errors, positive values are used for special but normal events.
     */
    var Z_OK$2 = 0;
    var Z_STREAM_END$2 = 1;
    //var Z_NEED_DICT     = 2;
    //var Z_ERRNO         = -1;
    var Z_STREAM_ERROR$2 = -2;
    var Z_DATA_ERROR$2 = -3;
    //var Z_MEM_ERROR     = -4;
    var Z_BUF_ERROR$2 = -5;
    //var Z_VERSION_ERROR = -6;


    /* compression levels */
    //var Z_NO_COMPRESSION      = 0;
    //var Z_BEST_SPEED          = 1;
    //var Z_BEST_COMPRESSION    = 9;
    var Z_DEFAULT_COMPRESSION$1 = -1;


    var Z_FILTERED$1 = 1;
    var Z_HUFFMAN_ONLY$1 = 2;
    var Z_RLE$1 = 3;
    var Z_FIXED$1 = 4;

    /* Possible values of the data_type field (though see inflate()) */
    //var Z_BINARY              = 0;
    //var Z_TEXT                = 1;
    //var Z_ASCII               = 1; // = Z_TEXT
    var Z_UNKNOWN$1 = 2;


    /* The deflate compression method */
    var Z_DEFLATED$2 = 8;

    /*============================================================================*/


    var MAX_MEM_LEVEL = 9;


    var LENGTH_CODES = 29;
    /* number of length codes, not counting the special END_BLOCK code */
    var LITERALS = 256;
    /* number of literal bytes 0..255 */
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    /* number of Literal or Length codes, including the END_BLOCK code */
    var D_CODES = 30;
    /* number of distance codes */
    var BL_CODES = 19;
    /* number of codes used to transfer the bit lengths */
    var HEAP_SIZE = 2 * L_CODES + 1;
    /* maximum heap size */
    var MAX_BITS = 15;
    /* All codes must not exceed MAX_BITS bits */

    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);

    var PRESET_DICT = 0x20;

    var INIT_STATE = 42;
    var EXTRA_STATE = 69;
    var NAME_STATE = 73;
    var COMMENT_STATE = 91;
    var HCRC_STATE = 103;
    var BUSY_STATE = 113;
    var FINISH_STATE = 666;

    var BS_NEED_MORE = 1; /* block not completed, need more input or more output */
    var BS_BLOCK_DONE = 2; /* block flush performed */
    var BS_FINISH_STARTED = 3; /* finish started, need only more output at next deflate */
    var BS_FINISH_DONE = 4; /* finish done, accept no more input or output */

    var OS_CODE = 0x03; // Unix :) . Don't detect, use this default.

    function err(strm, errorCode) {
      strm.msg = msg[errorCode];
      return errorCode;
    }

    function rank(f) {
      return ((f) << 1) - ((f) > 4 ? 9 : 0);
    }

    function zero(buf) {
      var len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    }


    /* =========================================================================
     * Flush as much pending output as possible. All deflate() output goes
     * through this function so some applications may wish to modify it
     * to avoid allocating a large strm->output buffer and copying into it.
     * (See also read_buf()).
     */
    function flush_pending(strm) {
      var s = strm.state;

      //_tr_flush_bits(s);
      var len = s.pending;
      if (len > strm.avail_out) {
        len = strm.avail_out;
      }
      if (len === 0) {
        return;
      }

      arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
      strm.next_out += len;
      s.pending_out += len;
      strm.total_out += len;
      strm.avail_out -= len;
      s.pending -= len;
      if (s.pending === 0) {
        s.pending_out = 0;
      }
    }


    function flush_block_only(s, last) {
      _tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
      s.block_start = s.strstart;
      flush_pending(s.strm);
    }


    function put_byte(s, b) {
      s.pending_buf[s.pending++] = b;
    }


    /* =========================================================================
     * Put a short in the pending buffer. The 16-bit value is put in MSB order.
     * IN assertion: the stream state is correct and there is enough room in
     * pending_buf.
     */
    function putShortMSB(s, b) {
      //  put_byte(s, (Byte)(b >> 8));
      //  put_byte(s, (Byte)(b & 0xff));
      s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
      s.pending_buf[s.pending++] = b & 0xff;
    }


    /* ===========================================================================
     * Read a new buffer from the current input stream, update the adler32
     * and total number of bytes read.  All deflate() input goes through
     * this function so some applications may wish to modify it to avoid
     * allocating a large strm->input buffer and copying from it.
     * (See also flush_pending()).
     */
    function read_buf(strm, buf, start, size) {
      var len = strm.avail_in;

      if (len > size) {
        len = size;
      }
      if (len === 0) {
        return 0;
      }

      strm.avail_in -= len;

      // zmemcpy(buf, strm->next_in, len);
      arraySet(buf, strm.input, strm.next_in, len, start);
      if (strm.state.wrap === 1) {
        strm.adler = adler32(strm.adler, buf, len, start);
      } else if (strm.state.wrap === 2) {
        strm.adler = crc32(strm.adler, buf, len, start);
      }

      strm.next_in += len;
      strm.total_in += len;

      return len;
    }


    /* ===========================================================================
     * Set match_start to the longest match starting at the given string and
     * return its length. Matches shorter or equal to prev_length are discarded,
     * in which case the result is equal to prev_length and match_start is
     * garbage.
     * IN assertions: cur_match is the head of the hash chain for the current
     *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
     * OUT assertion: the match length is not greater than s->lookahead.
     */
    function longest_match(s, cur_match) {
      var chain_length = s.max_chain_length; /* max hash chain length */
      var scan = s.strstart; /* current string */
      var match; /* matched string */
      var len; /* length of current match */
      var best_len = s.prev_length; /* best match length so far */
      var nice_match = s.nice_match; /* stop if match long enough */
      var limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
        s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0 /*NIL*/ ;

      var _win = s.window; // shortcut

      var wmask = s.w_mask;
      var prev = s.prev;

      /* Stop when cur_match becomes <= limit. To simplify the code,
       * we prevent matches with the string of window index 0.
       */

      var strend = s.strstart + MAX_MATCH;
      var scan_end1 = _win[scan + best_len - 1];
      var scan_end = _win[scan + best_len];

      /* The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of 16.
       * It is easy to get rid of this optimization if necessary.
       */
      // Assert(s->hash_bits >= 8 && MAX_MATCH == 258, "Code too clever");

      /* Do not waste too much time if we already have a good match: */
      if (s.prev_length >= s.good_match) {
        chain_length >>= 2;
      }
      /* Do not look for matches beyond the end of the input. This is necessary
       * to make deflate deterministic.
       */
      if (nice_match > s.lookahead) {
        nice_match = s.lookahead;
      }

      // Assert((ulg)s->strstart <= s->window_size-MIN_LOOKAHEAD, "need lookahead");

      do {
        // Assert(cur_match < s->strstart, "no future");
        match = cur_match;

        /* Skip to next match if the match length cannot increase
         * or if the match length is less than 2.  Note that the checks below
         * for insufficient lookahead only occur occasionally for performance
         * reasons.  Therefore uninitialized memory will be accessed, and
         * conditional jumps will be made that depend on those values.
         * However the length of the match is limited to the lookahead, so
         * the output of deflate is not affected by the uninitialized values.
         */

        if (_win[match + best_len] !== scan_end ||
          _win[match + best_len - 1] !== scan_end1 ||
          _win[match] !== _win[scan] ||
          _win[++match] !== _win[scan + 1]) {
          continue;
        }

        /* The check at best_len-1 can be removed because it will be made
         * again later. (This heuristic is not always a win.)
         * It is not necessary to compare scan[2] and match[2] since they
         * are always equal when the other bytes match, given that
         * the hash keys are equal and that HASH_BITS >= 8.
         */
        scan += 2;
        match++;
        // Assert(*scan == *match, "match[2]?");

        /* We check for insufficient lookahead only every 8th comparison;
         * the 256th check will be made at strstart+258.
         */
        do {
          /*jshint noempty:false*/
        } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
          _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
          _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
          _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
          scan < strend);

        // Assert(scan <= s->window+(unsigned)(s->window_size-1), "wild scan");

        len = MAX_MATCH - (strend - scan);
        scan = strend - MAX_MATCH;

        if (len > best_len) {
          s.match_start = cur_match;
          best_len = len;
          if (len >= nice_match) {
            break;
          }
          scan_end1 = _win[scan + best_len - 1];
          scan_end = _win[scan + best_len];
        }
      } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

      if (best_len <= s.lookahead) {
        return best_len;
      }
      return s.lookahead;
    }


    /* ===========================================================================
     * Fill the window when the lookahead becomes insufficient.
     * Updates strstart and lookahead.
     *
     * IN assertion: lookahead < MIN_LOOKAHEAD
     * OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
     *    At least one byte has been read, or avail_in == 0; reads are
     *    performed for at least two bytes (required for the zip translate_eol
     *    option -- not supported here).
     */
    function fill_window(s) {
      var _w_size = s.w_size;
      var p, n, m, more, str;

      //Assert(s->lookahead < MIN_LOOKAHEAD, "already enough lookahead");

      do {
        more = s.window_size - s.lookahead - s.strstart;

        // JS ints have 32 bit, block below not needed
        /* Deal with !@#$% 64K limit: */
        //if (sizeof(int) <= 2) {
        //    if (more == 0 && s->strstart == 0 && s->lookahead == 0) {
        //        more = wsize;
        //
        //  } else if (more == (unsigned)(-1)) {
        //        /* Very unlikely, but possible on 16 bit machine if
        //         * strstart == 0 && lookahead == 1 (input done a byte at time)
        //         */
        //        more--;
        //    }
        //}


        /* If the window is almost full and there is insufficient lookahead,
         * move the upper half to the lower one to make room in the upper half.
         */
        if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {

          arraySet(s.window, s.window, _w_size, _w_size, 0);
          s.match_start -= _w_size;
          s.strstart -= _w_size;
          /* we now have strstart >= MAX_DIST */
          s.block_start -= _w_size;

          /* Slide the hash table (could be avoided with 32 bit values
           at the expense of memory usage). We slide even when level == 0
           to keep the hash table consistent if we switch back to level > 0
           later. (Using level 0 permanently is not an optimal usage of
           zlib, so we don't care about this pathological case.)
           */

          n = s.hash_size;
          p = n;
          do {
            m = s.head[--p];
            s.head[p] = (m >= _w_size ? m - _w_size : 0);
          } while (--n);

          n = _w_size;
          p = n;
          do {
            m = s.prev[--p];
            s.prev[p] = (m >= _w_size ? m - _w_size : 0);
            /* If n is not on any hash chain, prev[n] is garbage but
             * its value will never be used.
             */
          } while (--n);

          more += _w_size;
        }
        if (s.strm.avail_in === 0) {
          break;
        }

        /* If there was no sliding:
         *    strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
         *    more == window_size - lookahead - strstart
         * => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
         * => more >= window_size - 2*WSIZE + 2
         * In the BIG_MEM or MMAP case (not yet supported),
         *   window_size == input_size + MIN_LOOKAHEAD  &&
         *   strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
         * Otherwise, window_size == 2*WSIZE so more >= 2.
         * If there was sliding, more >= WSIZE. So in all cases, more >= 2.
         */
        //Assert(more >= 2, "more < 2");
        n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
        s.lookahead += n;

        /* Initialize the hash value now that we have some input: */
        if (s.lookahead + s.insert >= MIN_MATCH) {
          str = s.strstart - s.insert;
          s.ins_h = s.window[str];

          /* UPDATE_HASH(s, s->ins_h, s->window[str + 1]); */
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + 1]) & s.hash_mask;
          //#if MIN_MATCH != 3
          //        Call update_hash() MIN_MATCH-3 more times
          //#endif
          while (s.insert) {
            /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
            s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;

            s.prev[str & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = str;
            str++;
            s.insert--;
            if (s.lookahead + s.insert < MIN_MATCH) {
              break;
            }
          }
        }
        /* If the whole input has less than MIN_MATCH bytes, ins_h is garbage,
         * but this is not important since only literal bytes will be emitted.
         */

      } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);

      /* If the WIN_INIT bytes after the end of the current data have never been
       * written, then zero those bytes in order to avoid memory check reports of
       * the use of uninitialized (or uninitialised as Julian writes) bytes by
       * the longest match routines.  Update the high water mark for the next
       * time through here.  WIN_INIT is set to MAX_MATCH since the longest match
       * routines allow scanning to strstart + MAX_MATCH, ignoring lookahead.
       */
      //  if (s.high_water < s.window_size) {
      //    var curr = s.strstart + s.lookahead;
      //    var init = 0;
      //
      //    if (s.high_water < curr) {
      //      /* Previous high water mark below current data -- zero WIN_INIT
      //       * bytes or up to end of window, whichever is less.
      //       */
      //      init = s.window_size - curr;
      //      if (init > WIN_INIT)
      //        init = WIN_INIT;
      //      zmemzero(s->window + curr, (unsigned)init);
      //      s->high_water = curr + init;
      //    }
      //    else if (s->high_water < (ulg)curr + WIN_INIT) {
      //      /* High water mark at or above current data, but below current data
      //       * plus WIN_INIT -- zero out to current data plus WIN_INIT, or up
      //       * to end of window, whichever is less.
      //       */
      //      init = (ulg)curr + WIN_INIT - s->high_water;
      //      if (init > s->window_size - s->high_water)
      //        init = s->window_size - s->high_water;
      //      zmemzero(s->window + s->high_water, (unsigned)init);
      //      s->high_water += init;
      //    }
      //  }
      //
      //  Assert((ulg)s->strstart <= s->window_size - MIN_LOOKAHEAD,
      //    "not enough room for search");
    }

    /* ===========================================================================
     * Copy without compression as much as possible from the input stream, return
     * the current block state.
     * This function does not insert new strings in the dictionary since
     * uncompressible data is probably not useful. This function is used
     * only for the level=0 compression option.
     * NOTE: this function should be optimized to avoid extra copying from
     * window to pending_buf.
     */
    function deflate_stored(s, flush) {
      /* Stored blocks are limited to 0xffff bytes, pending_buf is limited
       * to pending_buf_size, and each stored block has a 5 byte header:
       */
      var max_block_size = 0xffff;

      if (max_block_size > s.pending_buf_size - 5) {
        max_block_size = s.pending_buf_size - 5;
      }

      /* Copy as much as possible from input to output: */
      for (;;) {
        /* Fill the window as much as possible: */
        if (s.lookahead <= 1) {

          //Assert(s->strstart < s->w_size+MAX_DIST(s) ||
          //  s->block_start >= (long)s->w_size, "slide too late");
          //      if (!(s.strstart < s.w_size + (s.w_size - MIN_LOOKAHEAD) ||
          //        s.block_start >= s.w_size)) {
          //        throw  new Error("slide too late");
          //      }

          fill_window(s);
          if (s.lookahead === 0 && flush === Z_NO_FLUSH$1) {
            return BS_NEED_MORE;
          }

          if (s.lookahead === 0) {
            break;
          }
          /* flush the current block */
        }
        //Assert(s->block_start >= 0L, "block gone");
        //    if (s.block_start < 0) throw new Error("block gone");

        s.strstart += s.lookahead;
        s.lookahead = 0;

        /* Emit a stored block if pending_buf will be full: */
        var max_start = s.block_start + max_block_size;

        if (s.strstart === 0 || s.strstart >= max_start) {
          /* strstart == 0 is possible when wraparound on 16-bit machine */
          s.lookahead = s.strstart - max_start;
          s.strstart = max_start;
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/


        }
        /* Flush if we may have to slide, otherwise block_start may become
         * negative and the data will be gone:
         */
        if (s.strstart - s.block_start >= (s.w_size - MIN_LOOKAHEAD)) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }

      s.insert = 0;

      if (flush === Z_FINISH$2) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }

      if (s.strstart > s.block_start) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }

      return BS_NEED_MORE;
    }

    /* ===========================================================================
     * Compress as much as possible from the input stream, return the current
     * block state.
     * This function does not perform lazy evaluation of matches and inserts
     * new strings in the dictionary only for unmatched strings or for short
     * matches. It is used only for the fast compression options.
     */
    function deflate_fast(s, flush) {
      var hash_head; /* head of the hash chain */
      var bflush; /* set if current block must be flushed */

      for (;;) {
        /* Make sure that we always have enough lookahead, except
         * at the end of the input file. We need MAX_MATCH bytes
         * for the next match, plus MIN_MATCH bytes to insert the
         * string following the next match.
         */
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$1) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break; /* flush the current block */
          }
        }

        /* Insert the string window[strstart .. strstart+2] in the
         * dictionary, and set hash_head to the head of the hash chain:
         */
        hash_head = 0 /*NIL*/ ;
        if (s.lookahead >= MIN_MATCH) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }

        /* Find the longest match, discarding those <= prev_length.
         * At this point we have always match_length < MIN_MATCH
         */
        if (hash_head !== 0 /*NIL*/ && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
          /* To simplify the code, we prevent matches with the string
           * of window index 0 (in particular we have to avoid a match
           * of the string with itself at the start of the input file).
           */
          s.match_length = longest_match(s, hash_head);
          /* longest_match() sets match_start */
        }
        if (s.match_length >= MIN_MATCH) {
          // check_match(s, s.strstart, s.match_start, s.match_length); // for debug only

          /*** _tr_tally_dist(s, s.strstart - s.match_start,
                         s.match_length - MIN_MATCH, bflush); ***/
          bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);

          s.lookahead -= s.match_length;

          /* Insert new strings in the hash table only if the match length
           * is not too large. This saves time but degrades compression.
           */
          if (s.match_length <= s.max_lazy_match /*max_insert_length*/ && s.lookahead >= MIN_MATCH) {
            s.match_length--; /* string at strstart already in table */
            do {
              s.strstart++;
              /*** INSERT_STRING(s, s.strstart, hash_head); ***/
              s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
              /***/
              /* strstart never exceeds WSIZE-MAX_MATCH, so there are
               * always MIN_MATCH bytes ahead.
               */
            } while (--s.match_length !== 0);
            s.strstart++;
          } else {
            s.strstart += s.match_length;
            s.match_length = 0;
            s.ins_h = s.window[s.strstart];
            /* UPDATE_HASH(s, s.ins_h, s.window[s.strstart+1]); */
            s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + 1]) & s.hash_mask;

            //#if MIN_MATCH != 3
            //                Call UPDATE_HASH() MIN_MATCH-3 more times
            //#endif
            /* If lookahead < MIN_MATCH, ins_h is garbage, but it does not
             * matter since it will be recomputed at next deflate call.
             */
          }
        } else {
          /* No match, output a literal byte */
          //Tracevv((stderr,"%c", s.window[s.strstart]));
          /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
          bflush = _tr_tally(s, 0, s.window[s.strstart]);

          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }
      s.insert = ((s.strstart < (MIN_MATCH - 1)) ? s.strstart : MIN_MATCH - 1);
      if (flush === Z_FINISH$2) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }
      return BS_BLOCK_DONE;
    }

    /* ===========================================================================
     * Same as above, but achieves better compression. We use a lazy
     * evaluation for matches: a match is finally adopted only if there is
     * no better match at the next window position.
     */
    function deflate_slow(s, flush) {
      var hash_head; /* head of hash chain */
      var bflush; /* set if current block must be flushed */

      var max_insert;

      /* Process the input block. */
      for (;;) {
        /* Make sure that we always have enough lookahead, except
         * at the end of the input file. We need MAX_MATCH bytes
         * for the next match, plus MIN_MATCH bytes to insert the
         * string following the next match.
         */
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$1) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          } /* flush the current block */
        }

        /* Insert the string window[strstart .. strstart+2] in the
         * dictionary, and set hash_head to the head of the hash chain:
         */
        hash_head = 0 /*NIL*/ ;
        if (s.lookahead >= MIN_MATCH) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }

        /* Find the longest match, discarding those <= prev_length.
         */
        s.prev_length = s.match_length;
        s.prev_match = s.match_start;
        s.match_length = MIN_MATCH - 1;

        if (hash_head !== 0 /*NIL*/ && s.prev_length < s.max_lazy_match &&
          s.strstart - hash_head <= (s.w_size - MIN_LOOKAHEAD) /*MAX_DIST(s)*/ ) {
          /* To simplify the code, we prevent matches with the string
           * of window index 0 (in particular we have to avoid a match
           * of the string with itself at the start of the input file).
           */
          s.match_length = longest_match(s, hash_head);
          /* longest_match() sets match_start */

          if (s.match_length <= 5 &&
            (s.strategy === Z_FILTERED$1 || (s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096 /*TOO_FAR*/ ))) {

            /* If prev_match is also MIN_MATCH, match_start is garbage
             * but we will ignore the current match anyway.
             */
            s.match_length = MIN_MATCH - 1;
          }
        }
        /* If there was a match at the previous step and the current
         * match is not better, output the previous match:
         */
        if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
          max_insert = s.strstart + s.lookahead - MIN_MATCH;
          /* Do not insert strings in hash table beyond this. */

          //check_match(s, s.strstart-1, s.prev_match, s.prev_length);

          /***_tr_tally_dist(s, s.strstart - 1 - s.prev_match,
                         s.prev_length - MIN_MATCH, bflush);***/
          bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
          /* Insert in hash table all strings up to the end of the match.
           * strstart-1 and strstart are already inserted. If there is not
           * enough lookahead, the last two strings are not inserted in
           * the hash table.
           */
          s.lookahead -= s.prev_length - 1;
          s.prev_length -= 2;
          do {
            if (++s.strstart <= max_insert) {
              /*** INSERT_STRING(s, s.strstart, hash_head); ***/
              s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
              /***/
            }
          } while (--s.prev_length !== 0);
          s.match_available = 0;
          s.match_length = MIN_MATCH - 1;
          s.strstart++;

          if (bflush) {
            /*** FLUSH_BLOCK(s, 0); ***/
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) {
              return BS_NEED_MORE;
            }
            /***/
          }

        } else if (s.match_available) {
          /* If there was no match at the previous position, output a
           * single literal. If there was a match but the current match
           * is longer, truncate the previous match to a single literal.
           */
          //Tracevv((stderr,"%c", s->window[s->strstart-1]));
          /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
          bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);

          if (bflush) {
            /*** FLUSH_BLOCK_ONLY(s, 0) ***/
            flush_block_only(s, false);
            /***/
          }
          s.strstart++;
          s.lookahead--;
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        } else {
          /* There is no previous match to compare with, wait for
           * the next step to decide.
           */
          s.match_available = 1;
          s.strstart++;
          s.lookahead--;
        }
      }
      //Assert (flush != Z_NO_FLUSH, "no flush?");
      if (s.match_available) {
        //Tracevv((stderr,"%c", s->window[s->strstart-1]));
        /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
        bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);

        s.match_available = 0;
      }
      s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH$2) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }

      return BS_BLOCK_DONE;
    }


    /* ===========================================================================
     * For Z_RLE, simply look for runs of bytes, generate matches only of distance
     * one.  Do not maintain a hash table.  (It will be regenerated if this run of
     * deflate switches away from Z_RLE.)
     */
    function deflate_rle(s, flush) {
      var bflush; /* set if current block must be flushed */
      var prev; /* byte at distance one to match */
      var scan, strend; /* scan goes up to strend for length of run */

      var _win = s.window;

      for (;;) {
        /* Make sure that we always have enough lookahead, except
         * at the end of the input file. We need MAX_MATCH bytes
         * for the longest run, plus one for the unrolled loop.
         */
        if (s.lookahead <= MAX_MATCH) {
          fill_window(s);
          if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH$1) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          } /* flush the current block */
        }

        /* See how many times the previous byte repeats */
        s.match_length = 0;
        if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
          scan = s.strstart - 1;
          prev = _win[scan];
          if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
            strend = s.strstart + MAX_MATCH;
            do {
              /*jshint noempty:false*/
            } while (prev === _win[++scan] && prev === _win[++scan] &&
              prev === _win[++scan] && prev === _win[++scan] &&
              prev === _win[++scan] && prev === _win[++scan] &&
              prev === _win[++scan] && prev === _win[++scan] &&
              scan < strend);
            s.match_length = MAX_MATCH - (strend - scan);
            if (s.match_length > s.lookahead) {
              s.match_length = s.lookahead;
            }
          }
          //Assert(scan <= s->window+(uInt)(s->window_size-1), "wild scan");
        }

        /* Emit match if have run of MIN_MATCH or longer, else emit literal */
        if (s.match_length >= MIN_MATCH) {
          //check_match(s, s.strstart, s.strstart - 1, s.match_length);

          /*** _tr_tally_dist(s, 1, s.match_length - MIN_MATCH, bflush); ***/
          bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);

          s.lookahead -= s.match_length;
          s.strstart += s.match_length;
          s.match_length = 0;
        } else {
          /* No match, output a literal byte */
          //Tracevv((stderr,"%c", s->window[s->strstart]));
          /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
          bflush = _tr_tally(s, 0, s.window[s.strstart]);

          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH$2) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }
      return BS_BLOCK_DONE;
    }

    /* ===========================================================================
     * For Z_HUFFMAN_ONLY, do not look for matches.  Do not maintain a hash table.
     * (It will be regenerated if this run of deflate switches away from Huffman.)
     */
    function deflate_huff(s, flush) {
      var bflush; /* set if current block must be flushed */

      for (;;) {
        /* Make sure that we have a literal to write. */
        if (s.lookahead === 0) {
          fill_window(s);
          if (s.lookahead === 0) {
            if (flush === Z_NO_FLUSH$1) {
              return BS_NEED_MORE;
            }
            break; /* flush the current block */
          }
        }

        /* Output a literal byte */
        s.match_length = 0;
        //Tracevv((stderr,"%c", s->window[s->strstart]));
        /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
        bflush = _tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
        if (bflush) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH$2) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }
      return BS_BLOCK_DONE;
    }

    /* Values for max_lazy_match, good_match and max_chain_length, depending on
     * the desired pack level (0..9). The values given below have been tuned to
     * exclude worst case performance for pathological files. Better values may be
     * found for specific files.
     */
    function Config(good_length, max_lazy, nice_length, max_chain, func) {
      this.good_length = good_length;
      this.max_lazy = max_lazy;
      this.nice_length = nice_length;
      this.max_chain = max_chain;
      this.func = func;
    }

    var configuration_table;

    configuration_table = [
      /*      good lazy nice chain */
      new Config(0, 0, 0, 0, deflate_stored), /* 0 store only */
      new Config(4, 4, 8, 4, deflate_fast), /* 1 max speed, no lazy matches */
      new Config(4, 5, 16, 8, deflate_fast), /* 2 */
      new Config(4, 6, 32, 32, deflate_fast), /* 3 */

      new Config(4, 4, 16, 16, deflate_slow), /* 4 lazy matches */
      new Config(8, 16, 32, 32, deflate_slow), /* 5 */
      new Config(8, 16, 128, 128, deflate_slow), /* 6 */
      new Config(8, 32, 128, 256, deflate_slow), /* 7 */
      new Config(32, 128, 258, 1024, deflate_slow), /* 8 */
      new Config(32, 258, 258, 4096, deflate_slow) /* 9 max compression */
    ];


    /* ===========================================================================
     * Initialize the "longest match" routines for a new zlib stream
     */
    function lm_init(s) {
      s.window_size = 2 * s.w_size;

      /*** CLEAR_HASH(s); ***/
      zero(s.head); // Fill with NIL (= 0);

      /* Set the default configuration parameters:
       */
      s.max_lazy_match = configuration_table[s.level].max_lazy;
      s.good_match = configuration_table[s.level].good_length;
      s.nice_match = configuration_table[s.level].nice_length;
      s.max_chain_length = configuration_table[s.level].max_chain;

      s.strstart = 0;
      s.block_start = 0;
      s.lookahead = 0;
      s.insert = 0;
      s.match_length = s.prev_length = MIN_MATCH - 1;
      s.match_available = 0;
      s.ins_h = 0;
    }


    function DeflateState() {
      this.strm = null; /* pointer back to this zlib stream */
      this.status = 0; /* as the name implies */
      this.pending_buf = null; /* output still pending */
      this.pending_buf_size = 0; /* size of pending_buf */
      this.pending_out = 0; /* next pending byte to output to the stream */
      this.pending = 0; /* nb of bytes in the pending buffer */
      this.wrap = 0; /* bit 0 true for zlib, bit 1 true for gzip */
      this.gzhead = null; /* gzip header information to write */
      this.gzindex = 0; /* where in extra, name, or comment */
      this.method = Z_DEFLATED$2; /* can only be DEFLATED */
      this.last_flush = -1; /* value of flush param for previous deflate call */

      this.w_size = 0; /* LZ77 window size (32K by default) */
      this.w_bits = 0; /* log2(w_size)  (8..16) */
      this.w_mask = 0; /* w_size - 1 */

      this.window = null;
      /* Sliding window. Input bytes are read into the second half of the window,
       * and move to the first half later to keep a dictionary of at least wSize
       * bytes. With this organization, matches are limited to a distance of
       * wSize-MAX_MATCH bytes, but this ensures that IO is always
       * performed with a length multiple of the block size.
       */

      this.window_size = 0;
      /* Actual size of window: 2*wSize, except when the user input buffer
       * is directly used as sliding window.
       */

      this.prev = null;
      /* Link to older string with same hash index. To limit the size of this
       * array to 64K, this link is maintained only for the last 32K strings.
       * An index in this array is thus a window index modulo 32K.
       */

      this.head = null; /* Heads of the hash chains or NIL. */

      this.ins_h = 0; /* hash index of string to be inserted */
      this.hash_size = 0; /* number of elements in hash table */
      this.hash_bits = 0; /* log2(hash_size) */
      this.hash_mask = 0; /* hash_size-1 */

      this.hash_shift = 0;
      /* Number of bits by which ins_h must be shifted at each input
       * step. It must be such that after MIN_MATCH steps, the oldest
       * byte no longer takes part in the hash key, that is:
       *   hash_shift * MIN_MATCH >= hash_bits
       */

      this.block_start = 0;
      /* Window position at the beginning of the current output block. Gets
       * negative when the window is moved backwards.
       */

      this.match_length = 0; /* length of best match */
      this.prev_match = 0; /* previous match */
      this.match_available = 0; /* set if previous match exists */
      this.strstart = 0; /* start of string to insert */
      this.match_start = 0; /* start of matching string */
      this.lookahead = 0; /* number of valid bytes ahead in window */

      this.prev_length = 0;
      /* Length of the best match at previous step. Matches not greater than this
       * are discarded. This is used in the lazy match evaluation.
       */

      this.max_chain_length = 0;
      /* To speed up deflation, hash chains are never searched beyond this
       * length.  A higher limit improves compression ratio but degrades the
       * speed.
       */

      this.max_lazy_match = 0;
      /* Attempt to find a better match only when the current match is strictly
       * smaller than this value. This mechanism is used only for compression
       * levels >= 4.
       */
      // That's alias to max_lazy_match, don't use directly
      //this.max_insert_length = 0;
      /* Insert new strings in the hash table only if the match length is not
       * greater than this length. This saves time but degrades compression.
       * max_insert_length is used only for compression levels <= 3.
       */

      this.level = 0; /* compression level (1..9) */
      this.strategy = 0; /* favor or force Huffman coding*/

      this.good_match = 0;
      /* Use a faster search when the previous match is longer than this */

      this.nice_match = 0; /* Stop searching when current match exceeds this */

      /* used by c: */

      /* Didn't use ct_data typedef below to suppress compiler warning */

      // struct ct_data_s dyn_ltree[HEAP_SIZE];   /* literal and length tree */
      // struct ct_data_s dyn_dtree[2*D_CODES+1]; /* distance tree */
      // struct ct_data_s bl_tree[2*BL_CODES+1];  /* Huffman tree for bit lengths */

      // Use flat array of DOUBLE size, with interleaved fata,
      // because JS does not support effective
      this.dyn_ltree = new Buf16(HEAP_SIZE * 2);
      this.dyn_dtree = new Buf16((2 * D_CODES + 1) * 2);
      this.bl_tree = new Buf16((2 * BL_CODES + 1) * 2);
      zero(this.dyn_ltree);
      zero(this.dyn_dtree);
      zero(this.bl_tree);

      this.l_desc = null; /* desc. for literal tree */
      this.d_desc = null; /* desc. for distance tree */
      this.bl_desc = null; /* desc. for bit length tree */

      //ush bl_count[MAX_BITS+1];
      this.bl_count = new Buf16(MAX_BITS + 1);
      /* number of codes at each bit length for an optimal tree */

      //int heap[2*L_CODES+1];      /* heap used to build the Huffman trees */
      this.heap = new Buf16(2 * L_CODES + 1); /* heap used to build the Huffman trees */
      zero(this.heap);

      this.heap_len = 0; /* number of elements in the heap */
      this.heap_max = 0; /* element of largest frequency */
      /* The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
       * The same heap array is used to build all
       */

      this.depth = new Buf16(2 * L_CODES + 1); //uch depth[2*L_CODES+1];
      zero(this.depth);
      /* Depth of each subtree used as tie breaker for trees of equal frequency
       */

      this.l_buf = 0; /* buffer index for literals or lengths */

      this.lit_bufsize = 0;
      /* Size of match buffer for literals/lengths.  There are 4 reasons for
       * limiting lit_bufsize to 64K:
       *   - frequencies can be kept in 16 bit counters
       *   - if compression is not successful for the first block, all input
       *     data is still in the window so we can still emit a stored block even
       *     when input comes from standard input.  (This can also be done for
       *     all blocks if lit_bufsize is not greater than 32K.)
       *   - if compression is not successful for a file smaller than 64K, we can
       *     even emit a stored file instead of a stored block (saving 5 bytes).
       *     This is applicable only for zip (not gzip or zlib).
       *   - creating new Huffman trees less frequently may not provide fast
       *     adaptation to changes in the input data statistics. (Take for
       *     example a binary file with poorly compressible code followed by
       *     a highly compressible string table.) Smaller buffer sizes give
       *     fast adaptation but have of course the overhead of transmitting
       *     trees more frequently.
       *   - I can't count above 4
       */

      this.last_lit = 0; /* running index in l_buf */

      this.d_buf = 0;
      /* Buffer index for distances. To simplify the code, d_buf and l_buf have
       * the same number of elements. To use different lengths, an extra flag
       * array would be necessary.
       */

      this.opt_len = 0; /* bit length of current block with optimal trees */
      this.static_len = 0; /* bit length of current block with static trees */
      this.matches = 0; /* number of string matches in current block */
      this.insert = 0; /* bytes at end of window left to insert */


      this.bi_buf = 0;
      /* Output buffer. bits are inserted starting at the bottom (least
       * significant bits).
       */
      this.bi_valid = 0;
      /* Number of valid bits in bi_buf.  All bits above the last valid bit
       * are always zero.
       */

      // Used for window memory init. We safely ignore it for JS. That makes
      // sense only for pointers and memory check tools.
      //this.high_water = 0;
      /* High water mark offset in window for initialized bytes -- bytes above
       * this are set to zero in order to avoid memory check warnings when
       * longest match routines access bytes past the input.  This is then
       * updated to the new high water mark.
       */
    }


    function deflateResetKeep(strm) {
      var s;

      if (!strm || !strm.state) {
        return err(strm, Z_STREAM_ERROR$2);
      }

      strm.total_in = strm.total_out = 0;
      strm.data_type = Z_UNKNOWN$1;

      s = strm.state;
      s.pending = 0;
      s.pending_out = 0;

      if (s.wrap < 0) {
        s.wrap = -s.wrap;
        /* was made negative by deflate(..., Z_FINISH); */
      }
      s.status = (s.wrap ? INIT_STATE : BUSY_STATE);
      strm.adler = (s.wrap === 2) ?
        0 // crc32(0, Z_NULL, 0)
        :
        1; // adler32(0, Z_NULL, 0)
      s.last_flush = Z_NO_FLUSH$1;
      _tr_init(s);
      return Z_OK$2;
    }


    function deflateReset(strm) {
      var ret = deflateResetKeep(strm);
      if (ret === Z_OK$2) {
        lm_init(strm.state);
      }
      return ret;
    }


    function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
      if (!strm) { // === Z_NULL
        return Z_STREAM_ERROR$2;
      }
      var wrap = 1;

      if (level === Z_DEFAULT_COMPRESSION$1) {
        level = 6;
      }

      if (windowBits < 0) { /* suppress zlib wrapper */
        wrap = 0;
        windowBits = -windowBits;
      } else if (windowBits > 15) {
        wrap = 2; /* write gzip wrapper instead */
        windowBits -= 16;
      }


      if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED$2 ||
        windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
        strategy < 0 || strategy > Z_FIXED$1) {
        return err(strm, Z_STREAM_ERROR$2);
      }


      if (windowBits === 8) {
        windowBits = 9;
      }
      /* until 256-byte window bug fixed */

      var s = new DeflateState();

      strm.state = s;
      s.strm = strm;

      s.wrap = wrap;
      s.gzhead = null;
      s.w_bits = windowBits;
      s.w_size = 1 << s.w_bits;
      s.w_mask = s.w_size - 1;

      s.hash_bits = memLevel + 7;
      s.hash_size = 1 << s.hash_bits;
      s.hash_mask = s.hash_size - 1;
      s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);

      s.window = new Buf8(s.w_size * 2);
      s.head = new Buf16(s.hash_size);
      s.prev = new Buf16(s.w_size);

      // Don't need mem init magic for JS.
      //s.high_water = 0;  /* nothing written to s->window yet */

      s.lit_bufsize = 1 << (memLevel + 6); /* 16K elements by default */

      s.pending_buf_size = s.lit_bufsize * 4;

      //overlay = (ushf *) ZALLOC(strm, s->lit_bufsize, sizeof(ush)+2);
      //s->pending_buf = (uchf *) overlay;
      s.pending_buf = new Buf8(s.pending_buf_size);

      // It is offset from `s.pending_buf` (size is `s.lit_bufsize * 2`)
      //s->d_buf = overlay + s->lit_bufsize/sizeof(ush);
      s.d_buf = 1 * s.lit_bufsize;

      //s->l_buf = s->pending_buf + (1+sizeof(ush))*s->lit_bufsize;
      s.l_buf = (1 + 2) * s.lit_bufsize;

      s.level = level;
      s.strategy = strategy;
      s.method = method;

      return deflateReset(strm);
    }


    function deflate$1(strm, flush) {
      var old_flush, s;
      var beg, val; // for gzip header write only

      if (!strm || !strm.state ||
        flush > Z_BLOCK$2 || flush < 0) {
        return strm ? err(strm, Z_STREAM_ERROR$2) : Z_STREAM_ERROR$2;
      }

      s = strm.state;

      if (!strm.output ||
        (!strm.input && strm.avail_in !== 0) ||
        (s.status === FINISH_STATE && flush !== Z_FINISH$2)) {
        return err(strm, (strm.avail_out === 0) ? Z_BUF_ERROR$2 : Z_STREAM_ERROR$2);
      }

      s.strm = strm; /* just in case */
      old_flush = s.last_flush;
      s.last_flush = flush;

      /* Write the header */
      if (s.status === INIT_STATE) {
        if (s.wrap === 2) {
          // GZIP header
          strm.adler = 0; //crc32(0L, Z_NULL, 0);
          put_byte(s, 31);
          put_byte(s, 139);
          put_byte(s, 8);
          if (!s.gzhead) { // s->gzhead == Z_NULL
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, s.level === 9 ? 2 :
              (s.strategy >= Z_HUFFMAN_ONLY$1 || s.level < 2 ?
                4 : 0));
            put_byte(s, OS_CODE);
            s.status = BUSY_STATE;
          } else {
            put_byte(s, (s.gzhead.text ? 1 : 0) +
              (s.gzhead.hcrc ? 2 : 0) +
              (!s.gzhead.extra ? 0 : 4) +
              (!s.gzhead.name ? 0 : 8) +
              (!s.gzhead.comment ? 0 : 16)
            );
            put_byte(s, s.gzhead.time & 0xff);
            put_byte(s, (s.gzhead.time >> 8) & 0xff);
            put_byte(s, (s.gzhead.time >> 16) & 0xff);
            put_byte(s, (s.gzhead.time >> 24) & 0xff);
            put_byte(s, s.level === 9 ? 2 :
              (s.strategy >= Z_HUFFMAN_ONLY$1 || s.level < 2 ?
                4 : 0));
            put_byte(s, s.gzhead.os & 0xff);
            if (s.gzhead.extra && s.gzhead.extra.length) {
              put_byte(s, s.gzhead.extra.length & 0xff);
              put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
            }
            if (s.gzhead.hcrc) {
              strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
            }
            s.gzindex = 0;
            s.status = EXTRA_STATE;
          }
        } else // DEFLATE header
        {
          var header = (Z_DEFLATED$2 + ((s.w_bits - 8) << 4)) << 8;
          var level_flags = -1;

          if (s.strategy >= Z_HUFFMAN_ONLY$1 || s.level < 2) {
            level_flags = 0;
          } else if (s.level < 6) {
            level_flags = 1;
          } else if (s.level === 6) {
            level_flags = 2;
          } else {
            level_flags = 3;
          }
          header |= (level_flags << 6);
          if (s.strstart !== 0) {
            header |= PRESET_DICT;
          }
          header += 31 - (header % 31);

          s.status = BUSY_STATE;
          putShortMSB(s, header);

          /* Save the adler32 of the preset dictionary: */
          if (s.strstart !== 0) {
            putShortMSB(s, strm.adler >>> 16);
            putShortMSB(s, strm.adler & 0xffff);
          }
          strm.adler = 1; // adler32(0L, Z_NULL, 0);
        }
      }

      //#ifdef GZIP
      if (s.status === EXTRA_STATE) {
        if (s.gzhead.extra /* != Z_NULL*/ ) {
          beg = s.pending; /* start of bytes to update crc */

          while (s.gzindex < (s.gzhead.extra.length & 0xffff)) {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                break;
              }
            }
            put_byte(s, s.gzhead.extra[s.gzindex] & 0xff);
            s.gzindex++;
          }
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (s.gzindex === s.gzhead.extra.length) {
            s.gzindex = 0;
            s.status = NAME_STATE;
          }
        } else {
          s.status = NAME_STATE;
        }
      }
      if (s.status === NAME_STATE) {
        if (s.gzhead.name /* != Z_NULL*/ ) {
          beg = s.pending; /* start of bytes to update crc */
          //int val;

          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            // JS specific: little magic to add zero terminator to end of string
            if (s.gzindex < s.gzhead.name.length) {
              val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);

          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.gzindex = 0;
            s.status = COMMENT_STATE;
          }
        } else {
          s.status = COMMENT_STATE;
        }
      }
      if (s.status === COMMENT_STATE) {
        if (s.gzhead.comment /* != Z_NULL*/ ) {
          beg = s.pending; /* start of bytes to update crc */
          //int val;

          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            // JS specific: little magic to add zero terminator to end of string
            if (s.gzindex < s.gzhead.comment.length) {
              val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);

          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.status = HCRC_STATE;
          }
        } else {
          s.status = HCRC_STATE;
        }
      }
      if (s.status === HCRC_STATE) {
        if (s.gzhead.hcrc) {
          if (s.pending + 2 > s.pending_buf_size) {
            flush_pending(strm);
          }
          if (s.pending + 2 <= s.pending_buf_size) {
            put_byte(s, strm.adler & 0xff);
            put_byte(s, (strm.adler >> 8) & 0xff);
            strm.adler = 0; //crc32(0L, Z_NULL, 0);
            s.status = BUSY_STATE;
          }
        } else {
          s.status = BUSY_STATE;
        }
      }
      //#endif

      /* Flush as much pending output as possible */
      if (s.pending !== 0) {
        flush_pending(strm);
        if (strm.avail_out === 0) {
          /* Since avail_out is 0, deflate will be called again with
           * more output space, but possibly with both pending and
           * avail_in equal to zero. There won't be anything to do,
           * but this is not an error situation so make sure we
           * return OK instead of BUF_ERROR at next call of deflate:
           */
          s.last_flush = -1;
          return Z_OK$2;
        }

        /* Make sure there is something to do and avoid duplicate consecutive
         * flushes. For repeated and useless calls with Z_FINISH, we keep
         * returning Z_STREAM_END instead of Z_BUF_ERROR.
         */
      } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
        flush !== Z_FINISH$2) {
        return err(strm, Z_BUF_ERROR$2);
      }

      /* User must not provide more input after the first FINISH: */
      if (s.status === FINISH_STATE && strm.avail_in !== 0) {
        return err(strm, Z_BUF_ERROR$2);
      }

      /* Start a new block or continue the current one.
       */
      if (strm.avail_in !== 0 || s.lookahead !== 0 ||
        (flush !== Z_NO_FLUSH$1 && s.status !== FINISH_STATE)) {
        var bstate = (s.strategy === Z_HUFFMAN_ONLY$1) ? deflate_huff(s, flush) :
          (s.strategy === Z_RLE$1 ? deflate_rle(s, flush) :
            configuration_table[s.level].func(s, flush));

        if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
          s.status = FINISH_STATE;
        }
        if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
          if (strm.avail_out === 0) {
            s.last_flush = -1;
            /* avoid BUF_ERROR next call, see above */
          }
          return Z_OK$2;
          /* If flush != Z_NO_FLUSH && avail_out == 0, the next call
           * of deflate should use the same flush parameter to make sure
           * that the flush is complete. So we don't have to output an
           * empty block here, this will be done at next call. This also
           * ensures that for a very small output buffer, we emit at most
           * one empty block.
           */
        }
        if (bstate === BS_BLOCK_DONE) {
          if (flush === Z_PARTIAL_FLUSH$1) {
            _tr_align(s);
          } else if (flush !== Z_BLOCK$2) { /* FULL_FLUSH or SYNC_FLUSH */

            _tr_stored_block(s, 0, 0, false);
            /* For a full flush, this empty block will be recognized
             * as a special marker by inflate_sync().
             */
            if (flush === Z_FULL_FLUSH$1) {
              /*** CLEAR_HASH(s); ***/
              /* forget history */
              zero(s.head); // Fill with NIL (= 0);

              if (s.lookahead === 0) {
                s.strstart = 0;
                s.block_start = 0;
                s.insert = 0;
              }
            }
          }
          flush_pending(strm);
          if (strm.avail_out === 0) {
            s.last_flush = -1; /* avoid BUF_ERROR at next call, see above */
            return Z_OK$2;
          }
        }
      }
      //Assert(strm->avail_out > 0, "bug2");
      //if (strm.avail_out <= 0) { throw new Error("bug2");}

      if (flush !== Z_FINISH$2) {
        return Z_OK$2;
      }
      if (s.wrap <= 0) {
        return Z_STREAM_END$2;
      }

      /* Write the trailer */
      if (s.wrap === 2) {
        put_byte(s, strm.adler & 0xff);
        put_byte(s, (strm.adler >> 8) & 0xff);
        put_byte(s, (strm.adler >> 16) & 0xff);
        put_byte(s, (strm.adler >> 24) & 0xff);
        put_byte(s, strm.total_in & 0xff);
        put_byte(s, (strm.total_in >> 8) & 0xff);
        put_byte(s, (strm.total_in >> 16) & 0xff);
        put_byte(s, (strm.total_in >> 24) & 0xff);
      } else {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 0xffff);
      }

      flush_pending(strm);
      /* If avail_out is zero, the application will call deflate again
       * to flush the rest.
       */
      if (s.wrap > 0) {
        s.wrap = -s.wrap;
      }
      /* write the trailer only once! */
      return s.pending !== 0 ? Z_OK$2 : Z_STREAM_END$2;
    }

    function deflateEnd(strm) {
      var status;

      if (!strm /*== Z_NULL*/ || !strm.state /*== Z_NULL*/ ) {
        return Z_STREAM_ERROR$2;
      }

      status = strm.state.status;
      if (status !== INIT_STATE &&
        status !== EXTRA_STATE &&
        status !== NAME_STATE &&
        status !== COMMENT_STATE &&
        status !== HCRC_STATE &&
        status !== BUSY_STATE &&
        status !== FINISH_STATE
      ) {
        return err(strm, Z_STREAM_ERROR$2);
      }

      strm.state = null;

      return status === BUSY_STATE ? err(strm, Z_DATA_ERROR$2) : Z_OK$2;
    }

    /* Not implemented
    exports.deflateBound = deflateBound;
    exports.deflateCopy = deflateCopy;
    exports.deflateParams = deflateParams;
    exports.deflatePending = deflatePending;
    exports.deflatePrime = deflatePrime;
    exports.deflateTune = deflateTune;
    */

    // See state defs from inflate.js
    var BAD$1 = 30;       /* got a data error -- remain here until reset */
    var TYPE$1 = 12;      /* i: waiting for type bits, including last-flag bit */

    /*
       Decode literal, length, and distance codes and write out the resulting
       literal and match bytes until either not enough input or output is
       available, an end-of-block is encountered, or a data error is encountered.
       When large enough input and output buffers are supplied to inflate(), for
       example, a 16K input buffer and a 64K output buffer, more than 95% of the
       inflate execution time is spent in this routine.

       Entry assumptions:

            state.mode === LEN
            strm.avail_in >= 6
            strm.avail_out >= 258
            start >= strm.avail_out
            state.bits < 8

       On return, state.mode is one of:

            LEN -- ran out of enough output space or enough available input
            TYPE -- reached end of block code, inflate() to interpret next block
            BAD -- error in block data

       Notes:

        - The maximum input bits used by a length/distance pair is 15 bits for the
          length code, 5 bits for the length extra, 15 bits for the distance code,
          and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
          Therefore if strm.avail_in >= 6, then there is enough input to avoid
          checking for available input while decoding.

        - The maximum bytes that a single length/distance pair can output is 258
          bytes, which is the maximum length that can be coded.  inflate_fast()
          requires strm.avail_out >= 258 for each loop to avoid checking for
          output space.
     */
    function inflate_fast(strm, start) {
      var state;
      var _in;                    /* local strm.input */
      var last;                   /* have enough input while in < last */
      var _out;                   /* local strm.output */
      var beg;                    /* inflate()'s initial strm.output */
      var end;                    /* while out < end, enough space available */
    //#ifdef INFLATE_STRICT
      var dmax;                   /* maximum distance from zlib header */
    //#endif
      var wsize;                  /* window size or zero if not using window */
      var whave;                  /* valid bytes in the window */
      var wnext;                  /* window write index */
      // Use `s_window` instead `window`, avoid conflict with instrumentation tools
      var s_window;               /* allocated sliding window, if wsize != 0 */
      var hold;                   /* local strm.hold */
      var bits;                   /* local strm.bits */
      var lcode;                  /* local strm.lencode */
      var dcode;                  /* local strm.distcode */
      var lmask;                  /* mask for first level of length codes */
      var dmask;                  /* mask for first level of distance codes */
      var here;                   /* retrieved table entry */
      var op;                     /* code bits, operation, extra bits, or */
                                  /*  window position, window bytes to copy */
      var len;                    /* match length, unused bytes */
      var dist;                   /* match distance */
      var from;                   /* where to copy match from */
      var from_source;


      var input, output; // JS specific, because we have no pointers

      /* copy state to local variables */
      state = strm.state;
      //here = state.here;
      _in = strm.next_in;
      input = strm.input;
      last = _in + (strm.avail_in - 5);
      _out = strm.next_out;
      output = strm.output;
      beg = _out - (start - strm.avail_out);
      end = _out + (strm.avail_out - 257);
    //#ifdef INFLATE_STRICT
      dmax = state.dmax;
    //#endif
      wsize = state.wsize;
      whave = state.whave;
      wnext = state.wnext;
      s_window = state.window;
      hold = state.hold;
      bits = state.bits;
      lcode = state.lencode;
      dcode = state.distcode;
      lmask = (1 << state.lenbits) - 1;
      dmask = (1 << state.distbits) - 1;


      /* decode literals and length/distances until end-of-block or not enough
         input data or output space */

      top:
      do {
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }

        here = lcode[hold & lmask];

        dolen:
        for (;;) { // Goto emulation
          op = here >>> 24/*here.bits*/;
          hold >>>= op;
          bits -= op;
          op = (here >>> 16) & 0xff/*here.op*/;
          if (op === 0) {                          /* literal */
            //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
            //        "inflate:         literal '%c'\n" :
            //        "inflate:         literal 0x%02x\n", here.val));
            output[_out++] = here & 0xffff/*here.val*/;
          }
          else if (op & 16) {                     /* length base */
            len = here & 0xffff/*here.val*/;
            op &= 15;                           /* number of extra bits */
            if (op) {
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
              len += hold & ((1 << op) - 1);
              hold >>>= op;
              bits -= op;
            }
            //Tracevv((stderr, "inflate:         length %u\n", len));
            if (bits < 15) {
              hold += input[_in++] << bits;
              bits += 8;
              hold += input[_in++] << bits;
              bits += 8;
            }
            here = dcode[hold & dmask];

            dodist:
            for (;;) { // goto emulation
              op = here >>> 24/*here.bits*/;
              hold >>>= op;
              bits -= op;
              op = (here >>> 16) & 0xff/*here.op*/;

              if (op & 16) {                      /* distance base */
                dist = here & 0xffff/*here.val*/;
                op &= 15;                       /* number of extra bits */
                if (bits < op) {
                  hold += input[_in++] << bits;
                  bits += 8;
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                  }
                }
                dist += hold & ((1 << op) - 1);
    //#ifdef INFLATE_STRICT
                if (dist > dmax) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD$1;
                  break top;
                }
    //#endif
                hold >>>= op;
                bits -= op;
                //Tracevv((stderr, "inflate:         distance %u\n", dist));
                op = _out - beg;                /* max distance in output */
                if (dist > op) {                /* see if copy from window */
                  op = dist - op;               /* distance back in window */
                  if (op > whave) {
                    if (state.sane) {
                      strm.msg = 'invalid distance too far back';
                      state.mode = BAD$1;
                      break top;
                    }

    // (!) This block is disabled in zlib defailts,
    // don't enable it for binary compatibility
    //#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
    //                if (len <= op - whave) {
    //                  do {
    //                    output[_out++] = 0;
    //                  } while (--len);
    //                  continue top;
    //                }
    //                len -= op - whave;
    //                do {
    //                  output[_out++] = 0;
    //                } while (--op > whave);
    //                if (op === 0) {
    //                  from = _out - dist;
    //                  do {
    //                    output[_out++] = output[from++];
    //                  } while (--len);
    //                  continue top;
    //                }
    //#endif
                  }
                  from = 0; // window index
                  from_source = s_window;
                  if (wnext === 0) {           /* very common case */
                    from += wsize - op;
                    if (op < len) {         /* some from window */
                      len -= op;
                      do {
                        output[_out++] = s_window[from++];
                      } while (--op);
                      from = _out - dist;  /* rest from output */
                      from_source = output;
                    }
                  }
                  else if (wnext < op) {      /* wrap around window */
                    from += wsize + wnext - op;
                    op -= wnext;
                    if (op < len) {         /* some from end of window */
                      len -= op;
                      do {
                        output[_out++] = s_window[from++];
                      } while (--op);
                      from = 0;
                      if (wnext < len) {  /* some from start of window */
                        op = wnext;
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;      /* rest from output */
                        from_source = output;
                      }
                    }
                  }
                  else {                      /* contiguous in window */
                    from += wnext - op;
                    if (op < len) {         /* some from window */
                      len -= op;
                      do {
                        output[_out++] = s_window[from++];
                      } while (--op);
                      from = _out - dist;  /* rest from output */
                      from_source = output;
                    }
                  }
                  while (len > 2) {
                    output[_out++] = from_source[from++];
                    output[_out++] = from_source[from++];
                    output[_out++] = from_source[from++];
                    len -= 3;
                  }
                  if (len) {
                    output[_out++] = from_source[from++];
                    if (len > 1) {
                      output[_out++] = from_source[from++];
                    }
                  }
                }
                else {
                  from = _out - dist;          /* copy direct from output */
                  do {                        /* minimum length is three */
                    output[_out++] = output[from++];
                    output[_out++] = output[from++];
                    output[_out++] = output[from++];
                    len -= 3;
                  } while (len > 2);
                  if (len) {
                    output[_out++] = output[from++];
                    if (len > 1) {
                      output[_out++] = output[from++];
                    }
                  }
                }
              }
              else if ((op & 64) === 0) {          /* 2nd level distance code */
                here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
                continue dodist;
              }
              else {
                strm.msg = 'invalid distance code';
                state.mode = BAD$1;
                break top;
              }

              break; // need to emulate goto via "continue"
            }
          }
          else if ((op & 64) === 0) {              /* 2nd level length code */
            here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
            continue dolen;
          }
          else if (op & 32) {                     /* end-of-block */
            //Tracevv((stderr, "inflate:         end of block\n"));
            state.mode = TYPE$1;
            break top;
          }
          else {
            strm.msg = 'invalid literal/length code';
            state.mode = BAD$1;
            break top;
          }

          break; // need to emulate goto via "continue"
        }
      } while (_in < last && _out < end);

      /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
      len = bits >> 3;
      _in -= len;
      bits -= len << 3;
      hold &= (1 << bits) - 1;

      /* update state and return */
      strm.next_in = _in;
      strm.next_out = _out;
      strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
      strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
      state.hold = hold;
      state.bits = bits;
      return;
    }

    var MAXBITS = 15;
    var ENOUGH_LENS$1 = 852;
    var ENOUGH_DISTS$1 = 592;
    //var ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

    var CODES$1 = 0;
    var LENS$1 = 1;
    var DISTS$1 = 2;

    var lbase = [ /* Length codes 257..285 base */
      3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
      35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
    ];

    var lext = [ /* Length codes 257..285 extra */
      16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
      19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
    ];

    var dbase = [ /* Distance codes 0..29 base */
      1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
      257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
      8193, 12289, 16385, 24577, 0, 0
    ];

    var dext = [ /* Distance codes 0..29 extra */
      16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
      23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
      28, 28, 29, 29, 64, 64
    ];

    function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts) {
      var bits = opts.bits;
      //here = opts.here; /* table entry for duplication */

      var len = 0; /* a code's length in bits */
      var sym = 0; /* index of code symbols */
      var min = 0,
        max = 0; /* minimum and maximum code lengths */
      var root = 0; /* number of index bits for root table */
      var curr = 0; /* number of index bits for current table */
      var drop = 0; /* code bits to drop for sub-table */
      var left = 0; /* number of prefix codes available */
      var used = 0; /* code entries in table used */
      var huff = 0; /* Huffman code */
      var incr; /* for incrementing code, index */
      var fill; /* index for replicating entries */
      var low; /* low bits for current root entry */
      var mask; /* mask for low root bits */
      var next; /* next available space in table */
      var base = null; /* base value table to use */
      var base_index = 0;
      //  var shoextra;    /* extra bits table to use */
      var end; /* use base and extra for symbol > end */
      var count = new Buf16(MAXBITS + 1); //[MAXBITS+1];    /* number of codes of each length */
      var offs = new Buf16(MAXBITS + 1); //[MAXBITS+1];     /* offsets in table for each length */
      var extra = null;
      var extra_index = 0;

      var here_bits, here_op, here_val;

      /*
       Process a set of code lengths to create a canonical Huffman code.  The
       code lengths are lens[0..codes-1].  Each length corresponds to the
       symbols 0..codes-1.  The Huffman code is generated by first sorting the
       symbols by length from short to long, and retaining the symbol order
       for codes with equal lengths.  Then the code starts with all zero bits
       for the first code of the shortest length, and the codes are integer
       increments for the same length, and zeros are appended as the length
       increases.  For the deflate format, these bits are stored backwards
       from their more natural integer increment ordering, and so when the
       decoding tables are built in the large loop below, the integer codes
       are incremented backwards.

       This routine assumes, but does not check, that all of the entries in
       lens[] are in the range 0..MAXBITS.  The caller must assure this.
       1..MAXBITS is interpreted as that code length.  zero means that that
       symbol does not occur in this code.

       The codes are sorted by computing a count of codes for each length,
       creating from that a table of starting indices for each length in the
       sorted table, and then entering the symbols in order in the sorted
       table.  The sorted table is work[], with that space being provided by
       the caller.

       The length counts are used for other purposes as well, i.e. finding
       the minimum and maximum length codes, determining if there are any
       codes at all, checking for a valid set of lengths, and looking ahead
       at length counts to determine sub-table sizes when building the
       decoding tables.
       */

      /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */
      for (len = 0; len <= MAXBITS; len++) {
        count[len] = 0;
      }
      for (sym = 0; sym < codes; sym++) {
        count[lens[lens_index + sym]]++;
      }

      /* bound code lengths, force root to be within code lengths */
      root = bits;
      for (max = MAXBITS; max >= 1; max--) {
        if (count[max] !== 0) {
          break;
        }
      }
      if (root > max) {
        root = max;
      }
      if (max === 0) { /* no symbols to code at all */
        //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
        //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
        //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
        table[table_index++] = (1 << 24) | (64 << 16) | 0;


        //table.op[opts.table_index] = 64;
        //table.bits[opts.table_index] = 1;
        //table.val[opts.table_index++] = 0;
        table[table_index++] = (1 << 24) | (64 << 16) | 0;

        opts.bits = 1;
        return 0; /* no symbols, but wait for decoding to report error */
      }
      for (min = 1; min < max; min++) {
        if (count[min] !== 0) {
          break;
        }
      }
      if (root < min) {
        root = min;
      }

      /* check for an over-subscribed or incomplete set of lengths */
      left = 1;
      for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) {
          return -1;
        } /* over-subscribed */
      }
      if (left > 0 && (type === CODES$1 || max !== 1)) {
        return -1; /* incomplete set */
      }

      /* generate offsets into symbol table for each length for sorting */
      offs[1] = 0;
      for (len = 1; len < MAXBITS; len++) {
        offs[len + 1] = offs[len] + count[len];
      }

      /* sort symbols by length, by symbol order within each length */
      for (sym = 0; sym < codes; sym++) {
        if (lens[lens_index + sym] !== 0) {
          work[offs[lens[lens_index + sym]]++] = sym;
        }
      }

      /*
       Create and fill in decoding tables.  In this loop, the table being
       filled is at next and has curr index bits.  The code being used is huff
       with length len.  That code is converted to an index by dropping drop
       bits off of the bottom.  For codes where len is less than drop + curr,
       those top drop + curr - len bits are incremented through all values to
       fill the table with replicated entries.

       root is the number of index bits for the root table.  When len exceeds
       root, sub-tables are created pointed to by the root entry with an index
       of the low root bits of huff.  This is saved in low to check for when a
       new sub-table should be started.  drop is zero when the root table is
       being filled, and drop is root when sub-tables are being filled.

       When a new sub-table is needed, it is necessary to look ahead in the
       code lengths to determine what size sub-table is needed.  The length
       counts are used for this, and so count[] is decremented as codes are
       entered in the tables.

       used keeps track of how many table entries have been allocated from the
       provided *table space.  It is checked for LENS and DIST tables against
       the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
       the initial root table size constants.  See the comments in inftrees.h
       for more information.

       sym increments through all symbols, and the loop terminates when
       all codes of length max, i.e. all codes, have been processed.  This
       routine permits incomplete codes, so another loop after this one fills
       in the rest of the decoding tables with invalid code markers.
       */

      /* set up for code type */
      // poor man optimization - use if-else instead of switch,
      // to avoid deopts in old v8
      if (type === CODES$1) {
        base = extra = work; /* dummy value--not used */
        end = 19;

      } else if (type === LENS$1) {
        base = lbase;
        base_index -= 257;
        extra = lext;
        extra_index -= 257;
        end = 256;

      } else { /* DISTS */
        base = dbase;
        extra = dext;
        end = -1;
      }

      /* initialize opts for loop */
      huff = 0; /* starting code */
      sym = 0; /* starting code symbol */
      len = min; /* starting code length */
      next = table_index; /* current table to fill in */
      curr = root; /* current table index bits */
      drop = 0; /* current bits to drop from code for index */
      low = -1; /* trigger new sub-table when len > root */
      used = 1 << root; /* use root table entries */
      mask = used - 1; /* mask for comparing low */

      /* check available table space */
      if ((type === LENS$1 && used > ENOUGH_LENS$1) ||
        (type === DISTS$1 && used > ENOUGH_DISTS$1)) {
        return 1;
      }
      /* process all codes and make table entries */
      for (;;) {
        /* create table entry */
        here_bits = len - drop;
        if (work[sym] < end) {
          here_op = 0;
          here_val = work[sym];
        } else if (work[sym] > end) {
          here_op = extra[extra_index + work[sym]];
          here_val = base[base_index + work[sym]];
        } else {
          here_op = 32 + 64; /* end of block */
          here_val = 0;
        }

        /* replicate for those indices with low len bits equal to huff */
        incr = 1 << (len - drop);
        fill = 1 << curr;
        min = fill; /* save offset to next table */
        do {
          fill -= incr;
          table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val | 0;
        } while (fill !== 0);

        /* backwards increment the len-bit code huff */
        incr = 1 << (len - 1);
        while (huff & incr) {
          incr >>= 1;
        }
        if (incr !== 0) {
          huff &= incr - 1;
          huff += incr;
        } else {
          huff = 0;
        }

        /* go to next symbol, update count, len */
        sym++;
        if (--count[len] === 0) {
          if (len === max) {
            break;
          }
          len = lens[lens_index + work[sym]];
        }

        /* create new sub-table if needed */
        if (len > root && (huff & mask) !== low) {
          /* if first time, transition to sub-tables */
          if (drop === 0) {
            drop = root;
          }

          /* increment past last table */
          next += min; /* here min is 1 << curr */

          /* determine length of next table */
          curr = len - drop;
          left = 1 << curr;
          while (curr + drop < max) {
            left -= count[curr + drop];
            if (left <= 0) {
              break;
            }
            curr++;
            left <<= 1;
          }

          /* check for enough space */
          used += 1 << curr;
          if ((type === LENS$1 && used > ENOUGH_LENS$1) ||
            (type === DISTS$1 && used > ENOUGH_DISTS$1)) {
            return 1;
          }

          /* point entry in root table to sub-table */
          low = huff & mask;
          /*table.op[low] = curr;
          table.bits[low] = root;
          table.val[low] = next - opts.table_index;*/
          table[low] = (root << 24) | (curr << 16) | (next - table_index) | 0;
        }
      }

      /* fill in remaining table entry if code is incomplete (guaranteed to have
       at most one remaining entry, since if the code is incomplete, the
       maximum code length that was allowed to get this far is one bit) */
      if (huff !== 0) {
        //table.op[next + huff] = 64;            /* invalid code marker */
        //table.bits[next + huff] = len - drop;
        //table.val[next + huff] = 0;
        table[next + huff] = ((len - drop) << 24) | (64 << 16) | 0;
      }

      /* set return parameters */
      //opts.table_index += used;
      opts.bits = root;
      return 0;
    }

    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;

    /* Public constants ==========================================================*/
    /* ===========================================================================*/


    /* Allowed flush values; see deflate() and inflate() below for details */
    //var Z_NO_FLUSH      = 0;
    //var Z_PARTIAL_FLUSH = 1;
    //var Z_SYNC_FLUSH    = 2;
    //var Z_FULL_FLUSH    = 3;
    var Z_FINISH$1 = 4;
    var Z_BLOCK$1 = 5;
    var Z_TREES$1 = 6;


    /* Return codes for the compression/decompression functions. Negative values
     * are errors, positive values are used for special but normal events.
     */
    var Z_OK$1 = 0;
    var Z_STREAM_END$1 = 1;
    var Z_NEED_DICT$1 = 2;
    //var Z_ERRNO         = -1;
    var Z_STREAM_ERROR$1 = -2;
    var Z_DATA_ERROR$1 = -3;
    var Z_MEM_ERROR = -4;
    var Z_BUF_ERROR$1 = -5;
    //var Z_VERSION_ERROR = -6;

    /* The deflate compression method */
    var Z_DEFLATED$1 = 8;


    /* STATES ====================================================================*/
    /* ===========================================================================*/


    var HEAD = 1; /* i: waiting for magic header */
    var FLAGS = 2; /* i: waiting for method and flags (gzip) */
    var TIME = 3; /* i: waiting for modification time (gzip) */
    var OS = 4; /* i: waiting for extra flags and operating system (gzip) */
    var EXLEN = 5; /* i: waiting for extra length (gzip) */
    var EXTRA = 6; /* i: waiting for extra bytes (gzip) */
    var NAME = 7; /* i: waiting for end of file name (gzip) */
    var COMMENT = 8; /* i: waiting for end of comment (gzip) */
    var HCRC = 9; /* i: waiting for header crc (gzip) */
    var DICTID = 10; /* i: waiting for dictionary check value */
    var DICT = 11; /* waiting for inflateSetDictionary() call */
    var TYPE = 12; /* i: waiting for type bits, including last-flag bit */
    var TYPEDO = 13; /* i: same, but skip check to exit inflate on new block */
    var STORED = 14; /* i: waiting for stored size (length and complement) */
    var COPY_ = 15; /* i/o: same as COPY below, but only first time in */
    var COPY = 16; /* i/o: waiting for input or output to copy stored block */
    var TABLE = 17; /* i: waiting for dynamic block table lengths */
    var LENLENS = 18; /* i: waiting for code length code lengths */
    var CODELENS = 19; /* i: waiting for length/lit and distance code lengths */
    var LEN_ = 20; /* i: same as LEN below, but only first time in */
    var LEN = 21; /* i: waiting for length/lit/eob code */
    var LENEXT = 22; /* i: waiting for length extra bits */
    var DIST = 23; /* i: waiting for distance code */
    var DISTEXT = 24; /* i: waiting for distance extra bits */
    var MATCH = 25; /* o: waiting for output space to copy string */
    var LIT = 26; /* o: waiting for output space to write literal */
    var CHECK = 27; /* i: waiting for 32-bit check value */
    var LENGTH = 28; /* i: waiting for 32-bit length (gzip) */
    var DONE = 29; /* finished check, done -- remain here until reset */
    var BAD = 30; /* got a data error -- remain here until reset */
    var MEM = 31; /* got an inflate() memory error -- remain here until reset */
    var SYNC = 32; /* looking for synchronization bytes to restart inflate() */

    /* ===========================================================================*/



    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;


    function zswap32(q) {
      return (((q >>> 24) & 0xff) +
        ((q >>> 8) & 0xff00) +
        ((q & 0xff00) << 8) +
        ((q & 0xff) << 24));
    }


    function InflateState() {
      this.mode = 0; /* current inflate mode */
      this.last = false; /* true if processing last block */
      this.wrap = 0; /* bit 0 true for zlib, bit 1 true for gzip */
      this.havedict = false; /* true if dictionary provided */
      this.flags = 0; /* gzip header method and flags (0 if zlib) */
      this.dmax = 0; /* zlib header max distance (INFLATE_STRICT) */
      this.check = 0; /* protected copy of check value */
      this.total = 0; /* protected copy of output count */
      // TODO: may be {}
      this.head = null; /* where to save gzip header information */

      /* sliding window */
      this.wbits = 0; /* log base 2 of requested window size */
      this.wsize = 0; /* window size or zero if not using window */
      this.whave = 0; /* valid bytes in the window */
      this.wnext = 0; /* window write index */
      this.window = null; /* allocated sliding window, if needed */

      /* bit accumulator */
      this.hold = 0; /* input bit accumulator */
      this.bits = 0; /* number of bits in "in" */

      /* for string and stored block copying */
      this.length = 0; /* literal or length of data to copy */
      this.offset = 0; /* distance back to copy string from */

      /* for table and code decoding */
      this.extra = 0; /* extra bits needed */

      /* fixed and dynamic code tables */
      this.lencode = null; /* starting table for length/literal codes */
      this.distcode = null; /* starting table for distance codes */
      this.lenbits = 0; /* index bits for lencode */
      this.distbits = 0; /* index bits for distcode */

      /* dynamic table building */
      this.ncode = 0; /* number of code length code lengths */
      this.nlen = 0; /* number of length code lengths */
      this.ndist = 0; /* number of distance code lengths */
      this.have = 0; /* number of code lengths in lens[] */
      this.next = null; /* next available space in codes[] */

      this.lens = new Buf16(320); /* temporary storage for code lengths */
      this.work = new Buf16(288); /* work area for code table building */

      /*
       because we don't have pointers in js, we use lencode and distcode directly
       as buffers so we don't need codes
      */
      //this.codes = new Buf32(ENOUGH);       /* space for code tables */
      this.lendyn = null; /* dynamic table for length/literal codes (JS specific) */
      this.distdyn = null; /* dynamic table for distance codes (JS specific) */
      this.sane = 0; /* if false, allow invalid distance too far */
      this.back = 0; /* bits back of last unprocessed length/lit */
      this.was = 0; /* initial length of match */
    }

    function inflateResetKeep(strm) {
      var state;

      if (!strm || !strm.state) {
        return Z_STREAM_ERROR$1;
      }
      state = strm.state;
      strm.total_in = strm.total_out = state.total = 0;
      strm.msg = ''; /*Z_NULL*/
      if (state.wrap) { /* to support ill-conceived Java test suite */
        strm.adler = state.wrap & 1;
      }
      state.mode = HEAD;
      state.last = 0;
      state.havedict = 0;
      state.dmax = 32768;
      state.head = null /*Z_NULL*/ ;
      state.hold = 0;
      state.bits = 0;
      //state.lencode = state.distcode = state.next = state.codes;
      state.lencode = state.lendyn = new Buf32(ENOUGH_LENS);
      state.distcode = state.distdyn = new Buf32(ENOUGH_DISTS);

      state.sane = 1;
      state.back = -1;
      //Tracev((stderr, "inflate: reset\n"));
      return Z_OK$1;
    }

    function inflateReset(strm) {
      var state;

      if (!strm || !strm.state) {
        return Z_STREAM_ERROR$1;
      }
      state = strm.state;
      state.wsize = 0;
      state.whave = 0;
      state.wnext = 0;
      return inflateResetKeep(strm);

    }

    function inflateReset2(strm, windowBits) {
      var wrap;
      var state;

      /* get the state */
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR$1;
      }
      state = strm.state;

      /* extract wrap request from windowBits parameter */
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else {
        wrap = (windowBits >> 4) + 1;
        if (windowBits < 48) {
          windowBits &= 15;
        }
      }

      /* set number of window bits, free window if different */
      if (windowBits && (windowBits < 8 || windowBits > 15)) {
        return Z_STREAM_ERROR$1;
      }
      if (state.window !== null && state.wbits !== windowBits) {
        state.window = null;
      }

      /* update state and reset the rest of it */
      state.wrap = wrap;
      state.wbits = windowBits;
      return inflateReset(strm);
    }

    function inflateInit2(strm, windowBits) {
      var ret;
      var state;

      if (!strm) {
        return Z_STREAM_ERROR$1;
      }
      //strm.msg = Z_NULL;                 /* in case we return an error */

      state = new InflateState();

      //if (state === Z_NULL) return Z_MEM_ERROR;
      //Tracev((stderr, "inflate: allocated\n"));
      strm.state = state;
      state.window = null /*Z_NULL*/ ;
      ret = inflateReset2(strm, windowBits);
      if (ret !== Z_OK$1) {
        strm.state = null /*Z_NULL*/ ;
      }
      return ret;
    }


    /*
     Return state with length and distance decoding tables and index sizes set to
     fixed code decoding.  Normally this returns fixed tables from inffixed.h.
     If BUILDFIXED is defined, then instead this routine builds the tables the
     first time it's called, and returns those tables the first time and
     thereafter.  This reduces the size of the code by about 2K bytes, in
     exchange for a little execution time.  However, BUILDFIXED should not be
     used for threaded applications, since the rewriting of the tables and virgin
     may not be thread-safe.
     */
    var virgin = true;

    var lenfix, distfix; // We have no pointers in JS, so keep tables separate

    function fixedtables(state) {
      /* build fixed huffman tables if first call (may not be thread safe) */
      if (virgin) {
        var sym;

        lenfix = new Buf32(512);
        distfix = new Buf32(32);

        /* literal/length table */
        sym = 0;
        while (sym < 144) {
          state.lens[sym++] = 8;
        }
        while (sym < 256) {
          state.lens[sym++] = 9;
        }
        while (sym < 280) {
          state.lens[sym++] = 7;
        }
        while (sym < 288) {
          state.lens[sym++] = 8;
        }

        inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, {
          bits: 9
        });

        /* distance table */
        sym = 0;
        while (sym < 32) {
          state.lens[sym++] = 5;
        }

        inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, {
          bits: 5
        });

        /* do this just once */
        virgin = false;
      }

      state.lencode = lenfix;
      state.lenbits = 9;
      state.distcode = distfix;
      state.distbits = 5;
    }


    /*
     Update the window with the last wsize (normally 32K) bytes written before
     returning.  If window does not exist yet, create it.  This is only called
     when a window is already in use, or when output has been written during this
     inflate call, but the end of the deflate stream has not been reached yet.
     It is also called to create a window for dictionary data when a dictionary
     is loaded.

     Providing output buffers larger than 32K to inflate() should provide a speed
     advantage, since only the last 32K of output is copied to the sliding window
     upon return from inflate(), and since all distances after the first 32K of
     output will fall in the output data, making match copies simpler and faster.
     The advantage may be dependent on the size of the processor's data caches.
     */
    function updatewindow(strm, src, end, copy) {
      var dist;
      var state = strm.state;

      /* if it hasn't been done already, allocate space for the window */
      if (state.window === null) {
        state.wsize = 1 << state.wbits;
        state.wnext = 0;
        state.whave = 0;

        state.window = new Buf8(state.wsize);
      }

      /* copy state->wsize or less output bytes into the circular window */
      if (copy >= state.wsize) {
        arraySet(state.window, src, end - state.wsize, state.wsize, 0);
        state.wnext = 0;
        state.whave = state.wsize;
      } else {
        dist = state.wsize - state.wnext;
        if (dist > copy) {
          dist = copy;
        }
        //zmemcpy(state->window + state->wnext, end - copy, dist);
        arraySet(state.window, src, end - copy, dist, state.wnext);
        copy -= dist;
        if (copy) {
          //zmemcpy(state->window, end - copy, copy);
          arraySet(state.window, src, end - copy, copy, 0);
          state.wnext = copy;
          state.whave = state.wsize;
        } else {
          state.wnext += dist;
          if (state.wnext === state.wsize) {
            state.wnext = 0;
          }
          if (state.whave < state.wsize) {
            state.whave += dist;
          }
        }
      }
      return 0;
    }

    function inflate$1(strm, flush) {
      var state;
      var input, output; // input/output buffers
      var next; /* next input INDEX */
      var put; /* next output INDEX */
      var have, left; /* available input and output */
      var hold; /* bit buffer */
      var bits; /* bits in bit buffer */
      var _in, _out; /* save starting available input and output */
      var copy; /* number of stored or match bytes to copy */
      var from; /* where to copy match bytes from */
      var from_source;
      var here = 0; /* current decoding table entry */
      var here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
      //var last;                   /* parent table entry */
      var last_bits, last_op, last_val; // paked "last" denormalized (JS specific)
      var len; /* length to copy for repeats, bits to drop */
      var ret; /* return code */
      var hbuf = new Buf8(4); /* buffer for gzip header crc calculation */
      var opts;

      var n; // temporary var for NEED_BITS

      var order = /* permutation of code lengths */ [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];


      if (!strm || !strm.state || !strm.output ||
        (!strm.input && strm.avail_in !== 0)) {
        return Z_STREAM_ERROR$1;
      }

      state = strm.state;
      if (state.mode === TYPE) {
        state.mode = TYPEDO;
      } /* skip check */


      //--- LOAD() ---
      put = strm.next_out;
      output = strm.output;
      left = strm.avail_out;
      next = strm.next_in;
      input = strm.input;
      have = strm.avail_in;
      hold = state.hold;
      bits = state.bits;
      //---

      _in = have;
      _out = left;
      ret = Z_OK$1;

      inf_leave: // goto emulation
        for (;;) {
          switch (state.mode) {
          case HEAD:
            if (state.wrap === 0) {
              state.mode = TYPEDO;
              break;
            }
            //=== NEEDBITS(16);
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if ((state.wrap & 2) && hold === 0x8b1f) { /* gzip header */
              state.check = 0 /*crc32(0L, Z_NULL, 0)*/ ;
              //=== CRC2(state.check, hold);
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              state.check = crc32(state.check, hbuf, 2, 0);
              //===//

              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
              state.mode = FLAGS;
              break;
            }
            state.flags = 0; /* expect zlib header */
            if (state.head) {
              state.head.done = false;
            }
            if (!(state.wrap & 1) || /* check if zlib header allowed */
              (((hold & 0xff) /*BITS(8)*/ << 8) + (hold >> 8)) % 31) {
              strm.msg = 'incorrect header check';
              state.mode = BAD;
              break;
            }
            if ((hold & 0x0f) /*BITS(4)*/ !== Z_DEFLATED$1) {
              strm.msg = 'unknown compression method';
              state.mode = BAD;
              break;
            }
            //--- DROPBITS(4) ---//
            hold >>>= 4;
            bits -= 4;
            //---//
            len = (hold & 0x0f) /*BITS(4)*/ + 8;
            if (state.wbits === 0) {
              state.wbits = len;
            } else if (len > state.wbits) {
              strm.msg = 'invalid window size';
              state.mode = BAD;
              break;
            }
            state.dmax = 1 << len;
            //Tracev((stderr, "inflate:   zlib header ok\n"));
            strm.adler = state.check = 1 /*adler32(0L, Z_NULL, 0)*/ ;
            state.mode = hold & 0x200 ? DICTID : TYPE;
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            break;
          case FLAGS:
            //=== NEEDBITS(16); */
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            state.flags = hold;
            if ((state.flags & 0xff) !== Z_DEFLATED$1) {
              strm.msg = 'unknown compression method';
              state.mode = BAD;
              break;
            }
            if (state.flags & 0xe000) {
              strm.msg = 'unknown header flags set';
              state.mode = BAD;
              break;
            }
            if (state.head) {
              state.head.text = ((hold >> 8) & 1);
            }
            if (state.flags & 0x0200) {
              //=== CRC2(state.check, hold);
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              state.check = crc32(state.check, hbuf, 2, 0);
              //===//
            }
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = TIME;
            /* falls through */
          case TIME:
            //=== NEEDBITS(32); */
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if (state.head) {
              state.head.time = hold;
            }
            if (state.flags & 0x0200) {
              //=== CRC4(state.check, hold)
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              hbuf[2] = (hold >>> 16) & 0xff;
              hbuf[3] = (hold >>> 24) & 0xff;
              state.check = crc32(state.check, hbuf, 4, 0);
              //===
            }
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = OS;
            /* falls through */
          case OS:
            //=== NEEDBITS(16); */
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if (state.head) {
              state.head.xflags = (hold & 0xff);
              state.head.os = (hold >> 8);
            }
            if (state.flags & 0x0200) {
              //=== CRC2(state.check, hold);
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              state.check = crc32(state.check, hbuf, 2, 0);
              //===//
            }
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = EXLEN;
            /* falls through */
          case EXLEN:
            if (state.flags & 0x0400) {
              //=== NEEDBITS(16); */
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.length = hold;
              if (state.head) {
                state.head.extra_len = hold;
              }
              if (state.flags & 0x0200) {
                //=== CRC2(state.check, hold);
                hbuf[0] = hold & 0xff;
                hbuf[1] = (hold >>> 8) & 0xff;
                state.check = crc32(state.check, hbuf, 2, 0);
                //===//
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
            } else if (state.head) {
              state.head.extra = null /*Z_NULL*/ ;
            }
            state.mode = EXTRA;
            /* falls through */
          case EXTRA:
            if (state.flags & 0x0400) {
              copy = state.length;
              if (copy > have) {
                copy = have;
              }
              if (copy) {
                if (state.head) {
                  len = state.head.extra_len - state.length;
                  if (!state.head.extra) {
                    // Use untyped array for more conveniend processing later
                    state.head.extra = new Array(state.head.extra_len);
                  }
                  arraySet(
                    state.head.extra,
                    input,
                    next,
                    // extra field is limited to 65536 bytes
                    // - no need for additional size check
                    copy,
                    /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                    len
                  );
                  //zmemcpy(state.head.extra + len, next,
                  //        len + copy > state.head.extra_max ?
                  //        state.head.extra_max - len : copy);
                }
                if (state.flags & 0x0200) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                state.length -= copy;
              }
              if (state.length) {
                break inf_leave;
              }
            }
            state.length = 0;
            state.mode = NAME;
            /* falls through */
          case NAME:
            if (state.flags & 0x0800) {
              if (have === 0) {
                break inf_leave;
              }
              copy = 0;
              do {
                // TODO: 2 or 1 bytes?
                len = input[next + copy++];
                /* use constant limit because in js we should not preallocate memory */
                if (state.head && len &&
                  (state.length < 65536 /*state.head.name_max*/ )) {
                  state.head.name += String.fromCharCode(len);
                }
              } while (len && copy < have);

              if (state.flags & 0x0200) {
                state.check = crc32(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              if (len) {
                break inf_leave;
              }
            } else if (state.head) {
              state.head.name = null;
            }
            state.length = 0;
            state.mode = COMMENT;
            /* falls through */
          case COMMENT:
            if (state.flags & 0x1000) {
              if (have === 0) {
                break inf_leave;
              }
              copy = 0;
              do {
                len = input[next + copy++];
                /* use constant limit because in js we should not preallocate memory */
                if (state.head && len &&
                  (state.length < 65536 /*state.head.comm_max*/ )) {
                  state.head.comment += String.fromCharCode(len);
                }
              } while (len && copy < have);
              if (state.flags & 0x0200) {
                state.check = crc32(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              if (len) {
                break inf_leave;
              }
            } else if (state.head) {
              state.head.comment = null;
            }
            state.mode = HCRC;
            /* falls through */
          case HCRC:
            if (state.flags & 0x0200) {
              //=== NEEDBITS(16); */
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              if (hold !== (state.check & 0xffff)) {
                strm.msg = 'header crc mismatch';
                state.mode = BAD;
                break;
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
            }
            if (state.head) {
              state.head.hcrc = ((state.flags >> 9) & 1);
              state.head.done = true;
            }
            strm.adler = state.check = 0;
            state.mode = TYPE;
            break;
          case DICTID:
            //=== NEEDBITS(32); */
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            strm.adler = state.check = zswap32(hold);
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = DICT;
            /* falls through */
          case DICT:
            if (state.havedict === 0) {
              //--- RESTORE() ---
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              //---
              return Z_NEED_DICT$1;
            }
            strm.adler = state.check = 1 /*adler32(0L, Z_NULL, 0)*/ ;
            state.mode = TYPE;
            /* falls through */
          case TYPE:
            if (flush === Z_BLOCK$1 || flush === Z_TREES$1) {
              break inf_leave;
            }
            /* falls through */
          case TYPEDO:
            if (state.last) {
              //--- BYTEBITS() ---//
              hold >>>= bits & 7;
              bits -= bits & 7;
              //---//
              state.mode = CHECK;
              break;
            }
            //=== NEEDBITS(3); */
            while (bits < 3) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            state.last = (hold & 0x01) /*BITS(1)*/ ;
            //--- DROPBITS(1) ---//
            hold >>>= 1;
            bits -= 1;
            //---//

            switch ((hold & 0x03) /*BITS(2)*/ ) {
            case 0:
              /* stored block */
              //Tracev((stderr, "inflate:     stored block%s\n",
              //        state.last ? " (last)" : ""));
              state.mode = STORED;
              break;
            case 1:
              /* fixed block */
              fixedtables(state);
              //Tracev((stderr, "inflate:     fixed codes block%s\n",
              //        state.last ? " (last)" : ""));
              state.mode = LEN_; /* decode codes */
              if (flush === Z_TREES$1) {
                //--- DROPBITS(2) ---//
                hold >>>= 2;
                bits -= 2;
                //---//
                break inf_leave;
              }
              break;
            case 2:
              /* dynamic block */
              //Tracev((stderr, "inflate:     dynamic codes block%s\n",
              //        state.last ? " (last)" : ""));
              state.mode = TABLE;
              break;
            case 3:
              strm.msg = 'invalid block type';
              state.mode = BAD;
            }
            //--- DROPBITS(2) ---//
            hold >>>= 2;
            bits -= 2;
            //---//
            break;
          case STORED:
            //--- BYTEBITS() ---// /* go to byte boundary */
            hold >>>= bits & 7;
            bits -= bits & 7;
            //---//
            //=== NEEDBITS(32); */
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
              strm.msg = 'invalid stored block lengths';
              state.mode = BAD;
              break;
            }
            state.length = hold & 0xffff;
            //Tracev((stderr, "inflate:       stored length %u\n",
            //        state.length));
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = COPY_;
            if (flush === Z_TREES$1) {
              break inf_leave;
            }
            /* falls through */
          case COPY_:
            state.mode = COPY;
            /* falls through */
          case COPY:
            copy = state.length;
            if (copy) {
              if (copy > have) {
                copy = have;
              }
              if (copy > left) {
                copy = left;
              }
              if (copy === 0) {
                break inf_leave;
              }
              //--- zmemcpy(put, next, copy); ---
              arraySet(output, input, next, copy, put);
              //---//
              have -= copy;
              next += copy;
              left -= copy;
              put += copy;
              state.length -= copy;
              break;
            }
            //Tracev((stderr, "inflate:       stored end\n"));
            state.mode = TYPE;
            break;
          case TABLE:
            //=== NEEDBITS(14); */
            while (bits < 14) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            state.nlen = (hold & 0x1f) /*BITS(5)*/ + 257;
            //--- DROPBITS(5) ---//
            hold >>>= 5;
            bits -= 5;
            //---//
            state.ndist = (hold & 0x1f) /*BITS(5)*/ + 1;
            //--- DROPBITS(5) ---//
            hold >>>= 5;
            bits -= 5;
            //---//
            state.ncode = (hold & 0x0f) /*BITS(4)*/ + 4;
            //--- DROPBITS(4) ---//
            hold >>>= 4;
            bits -= 4;
            //---//
            //#ifndef PKZIP_BUG_WORKAROUND
            if (state.nlen > 286 || state.ndist > 30) {
              strm.msg = 'too many length or distance symbols';
              state.mode = BAD;
              break;
            }
            //#endif
            //Tracev((stderr, "inflate:       table sizes ok\n"));
            state.have = 0;
            state.mode = LENLENS;
            /* falls through */
          case LENLENS:
            while (state.have < state.ncode) {
              //=== NEEDBITS(3);
              while (bits < 3) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.lens[order[state.have++]] = (hold & 0x07); //BITS(3);
              //--- DROPBITS(3) ---//
              hold >>>= 3;
              bits -= 3;
              //---//
            }
            while (state.have < 19) {
              state.lens[order[state.have++]] = 0;
            }
            // We have separate tables & no pointers. 2 commented lines below not needed.
            //state.next = state.codes;
            //state.lencode = state.next;
            // Switch to use dynamic table
            state.lencode = state.lendyn;
            state.lenbits = 7;

            opts = {
              bits: state.lenbits
            };
            ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
            state.lenbits = opts.bits;

            if (ret) {
              strm.msg = 'invalid code lengths set';
              state.mode = BAD;
              break;
            }
            //Tracev((stderr, "inflate:       code lengths ok\n"));
            state.have = 0;
            state.mode = CODELENS;
            /* falls through */
          case CODELENS:
            while (state.have < state.nlen + state.ndist) {
              for (;;) {
                here = state.lencode[hold & ((1 << state.lenbits) - 1)]; /*BITS(state.lenbits)*/
                here_bits = here >>> 24;
                here_op = (here >>> 16) & 0xff;
                here_val = here & 0xffff;

                if ((here_bits) <= bits) {
                  break;
                }
                //--- PULLBYTE() ---//
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
                //---//
              }
              if (here_val < 16) {
                //--- DROPBITS(here.bits) ---//
                hold >>>= here_bits;
                bits -= here_bits;
                //---//
                state.lens[state.have++] = here_val;
              } else {
                if (here_val === 16) {
                  //=== NEEDBITS(here.bits + 2);
                  n = here_bits + 2;
                  while (bits < n) {
                    if (have === 0) {
                      break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  //===//
                  //--- DROPBITS(here.bits) ---//
                  hold >>>= here_bits;
                  bits -= here_bits;
                  //---//
                  if (state.have === 0) {
                    strm.msg = 'invalid bit length repeat';
                    state.mode = BAD;
                    break;
                  }
                  len = state.lens[state.have - 1];
                  copy = 3 + (hold & 0x03); //BITS(2);
                  //--- DROPBITS(2) ---//
                  hold >>>= 2;
                  bits -= 2;
                  //---//
                } else if (here_val === 17) {
                  //=== NEEDBITS(here.bits + 3);
                  n = here_bits + 3;
                  while (bits < n) {
                    if (have === 0) {
                      break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  //===//
                  //--- DROPBITS(here.bits) ---//
                  hold >>>= here_bits;
                  bits -= here_bits;
                  //---//
                  len = 0;
                  copy = 3 + (hold & 0x07); //BITS(3);
                  //--- DROPBITS(3) ---//
                  hold >>>= 3;
                  bits -= 3;
                  //---//
                } else {
                  //=== NEEDBITS(here.bits + 7);
                  n = here_bits + 7;
                  while (bits < n) {
                    if (have === 0) {
                      break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  //===//
                  //--- DROPBITS(here.bits) ---//
                  hold >>>= here_bits;
                  bits -= here_bits;
                  //---//
                  len = 0;
                  copy = 11 + (hold & 0x7f); //BITS(7);
                  //--- DROPBITS(7) ---//
                  hold >>>= 7;
                  bits -= 7;
                  //---//
                }
                if (state.have + copy > state.nlen + state.ndist) {
                  strm.msg = 'invalid bit length repeat';
                  state.mode = BAD;
                  break;
                }
                while (copy--) {
                  state.lens[state.have++] = len;
                }
              }
            }

            /* handle error breaks in while */
            if (state.mode === BAD) {
              break;
            }

            /* check for end-of-block code (better have one) */
            if (state.lens[256] === 0) {
              strm.msg = 'invalid code -- missing end-of-block';
              state.mode = BAD;
              break;
            }

            /* build code tables -- note: do not change the lenbits or distbits
               values here (9 and 6) without reading the comments in inftrees.h
               concerning the ENOUGH constants, which depend on those values */
            state.lenbits = 9;

            opts = {
              bits: state.lenbits
            };
            ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
            // We have separate tables & no pointers. 2 commented lines below not needed.
            // state.next_index = opts.table_index;
            state.lenbits = opts.bits;
            // state.lencode = state.next;

            if (ret) {
              strm.msg = 'invalid literal/lengths set';
              state.mode = BAD;
              break;
            }

            state.distbits = 6;
            //state.distcode.copy(state.codes);
            // Switch to use dynamic table
            state.distcode = state.distdyn;
            opts = {
              bits: state.distbits
            };
            ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
            // We have separate tables & no pointers. 2 commented lines below not needed.
            // state.next_index = opts.table_index;
            state.distbits = opts.bits;
            // state.distcode = state.next;

            if (ret) {
              strm.msg = 'invalid distances set';
              state.mode = BAD;
              break;
            }
            //Tracev((stderr, 'inflate:       codes ok\n'));
            state.mode = LEN_;
            if (flush === Z_TREES$1) {
              break inf_leave;
            }
            /* falls through */
          case LEN_:
            state.mode = LEN;
            /* falls through */
          case LEN:
            if (have >= 6 && left >= 258) {
              //--- RESTORE() ---
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              //---
              inflate_fast(strm, _out);
              //--- LOAD() ---
              put = strm.next_out;
              output = strm.output;
              left = strm.avail_out;
              next = strm.next_in;
              input = strm.input;
              have = strm.avail_in;
              hold = state.hold;
              bits = state.bits;
              //---

              if (state.mode === TYPE) {
                state.back = -1;
              }
              break;
            }
            state.back = 0;
            for (;;) {
              here = state.lencode[hold & ((1 << state.lenbits) - 1)]; /*BITS(state.lenbits)*/
              here_bits = here >>> 24;
              here_op = (here >>> 16) & 0xff;
              here_val = here & 0xffff;

              if (here_bits <= bits) {
                break;
              }
              //--- PULLBYTE() ---//
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
              //---//
            }
            if (here_op && (here_op & 0xf0) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (;;) {
                here = state.lencode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) - 1)) /*BITS(last.bits + last.op)*/ >> last_bits)];
                here_bits = here >>> 24;
                here_op = (here >>> 16) & 0xff;
                here_val = here & 0xffff;

                if ((last_bits + here_bits) <= bits) {
                  break;
                }
                //--- PULLBYTE() ---//
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
                //---//
              }
              //--- DROPBITS(last.bits) ---//
              hold >>>= last_bits;
              bits -= last_bits;
              //---//
              state.back += last_bits;
            }
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            state.back += here_bits;
            state.length = here_val;
            if (here_op === 0) {
              //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
              //        "inflate:         literal '%c'\n" :
              //        "inflate:         literal 0x%02x\n", here.val));
              state.mode = LIT;
              break;
            }
            if (here_op & 32) {
              //Tracevv((stderr, "inflate:         end of block\n"));
              state.back = -1;
              state.mode = TYPE;
              break;
            }
            if (here_op & 64) {
              strm.msg = 'invalid literal/length code';
              state.mode = BAD;
              break;
            }
            state.extra = here_op & 15;
            state.mode = LENEXT;
            /* falls through */
          case LENEXT:
            if (state.extra) {
              //=== NEEDBITS(state.extra);
              n = state.extra;
              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.length += hold & ((1 << state.extra) - 1) /*BITS(state.extra)*/ ;
              //--- DROPBITS(state.extra) ---//
              hold >>>= state.extra;
              bits -= state.extra;
              //---//
              state.back += state.extra;
            }
            //Tracevv((stderr, "inflate:         length %u\n", state.length));
            state.was = state.length;
            state.mode = DIST;
            /* falls through */
          case DIST:
            for (;;) {
              here = state.distcode[hold & ((1 << state.distbits) - 1)]; /*BITS(state.distbits)*/
              here_bits = here >>> 24;
              here_op = (here >>> 16) & 0xff;
              here_val = here & 0xffff;

              if ((here_bits) <= bits) {
                break;
              }
              //--- PULLBYTE() ---//
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
              //---//
            }
            if ((here_op & 0xf0) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (;;) {
                here = state.distcode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) - 1)) /*BITS(last.bits + last.op)*/ >> last_bits)];
                here_bits = here >>> 24;
                here_op = (here >>> 16) & 0xff;
                here_val = here & 0xffff;

                if ((last_bits + here_bits) <= bits) {
                  break;
                }
                //--- PULLBYTE() ---//
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
                //---//
              }
              //--- DROPBITS(last.bits) ---//
              hold >>>= last_bits;
              bits -= last_bits;
              //---//
              state.back += last_bits;
            }
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            state.back += here_bits;
            if (here_op & 64) {
              strm.msg = 'invalid distance code';
              state.mode = BAD;
              break;
            }
            state.offset = here_val;
            state.extra = (here_op) & 15;
            state.mode = DISTEXT;
            /* falls through */
          case DISTEXT:
            if (state.extra) {
              //=== NEEDBITS(state.extra);
              n = state.extra;
              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.offset += hold & ((1 << state.extra) - 1) /*BITS(state.extra)*/ ;
              //--- DROPBITS(state.extra) ---//
              hold >>>= state.extra;
              bits -= state.extra;
              //---//
              state.back += state.extra;
            }
            //#ifdef INFLATE_STRICT
            if (state.offset > state.dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD;
              break;
            }
            //#endif
            //Tracevv((stderr, "inflate:         distance %u\n", state.offset));
            state.mode = MATCH;
            /* falls through */
          case MATCH:
            if (left === 0) {
              break inf_leave;
            }
            copy = _out - left;
            if (state.offset > copy) { /* copy from window */
              copy = state.offset - copy;
              if (copy > state.whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD;
                  break;
                }
                // (!) This block is disabled in zlib defailts,
                // don't enable it for binary compatibility
                //#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
                //          Trace((stderr, "inflate.c too far\n"));
                //          copy -= state.whave;
                //          if (copy > state.length) { copy = state.length; }
                //          if (copy > left) { copy = left; }
                //          left -= copy;
                //          state.length -= copy;
                //          do {
                //            output[put++] = 0;
                //          } while (--copy);
                //          if (state.length === 0) { state.mode = LEN; }
                //          break;
                //#endif
              }
              if (copy > state.wnext) {
                copy -= state.wnext;
                from = state.wsize - copy;
              } else {
                from = state.wnext - copy;
              }
              if (copy > state.length) {
                copy = state.length;
              }
              from_source = state.window;
            } else { /* copy from output */
              from_source = output;
              from = put - state.offset;
              copy = state.length;
            }
            if (copy > left) {
              copy = left;
            }
            left -= copy;
            state.length -= copy;
            do {
              output[put++] = from_source[from++];
            } while (--copy);
            if (state.length === 0) {
              state.mode = LEN;
            }
            break;
          case LIT:
            if (left === 0) {
              break inf_leave;
            }
            output[put++] = state.length;
            left--;
            state.mode = LEN;
            break;
          case CHECK:
            if (state.wrap) {
              //=== NEEDBITS(32);
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                // Use '|' insdead of '+' to make sure that result is signed
                hold |= input[next++] << bits;
                bits += 8;
              }
              //===//
              _out -= left;
              strm.total_out += _out;
              state.total += _out;
              if (_out) {
                strm.adler = state.check =
                  /*UPDATE(state.check, put - _out, _out);*/
                  (state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out));

              }
              _out = left;
              // NB: crc32 stored as signed 32-bit int, zswap32 returns signed too
              if ((state.flags ? hold : zswap32(hold)) !== state.check) {
                strm.msg = 'incorrect data check';
                state.mode = BAD;
                break;
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
              //Tracev((stderr, "inflate:   check matches trailer\n"));
            }
            state.mode = LENGTH;
            /* falls through */
          case LENGTH:
            if (state.wrap && state.flags) {
              //=== NEEDBITS(32);
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              if (hold !== (state.total & 0xffffffff)) {
                strm.msg = 'incorrect length check';
                state.mode = BAD;
                break;
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
              //Tracev((stderr, "inflate:   length matches trailer\n"));
            }
            state.mode = DONE;
            /* falls through */
          case DONE:
            ret = Z_STREAM_END$1;
            break inf_leave;
          case BAD:
            ret = Z_DATA_ERROR$1;
            break inf_leave;
          case MEM:
            return Z_MEM_ERROR;
          case SYNC:
            /* falls through */
          default:
            return Z_STREAM_ERROR$1;
          }
        }

      // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

      /*
         Return from inflate(), updating the total counts and the check value.
         If there was no progress during the inflate() call, return a buffer
         error.  Call updatewindow() to create and/or update the window state.
         Note: a memory error from inflate() is non-recoverable.
       */

      //--- RESTORE() ---
      strm.next_out = put;
      strm.avail_out = left;
      strm.next_in = next;
      strm.avail_in = have;
      state.hold = hold;
      state.bits = bits;
      //---

      if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
          (state.mode < CHECK || flush !== Z_FINISH$1))) {
        if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) ;
      }
      _in -= strm.avail_in;
      _out -= strm.avail_out;
      strm.total_in += _in;
      strm.total_out += _out;
      state.total += _out;
      if (state.wrap && _out) {
        strm.adler = state.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
          (state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out));
      }
      strm.data_type = state.bits + (state.last ? 64 : 0) +
        (state.mode === TYPE ? 128 : 0) +
        (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
      if (((_in === 0 && _out === 0) || flush === Z_FINISH$1) && ret === Z_OK$1) {
        ret = Z_BUF_ERROR$1;
      }
      return ret;
    }

    function inflateEnd(strm) {

      if (!strm || !strm.state /*|| strm->zfree == (free_func)0*/ ) {
        return Z_STREAM_ERROR$1;
      }

      var state = strm.state;
      if (state.window) {
        state.window = null;
      }
      strm.state = null;
      return Z_OK$1;
    }

    /* Not implemented
    exports.inflateCopy = inflateCopy;
    exports.inflateGetDictionary = inflateGetDictionary;
    exports.inflateMark = inflateMark;
    exports.inflatePrime = inflatePrime;
    exports.inflateSync = inflateSync;
    exports.inflateSyncPoint = inflateSyncPoint;
    exports.inflateUndermine = inflateUndermine;
    */

    // import constants from './constants';


    // zlib modes
    var NONE = 0;
    var DEFLATE = 1;
    var INFLATE = 2;
    var GZIP = 3;
    var GUNZIP = 4;
    var DEFLATERAW = 5;
    var INFLATERAW = 6;
    var UNZIP = 7;
    var Z_NO_FLUSH=         0,
      Z_PARTIAL_FLUSH=    1,
      Z_SYNC_FLUSH=    2,
      Z_FULL_FLUSH=       3,
      Z_FINISH=       4,
      Z_BLOCK=           5,
      Z_TREES=            6,

      /* Return codes for the compression/decompression functions. Negative values
      * are errors, positive values are used for special but normal events.
      */
      Z_OK=               0,
      Z_STREAM_END=       1,
      Z_NEED_DICT=      2,
      Z_ERRNO=       -1,
      Z_STREAM_ERROR=   -2,
      Z_DATA_ERROR=    -3,
      //Z_MEM_ERROR:     -4,
      Z_BUF_ERROR=    -5,
      //Z_VERSION_ERROR: -6,

      /* compression levels */
      Z_NO_COMPRESSION=         0,
      Z_BEST_SPEED=             1,
      Z_BEST_COMPRESSION=       9,
      Z_DEFAULT_COMPRESSION=   -1,


      Z_FILTERED=               1,
      Z_HUFFMAN_ONLY=           2,
      Z_RLE=                    3,
      Z_FIXED=                  4,
      Z_DEFAULT_STRATEGY=       0,

      /* Possible values of the data_type field (though see inflate()) */
      Z_BINARY=                 0,
      Z_TEXT=                   1,
      //Z_ASCII:                1, // = Z_TEXT (deprecated)
      Z_UNKNOWN=                2,

      /* The deflate compression method */
      Z_DEFLATED=               8;
    function Zlib$1(mode) {
      if (mode < DEFLATE || mode > UNZIP)
        throw new TypeError('Bad argument');

      this.mode = mode;
      this.init_done = false;
      this.write_in_progress = false;
      this.pending_close = false;
      this.windowBits = 0;
      this.level = 0;
      this.memLevel = 0;
      this.strategy = 0;
      this.dictionary = null;
    }

    Zlib$1.prototype.init = function(windowBits, level, memLevel, strategy, dictionary) {
      this.windowBits = windowBits;
      this.level = level;
      this.memLevel = memLevel;
      this.strategy = strategy;
      // dictionary not supported.

      if (this.mode === GZIP || this.mode === GUNZIP)
        this.windowBits += 16;

      if (this.mode === UNZIP)
        this.windowBits += 32;

      if (this.mode === DEFLATERAW || this.mode === INFLATERAW)
        this.windowBits = -this.windowBits;

      this.strm = new ZStream();
      var status;
      switch (this.mode) {
      case DEFLATE:
      case GZIP:
      case DEFLATERAW:
        status = deflateInit2(
          this.strm,
          this.level,
          Z_DEFLATED,
          this.windowBits,
          this.memLevel,
          this.strategy
        );
        break;
      case INFLATE:
      case GUNZIP:
      case INFLATERAW:
      case UNZIP:
        status  = inflateInit2(
          this.strm,
          this.windowBits
        );
        break;
      default:
        throw new Error('Unknown mode ' + this.mode);
      }

      if (status !== Z_OK) {
        this._error(status);
        return;
      }

      this.write_in_progress = false;
      this.init_done = true;
    };

    Zlib$1.prototype.params = function() {
      throw new Error('deflateParams Not supported');
    };

    Zlib$1.prototype._writeCheck = function() {
      if (!this.init_done)
        throw new Error('write before init');

      if (this.mode === NONE)
        throw new Error('already finalized');

      if (this.write_in_progress)
        throw new Error('write already in progress');

      if (this.pending_close)
        throw new Error('close is pending');
    };

    Zlib$1.prototype.write = function(flush, input, in_off, in_len, out, out_off, out_len) {
      this._writeCheck();
      this.write_in_progress = true;

      var self = this;
      browser$1.nextTick(function() {
        self.write_in_progress = false;
        var res = self._write(flush, input, in_off, in_len, out, out_off, out_len);
        self.callback(res[0], res[1]);

        if (self.pending_close)
          self.close();
      });

      return this;
    };

    // set method for Node buffers, used by pako
    function bufferSet(data, offset) {
      for (var i = 0; i < data.length; i++) {
        this[offset + i] = data[i];
      }
    }

    Zlib$1.prototype.writeSync = function(flush, input, in_off, in_len, out, out_off, out_len) {
      this._writeCheck();
      return this._write(flush, input, in_off, in_len, out, out_off, out_len);
    };

    Zlib$1.prototype._write = function(flush, input, in_off, in_len, out, out_off, out_len) {
      this.write_in_progress = true;

      if (flush !== Z_NO_FLUSH &&
          flush !== Z_PARTIAL_FLUSH &&
          flush !== Z_SYNC_FLUSH &&
          flush !== Z_FULL_FLUSH &&
          flush !== Z_FINISH &&
          flush !== Z_BLOCK) {
        throw new Error('Invalid flush value');
      }

      if (input == null) {
        input = new Buffer(0);
        in_len = 0;
        in_off = 0;
      }

      if (out._set)
        out.set = out._set;
      else
        out.set = bufferSet;

      var strm = this.strm;
      strm.avail_in = in_len;
      strm.input = input;
      strm.next_in = in_off;
      strm.avail_out = out_len;
      strm.output = out;
      strm.next_out = out_off;
      var status;
      switch (this.mode) {
      case DEFLATE:
      case GZIP:
      case DEFLATERAW:
        status = deflate$1(strm, flush);
        break;
      case UNZIP:
      case INFLATE:
      case GUNZIP:
      case INFLATERAW:
        status = inflate$1(strm, flush);
        break;
      default:
        throw new Error('Unknown mode ' + this.mode);
      }

      if (status !== Z_STREAM_END && status !== Z_OK) {
        this._error(status);
      }

      this.write_in_progress = false;
      return [strm.avail_in, strm.avail_out];
    };

    Zlib$1.prototype.close = function() {
      if (this.write_in_progress) {
        this.pending_close = true;
        return;
      }

      this.pending_close = false;

      if (this.mode === DEFLATE || this.mode === GZIP || this.mode === DEFLATERAW) {
        deflateEnd(this.strm);
      } else {
        inflateEnd(this.strm);
      }

      this.mode = NONE;
    };
    var status;
    Zlib$1.prototype.reset = function() {
      switch (this.mode) {
      case DEFLATE:
      case DEFLATERAW:
        status = deflateReset(this.strm);
        break;
      case INFLATE:
      case INFLATERAW:
        status = inflateReset(this.strm);
        break;
      }

      if (status !== Z_OK) {
        this._error(status);
      }
    };

    Zlib$1.prototype._error = function(status) {
      this.onerror(msg[status] + ': ' + this.strm.msg, status);

      this.write_in_progress = false;
      if (this.pending_close)
        this.close();
    };

    var _binding = /*#__PURE__*/Object.freeze({
        __proto__: null,
        NONE: NONE,
        DEFLATE: DEFLATE,
        INFLATE: INFLATE,
        GZIP: GZIP,
        GUNZIP: GUNZIP,
        DEFLATERAW: DEFLATERAW,
        INFLATERAW: INFLATERAW,
        UNZIP: UNZIP,
        Z_NO_FLUSH: Z_NO_FLUSH,
        Z_PARTIAL_FLUSH: Z_PARTIAL_FLUSH,
        Z_SYNC_FLUSH: Z_SYNC_FLUSH,
        Z_FULL_FLUSH: Z_FULL_FLUSH,
        Z_FINISH: Z_FINISH,
        Z_BLOCK: Z_BLOCK,
        Z_TREES: Z_TREES,
        Z_OK: Z_OK,
        Z_STREAM_END: Z_STREAM_END,
        Z_NEED_DICT: Z_NEED_DICT,
        Z_ERRNO: Z_ERRNO,
        Z_STREAM_ERROR: Z_STREAM_ERROR,
        Z_DATA_ERROR: Z_DATA_ERROR,
        Z_BUF_ERROR: Z_BUF_ERROR,
        Z_NO_COMPRESSION: Z_NO_COMPRESSION,
        Z_BEST_SPEED: Z_BEST_SPEED,
        Z_BEST_COMPRESSION: Z_BEST_COMPRESSION,
        Z_DEFAULT_COMPRESSION: Z_DEFAULT_COMPRESSION,
        Z_FILTERED: Z_FILTERED,
        Z_HUFFMAN_ONLY: Z_HUFFMAN_ONLY,
        Z_RLE: Z_RLE,
        Z_FIXED: Z_FIXED,
        Z_DEFAULT_STRATEGY: Z_DEFAULT_STRATEGY,
        Z_BINARY: Z_BINARY,
        Z_TEXT: Z_TEXT,
        Z_UNKNOWN: Z_UNKNOWN,
        Z_DEFLATED: Z_DEFLATED,
        Zlib: Zlib$1
    });

    function assert (a, msg) {
      if (!a) {
        throw new Error(msg);
      }
    }
    var binding = {};
    Object.keys(_binding).forEach(function (key) {
      binding[key] = _binding[key];
    });
    // zlib doesn't provide these, so kludge them in following the same
    // const naming scheme zlib uses.
    binding.Z_MIN_WINDOWBITS = 8;
    binding.Z_MAX_WINDOWBITS = 15;
    binding.Z_DEFAULT_WINDOWBITS = 15;

    // fewer than 64 bytes per chunk is stupid.
    // technically it could work with as few as 8, but even 64 bytes
    // is absurdly low.  Usually a MB or more is best.
    binding.Z_MIN_CHUNK = 64;
    binding.Z_MAX_CHUNK = Infinity;
    binding.Z_DEFAULT_CHUNK = (16 * 1024);

    binding.Z_MIN_MEMLEVEL = 1;
    binding.Z_MAX_MEMLEVEL = 9;
    binding.Z_DEFAULT_MEMLEVEL = 8;

    binding.Z_MIN_LEVEL = -1;
    binding.Z_MAX_LEVEL = 9;
    binding.Z_DEFAULT_LEVEL = binding.Z_DEFAULT_COMPRESSION;


    // translation table for return codes.
    var codes = {
      Z_OK: binding.Z_OK,
      Z_STREAM_END: binding.Z_STREAM_END,
      Z_NEED_DICT: binding.Z_NEED_DICT,
      Z_ERRNO: binding.Z_ERRNO,
      Z_STREAM_ERROR: binding.Z_STREAM_ERROR,
      Z_DATA_ERROR: binding.Z_DATA_ERROR,
      Z_MEM_ERROR: binding.Z_MEM_ERROR,
      Z_BUF_ERROR: binding.Z_BUF_ERROR,
      Z_VERSION_ERROR: binding.Z_VERSION_ERROR
    };

    Object.keys(codes).forEach(function(k) {
      codes[codes[k]] = k;
    });

    function createDeflate(o) {
      return new Deflate(o);
    }

    function createInflate(o) {
      return new Inflate(o);
    }

    function createDeflateRaw(o) {
      return new DeflateRaw(o);
    }

    function createInflateRaw(o) {
      return new InflateRaw(o);
    }

    function createGzip(o) {
      return new Gzip(o);
    }

    function createGunzip(o) {
      return new Gunzip(o);
    }

    function createUnzip(o) {
      return new Unzip(o);
    }


    // Convenience methods.
    // compress/decompress a string or buffer in one step.
    function deflate(buffer, opts, callback) {
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      return zlibBuffer(new Deflate(opts), buffer, callback);
    }

    function deflateSync(buffer, opts) {
      return zlibBufferSync(new Deflate(opts), buffer);
    }

    function gzip(buffer, opts, callback) {
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      return zlibBuffer(new Gzip(opts), buffer, callback);
    }

    function gzipSync(buffer, opts) {
      return zlibBufferSync(new Gzip(opts), buffer);
    }

    function deflateRaw(buffer, opts, callback) {
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      return zlibBuffer(new DeflateRaw(opts), buffer, callback);
    }

    function deflateRawSync(buffer, opts) {
      return zlibBufferSync(new DeflateRaw(opts), buffer);
    }

    function unzip(buffer, opts, callback) {
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      return zlibBuffer(new Unzip(opts), buffer, callback);
    }

    function unzipSync(buffer, opts) {
      return zlibBufferSync(new Unzip(opts), buffer);
    }

    function inflate(buffer, opts, callback) {
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      return zlibBuffer(new Inflate(opts), buffer, callback);
    }

    function inflateSync(buffer, opts) {
      return zlibBufferSync(new Inflate(opts), buffer);
    }

    function gunzip(buffer, opts, callback) {
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      return zlibBuffer(new Gunzip(opts), buffer, callback);
    }

    function gunzipSync(buffer, opts) {
      return zlibBufferSync(new Gunzip(opts), buffer);
    }

    function inflateRaw(buffer, opts, callback) {
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      return zlibBuffer(new InflateRaw(opts), buffer, callback);
    }

    function inflateRawSync(buffer, opts) {
      return zlibBufferSync(new InflateRaw(opts), buffer);
    }

    function zlibBuffer(engine, buffer, callback) {
      var buffers = [];
      var nread = 0;

      engine.on('error', onError);
      engine.on('end', onEnd);

      engine.end(buffer);
      flow();

      function flow() {
        var chunk;
        while (null !== (chunk = engine.read())) {
          buffers.push(chunk);
          nread += chunk.length;
        }
        engine.once('readable', flow);
      }

      function onError(err) {
        engine.removeListener('end', onEnd);
        engine.removeListener('readable', flow);
        callback(err);
      }

      function onEnd() {
        var buf = Buffer.concat(buffers, nread);
        buffers = [];
        callback(null, buf);
        engine.close();
      }
    }

    function zlibBufferSync(engine, buffer) {
      if (typeof buffer === 'string')
        buffer = new Buffer(buffer);
      if (!Buffer.isBuffer(buffer))
        throw new TypeError('Not a string or buffer');

      var flushFlag = binding.Z_FINISH;

      return engine._processChunk(buffer, flushFlag);
    }

    // generic zlib
    // minimal 2-byte header
    function Deflate(opts) {
      if (!(this instanceof Deflate)) return new Deflate(opts);
      Zlib.call(this, opts, binding.DEFLATE);
    }

    function Inflate(opts) {
      if (!(this instanceof Inflate)) return new Inflate(opts);
      Zlib.call(this, opts, binding.INFLATE);
    }



    // gzip - bigger header, same deflate compression
    function Gzip(opts) {
      if (!(this instanceof Gzip)) return new Gzip(opts);
      Zlib.call(this, opts, binding.GZIP);
    }

    function Gunzip(opts) {
      if (!(this instanceof Gunzip)) return new Gunzip(opts);
      Zlib.call(this, opts, binding.GUNZIP);
    }



    // raw - no header
    function DeflateRaw(opts) {
      if (!(this instanceof DeflateRaw)) return new DeflateRaw(opts);
      Zlib.call(this, opts, binding.DEFLATERAW);
    }

    function InflateRaw(opts) {
      if (!(this instanceof InflateRaw)) return new InflateRaw(opts);
      Zlib.call(this, opts, binding.INFLATERAW);
    }


    // auto-detect header.
    function Unzip(opts) {
      if (!(this instanceof Unzip)) return new Unzip(opts);
      Zlib.call(this, opts, binding.UNZIP);
    }


    // the Zlib class they all inherit from
    // This thing manages the queue of requests, and returns
    // true or false if there is anything in the queue when
    // you call the .write() method.

    function Zlib(opts, mode) {
      this._opts = opts = opts || {};
      this._chunkSize = opts.chunkSize || binding.Z_DEFAULT_CHUNK;

      Transform.call(this, opts);

      if (opts.flush) {
        if (opts.flush !== binding.Z_NO_FLUSH &&
            opts.flush !== binding.Z_PARTIAL_FLUSH &&
            opts.flush !== binding.Z_SYNC_FLUSH &&
            opts.flush !== binding.Z_FULL_FLUSH &&
            opts.flush !== binding.Z_FINISH &&
            opts.flush !== binding.Z_BLOCK) {
          throw new Error('Invalid flush flag: ' + opts.flush);
        }
      }
      this._flushFlag = opts.flush || binding.Z_NO_FLUSH;

      if (opts.chunkSize) {
        if (opts.chunkSize < binding.Z_MIN_CHUNK ||
            opts.chunkSize > binding.Z_MAX_CHUNK) {
          throw new Error('Invalid chunk size: ' + opts.chunkSize);
        }
      }

      if (opts.windowBits) {
        if (opts.windowBits < binding.Z_MIN_WINDOWBITS ||
            opts.windowBits > binding.Z_MAX_WINDOWBITS) {
          throw new Error('Invalid windowBits: ' + opts.windowBits);
        }
      }

      if (opts.level) {
        if (opts.level < binding.Z_MIN_LEVEL ||
            opts.level > binding.Z_MAX_LEVEL) {
          throw new Error('Invalid compression level: ' + opts.level);
        }
      }

      if (opts.memLevel) {
        if (opts.memLevel < binding.Z_MIN_MEMLEVEL ||
            opts.memLevel > binding.Z_MAX_MEMLEVEL) {
          throw new Error('Invalid memLevel: ' + opts.memLevel);
        }
      }

      if (opts.strategy) {
        if (opts.strategy != binding.Z_FILTERED &&
            opts.strategy != binding.Z_HUFFMAN_ONLY &&
            opts.strategy != binding.Z_RLE &&
            opts.strategy != binding.Z_FIXED &&
            opts.strategy != binding.Z_DEFAULT_STRATEGY) {
          throw new Error('Invalid strategy: ' + opts.strategy);
        }
      }

      if (opts.dictionary) {
        if (!Buffer.isBuffer(opts.dictionary)) {
          throw new Error('Invalid dictionary: it should be a Buffer instance');
        }
      }

      this._binding = new binding.Zlib(mode);

      var self = this;
      this._hadError = false;
      this._binding.onerror = function(message, errno) {
        // there is no way to cleanly recover.
        // continuing only obscures problems.
        self._binding = null;
        self._hadError = true;

        var error = new Error(message);
        error.errno = errno;
        error.code = binding.codes[errno];
        self.emit('error', error);
      };

      var level = binding.Z_DEFAULT_COMPRESSION;
      if (typeof opts.level === 'number') level = opts.level;

      var strategy = binding.Z_DEFAULT_STRATEGY;
      if (typeof opts.strategy === 'number') strategy = opts.strategy;

      this._binding.init(opts.windowBits || binding.Z_DEFAULT_WINDOWBITS,
                         level,
                         opts.memLevel || binding.Z_DEFAULT_MEMLEVEL,
                         strategy,
                         opts.dictionary);

      this._buffer = new Buffer(this._chunkSize);
      this._offset = 0;
      this._closed = false;
      this._level = level;
      this._strategy = strategy;

      this.once('end', this.close);
    }

    inherits$1(Zlib, Transform);

    Zlib.prototype.params = function(level, strategy, callback) {
      if (level < binding.Z_MIN_LEVEL ||
          level > binding.Z_MAX_LEVEL) {
        throw new RangeError('Invalid compression level: ' + level);
      }
      if (strategy != binding.Z_FILTERED &&
          strategy != binding.Z_HUFFMAN_ONLY &&
          strategy != binding.Z_RLE &&
          strategy != binding.Z_FIXED &&
          strategy != binding.Z_DEFAULT_STRATEGY) {
        throw new TypeError('Invalid strategy: ' + strategy);
      }

      if (this._level !== level || this._strategy !== strategy) {
        var self = this;
        this.flush(binding.Z_SYNC_FLUSH, function() {
          self._binding.params(level, strategy);
          if (!self._hadError) {
            self._level = level;
            self._strategy = strategy;
            if (callback) callback();
          }
        });
      } else {
        browser$1.nextTick(callback);
      }
    };

    Zlib.prototype.reset = function() {
      return this._binding.reset();
    };

    // This is the _flush function called by the transform class,
    // internally, when the last chunk has been written.
    Zlib.prototype._flush = function(callback) {
      this._transform(new Buffer(0), '', callback);
    };

    Zlib.prototype.flush = function(kind, callback) {
      var ws = this._writableState;

      if (typeof kind === 'function' || (kind === void 0 && !callback)) {
        callback = kind;
        kind = binding.Z_FULL_FLUSH;
      }

      if (ws.ended) {
        if (callback)
          browser$1.nextTick(callback);
      } else if (ws.ending) {
        if (callback)
          this.once('end', callback);
      } else if (ws.needDrain) {
        var self = this;
        this.once('drain', function() {
          self.flush(callback);
        });
      } else {
        this._flushFlag = kind;
        this.write(new Buffer(0), '', callback);
      }
    };

    Zlib.prototype.close = function(callback) {
      if (callback)
        browser$1.nextTick(callback);

      if (this._closed)
        return;

      this._closed = true;

      this._binding.close();

      var self = this;
      browser$1.nextTick(function() {
        self.emit('close');
      });
    };

    Zlib.prototype._transform = function(chunk, encoding, cb) {
      var flushFlag;
      var ws = this._writableState;
      var ending = ws.ending || ws.ended;
      var last = ending && (!chunk || ws.length === chunk.length);

      if (!chunk === null && !Buffer.isBuffer(chunk))
        return cb(new Error('invalid input'));

      // If it's the last chunk, or a final flush, we use the Z_FINISH flush flag.
      // If it's explicitly flushing at some other time, then we use
      // Z_FULL_FLUSH. Otherwise, use Z_NO_FLUSH for maximum compression
      // goodness.
      if (last)
        flushFlag = binding.Z_FINISH;
      else {
        flushFlag = this._flushFlag;
        // once we've flushed the last of the queue, stop flushing and
        // go back to the normal behavior.
        if (chunk.length >= ws.length) {
          this._flushFlag = this._opts.flush || binding.Z_NO_FLUSH;
        }
      }

      this._processChunk(chunk, flushFlag, cb);
    };

    Zlib.prototype._processChunk = function(chunk, flushFlag, cb) {
      var availInBefore = chunk && chunk.length;
      var availOutBefore = this._chunkSize - this._offset;
      var inOff = 0;

      var self = this;

      var async = typeof cb === 'function';

      if (!async) {
        var buffers = [];
        var nread = 0;

        var error;
        this.on('error', function(er) {
          error = er;
        });

        do {
          var res = this._binding.writeSync(flushFlag,
                                            chunk, // in
                                            inOff, // in_off
                                            availInBefore, // in_len
                                            this._buffer, // out
                                            this._offset, //out_off
                                            availOutBefore); // out_len
        } while (!this._hadError && callback(res[0], res[1]));

        if (this._hadError) {
          throw error;
        }

        var buf = Buffer.concat(buffers, nread);
        this.close();

        return buf;
      }

      var req = this._binding.write(flushFlag,
                                    chunk, // in
                                    inOff, // in_off
                                    availInBefore, // in_len
                                    this._buffer, // out
                                    this._offset, //out_off
                                    availOutBefore); // out_len

      req.buffer = chunk;
      req.callback = callback;

      function callback(availInAfter, availOutAfter) {
        if (self._hadError)
          return;

        var have = availOutBefore - availOutAfter;
        assert(have >= 0, 'have should not go down');

        if (have > 0) {
          var out = self._buffer.slice(self._offset, self._offset + have);
          self._offset += have;
          // serve some output to the consumer.
          if (async) {
            self.push(out);
          } else {
            buffers.push(out);
            nread += out.length;
          }
        }

        // exhausted the output buffer, or used all the input create a new one.
        if (availOutAfter === 0 || self._offset >= self._chunkSize) {
          availOutBefore = self._chunkSize;
          self._offset = 0;
          self._buffer = new Buffer(self._chunkSize);
        }

        if (availOutAfter === 0) {
          // Not actually done.  Need to reprocess.
          // Also, update the availInBefore to the availInAfter value,
          // so that if we have to hit it a third (fourth, etc.) time,
          // it'll have the correct byte counts.
          inOff += (availInBefore - availInAfter);
          availInBefore = availInAfter;

          if (!async)
            return true;

          var newReq = self._binding.write(flushFlag,
                                           chunk,
                                           inOff,
                                           availInBefore,
                                           self._buffer,
                                           self._offset,
                                           self._chunkSize);
          newReq.callback = callback; // this same function
          newReq.buffer = chunk;
          return;
        }

        if (!async)
          return false;

        // finished with the chunk.
        cb();
      }
    };

    inherits$1(Deflate, Zlib);
    inherits$1(Inflate, Zlib);
    inherits$1(Gzip, Zlib);
    inherits$1(Gunzip, Zlib);
    inherits$1(DeflateRaw, Zlib);
    inherits$1(InflateRaw, Zlib);
    inherits$1(Unzip, Zlib);
    var _polyfillNode_zlib = {
      codes: codes,
      createDeflate: createDeflate,
      createInflate: createInflate,
      createDeflateRaw: createDeflateRaw,
      createInflateRaw: createInflateRaw,
      createGzip: createGzip,
      createGunzip: createGunzip,
      createUnzip: createUnzip,
      deflate: deflate,
      deflateSync: deflateSync,
      gzip: gzip,
      gzipSync: gzipSync,
      deflateRaw: deflateRaw,
      deflateRawSync: deflateRawSync,
      unzip: unzip,
      unzipSync: unzipSync,
      inflate: inflate,
      inflateSync: inflateSync,
      gunzip: gunzip,
      gunzipSync: gunzipSync,
      inflateRaw: inflateRaw,
      inflateRawSync: inflateRawSync,
      Deflate: Deflate,
      Inflate: Inflate,
      Gzip: Gzip,
      Gunzip: Gunzip,
      DeflateRaw: DeflateRaw,
      InflateRaw: InflateRaw,
      Unzip: Unzip,
      Zlib: Zlib
    };

    var _polyfillNode_zlib$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        codes: codes,
        createDeflate: createDeflate,
        createInflate: createInflate,
        createDeflateRaw: createDeflateRaw,
        createInflateRaw: createInflateRaw,
        createGzip: createGzip,
        createGunzip: createGunzip,
        createUnzip: createUnzip,
        deflate: deflate,
        deflateSync: deflateSync,
        gzip: gzip,
        gzipSync: gzipSync,
        deflateRaw: deflateRaw,
        deflateRawSync: deflateRawSync,
        unzip: unzip,
        unzipSync: unzipSync,
        inflate: inflate,
        inflateSync: inflateSync,
        gunzip: gunzip,
        gunzipSync: gunzipSync,
        inflateRaw: inflateRaw,
        inflateRawSync: inflateRawSync,
        Deflate: Deflate,
        Inflate: Inflate,
        Gzip: Gzip,
        Gunzip: Gunzip,
        DeflateRaw: DeflateRaw,
        InflateRaw: InflateRaw,
        Unzip: Unzip,
        Zlib: Zlib,
        'default': _polyfillNode_zlib
    });

    var require$$1 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_zlib$1);

    // We define these manually to ensure they're always copied
    // even if they would move up the prototype chain
    // https://nodejs.org/api/http.html#http_class_http_incomingmessage
    const knownProperties = [
    	'aborted',
    	'complete',
    	'destroy',
    	'headers',
    	'httpVersion',
    	'httpVersionMinor',
    	'httpVersionMajor',
    	'method',
    	'rawHeaders',
    	'rawTrailers',
    	'setTimeout',
    	'socket',
    	'statusCode',
    	'statusMessage',
    	'trailers',
    	'url'
    ];

    var mimicResponse$1 = (fromStream, toStream) => {
    	const fromProperties = new Set(Object.keys(fromStream).concat(knownProperties));

    	for (const property of fromProperties) {
    		// Don't overwrite existing properties.
    		if (property in toStream) {
    			continue;
    		}

    		toStream[property] = typeof fromStream[property] === 'function' ? fromStream[property].bind(fromStream) : fromStream[property];
    	}

    	return toStream;
    };

    const {PassThrough: PassThroughStream} = require$$0;
    const zlib = require$$1;
    const mimicResponse = mimicResponse$1;

    const decompressResponse = response => {
    	const contentEncoding = (response.headers['content-encoding'] || '').toLowerCase();

    	if (!['gzip', 'deflate', 'br'].includes(contentEncoding)) {
    		return response;
    	}

    	const isBrotli = contentEncoding === 'br';
    	if (isBrotli && typeof zlib.createBrotliDecompress !== 'function') {
    		return response;
    	}

    	const decompress = isBrotli ? zlib.createBrotliDecompress() : zlib.createUnzip();
    	const stream = new PassThroughStream();

    	mimicResponse(response, stream);

    	decompress.on('error', error => {
    		// Ignore empty response
    		if (error.code === 'Z_BUF_ERROR') {
    			stream.end();
    			return;
    		}

    		stream.emit('error', error);
    	});

    	response.pipe(decompress).pipe(stream);

    	return stream;
    };

    decompressResponse$1.exports = decompressResponse;
    // TODO: remove this in the next major version
    decompressResponse$1.exports.default = decompressResponse;

    /**
     * Copyright 2019-2020, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var __assign$3 = (commonjsGlobal && commonjsGlobal.__assign) || function () {
        __assign$3 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign$3.apply(this, arguments);
    };
    var __importDefault$2 = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };
    Object.defineProperty(nodeRequest, "__esModule", { value: true });
    var http_1 = __importDefault$2(require$$0$1);
    var https_1 = __importDefault$2(require$$1$1);
    var url_1 = __importDefault$2(require$$2);
    var config_1$3 = config;
    var decompress_response_1 = __importDefault$2(decompressResponse$1.exports);
    function getRequestOptionsFromUrl(url) {
        return {
            hostname: url.hostname,
            path: url.path,
            port: url.port,
            protocol: url.protocol,
        };
    }
    /**
     * Convert incomingMessage.headers (which has type http.IncomingHttpHeaders) into our Headers type defined in src/http.ts.
     *
     * Our Headers type is simplified and can't represent mutliple values for the same header name.
     *
     * We don't currently need multiple values support, and the consumer code becomes simpler if it can assume at-most 1 value
     * per header name.
     *
     */
    function createHeadersFromNodeIncomingMessage(incomingMessage) {
        var headers = {};
        Object.keys(incomingMessage.headers).forEach(function (headerName) {
            var headerValue = incomingMessage.headers[headerName];
            if (typeof headerValue === 'string') {
                headers[headerName] = headerValue;
            }
            else if (typeof headerValue === 'undefined') ;
            else {
                // array
                if (headerValue.length > 0) {
                    // We don't care about multiple values - just take the first one
                    headers[headerName] = headerValue[0];
                }
            }
        });
        return headers;
    }
    function getResponseFromRequest(request) {
        // TODO: When we drop support for Node 6, consider using util.promisify instead of
        // constructing own Promise
        return new Promise(function (resolve, reject) {
            var timeout = setTimeout(function () {
                request.abort();
                reject(new Error('Request timed out'));
            }, config_1$3.REQUEST_TIMEOUT_MS);
            request.once('response', function (incomingMessage) {
                if (request.aborted) {
                    return;
                }
                var response = decompress_response_1.default(incomingMessage);
                response.setEncoding('utf8');
                var responseData = '';
                response.on('data', function (chunk) {
                    if (!request.aborted) {
                        responseData += chunk;
                    }
                });
                response.on('end', function () {
                    if (request.aborted) {
                        return;
                    }
                    clearTimeout(timeout);
                    resolve({
                        statusCode: incomingMessage.statusCode,
                        body: responseData,
                        headers: createHeadersFromNodeIncomingMessage(incomingMessage),
                    });
                });
            });
            request.on('error', function (err) {
                clearTimeout(timeout);
                if (err instanceof Error) {
                    reject(err);
                }
                else if (typeof err === 'string') {
                    reject(new Error(err));
                }
                else {
                    reject(new Error('Request error'));
                }
            });
        });
    }
    function makeGetRequest(reqUrl, headers) {
        // TODO: Use non-legacy URL parsing when we drop support for Node 6
        var parsedUrl = url_1.default.parse(reqUrl);
        var requester;
        if (parsedUrl.protocol === 'http:') {
            requester = http_1.default.request;
        }
        else if (parsedUrl.protocol === 'https:') {
            requester = https_1.default.request;
        }
        else {
            return {
                responsePromise: Promise.reject(new Error("Unsupported protocol: " + parsedUrl.protocol)),
                abort: function () { },
            };
        }
        var requestOptions = __assign$3(__assign$3({}, getRequestOptionsFromUrl(parsedUrl)), { method: 'GET', headers: __assign$3(__assign$3({}, headers), { 'accept-encoding': 'gzip,deflate' }) });
        var request = requester(requestOptions);
        var responsePromise = getResponseFromRequest(request);
        request.end();
        return {
            abort: function () {
                request.abort();
            },
            responsePromise: responsePromise,
        };
    }
    nodeRequest.makeGetRequest = makeGetRequest;

    var httpPollingDatafileManager = {};

    var eventEmitter = {};

    /**
     * Copyright 2019-2020, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    Object.defineProperty(eventEmitter, "__esModule", { value: true });
    var EventEmitter = /** @class */ (function () {
        function EventEmitter() {
            this.listeners = {};
            this.listenerId = 1;
        }
        EventEmitter.prototype.on = function (eventName, listener) {
            var _this = this;
            if (!this.listeners[eventName]) {
                this.listeners[eventName] = {};
            }
            var currentListenerId = String(this.listenerId);
            this.listenerId++;
            this.listeners[eventName][currentListenerId] = listener;
            return function () {
                if (_this.listeners[eventName]) {
                    delete _this.listeners[eventName][currentListenerId];
                }
            };
        };
        EventEmitter.prototype.emit = function (eventName, arg) {
            var listeners = this.listeners[eventName];
            if (listeners) {
                Object.keys(listeners).forEach(function (listenerId) {
                    var listener = listeners[listenerId];
                    listener(arg);
                });
            }
        };
        EventEmitter.prototype.removeAllListeners = function () {
            this.listeners = {};
        };
        return EventEmitter;
    }());
    eventEmitter.default = EventEmitter;

    var backoffController = {};

    /**
     * Copyright 2019-2020, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    Object.defineProperty(backoffController, "__esModule", { value: true });
    var config_1$2 = config;
    function randomMilliseconds() {
        return Math.round(Math.random() * 1000);
    }
    var BackoffController = /** @class */ (function () {
        function BackoffController() {
            this.errorCount = 0;
        }
        BackoffController.prototype.getDelay = function () {
            if (this.errorCount === 0) {
                return 0;
            }
            var baseWaitSeconds = config_1$2.BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT[Math.min(config_1$2.BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT.length - 1, this.errorCount)];
            return baseWaitSeconds * 1000 + randomMilliseconds();
        };
        BackoffController.prototype.countError = function () {
            if (this.errorCount < config_1$2.BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT.length - 1) {
                this.errorCount++;
            }
        };
        BackoffController.prototype.reset = function () {
            this.errorCount = 0;
        };
        return BackoffController;
    }());
    backoffController.default = BackoffController;

    /**
     * Copyright 2019-2020, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var __assign$2 = (commonjsGlobal && commonjsGlobal.__assign) || function () {
        __assign$2 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign$2.apply(this, arguments);
    };
    var __importDefault$1 = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };
    Object.defineProperty(httpPollingDatafileManager, "__esModule", { value: true });
    var js_sdk_logging_1$1 = lib$1;
    var js_sdk_utils_1 = lib;
    var eventEmitter_1 = __importDefault$1(eventEmitter);
    var config_1$1 = config;
    var backoffController_1 = __importDefault$1(backoffController);
    var logger$d = js_sdk_logging_1$1.getLogger('DatafileManager');
    var UPDATE_EVT = 'update';
    function isValidUpdateInterval(updateInterval) {
        return updateInterval >= config_1$1.MIN_UPDATE_INTERVAL;
    }
    function isSuccessStatusCode(statusCode) {
        return statusCode >= 200 && statusCode < 400;
    }
    var noOpKeyValueCache = {
        get: function () {
            return Promise.resolve('');
        },
        set: function () {
            return Promise.resolve();
        },
        contains: function () {
            return Promise.resolve(false);
        },
        remove: function () {
            return Promise.resolve();
        },
    };
    var HttpPollingDatafileManager$1 = /** @class */ (function () {
        function HttpPollingDatafileManager(config) {
            var _this = this;
            var configWithDefaultsApplied = __assign$2(__assign$2({}, this.getConfigDefaults()), config);
            var datafile = configWithDefaultsApplied.datafile, _a = configWithDefaultsApplied.autoUpdate, autoUpdate = _a === void 0 ? false : _a, sdkKey = configWithDefaultsApplied.sdkKey, _b = configWithDefaultsApplied.updateInterval, updateInterval = _b === void 0 ? config_1$1.DEFAULT_UPDATE_INTERVAL : _b, _c = configWithDefaultsApplied.urlTemplate, urlTemplate = _c === void 0 ? config_1$1.DEFAULT_URL_TEMPLATE : _c, _d = configWithDefaultsApplied.cache, cache = _d === void 0 ? noOpKeyValueCache : _d;
            this.cache = cache;
            this.cacheKey = 'opt-datafile-' + sdkKey;
            this.isReadyPromiseSettled = false;
            this.readyPromiseResolver = function () { };
            this.readyPromiseRejecter = function () { };
            this.readyPromise = new Promise(function (resolve, reject) {
                _this.readyPromiseResolver = resolve;
                _this.readyPromiseRejecter = reject;
            });
            if (datafile) {
                this.currentDatafile = datafile;
                if (!sdkKey) {
                    this.resolveReadyPromise();
                }
            }
            else {
                this.currentDatafile = '';
            }
            this.isStarted = false;
            this.datafileUrl = js_sdk_utils_1.sprintf(urlTemplate, sdkKey);
            this.emitter = new eventEmitter_1.default();
            this.autoUpdate = autoUpdate;
            if (isValidUpdateInterval(updateInterval)) {
                this.updateInterval = updateInterval;
            }
            else {
                logger$d.warn('Invalid updateInterval %s, defaulting to %s', updateInterval, config_1$1.DEFAULT_UPDATE_INTERVAL);
                this.updateInterval = config_1$1.DEFAULT_UPDATE_INTERVAL;
            }
            this.currentTimeout = null;
            this.currentRequest = null;
            this.backoffController = new backoffController_1.default();
            this.syncOnCurrentRequestComplete = false;
        }
        HttpPollingDatafileManager.prototype.get = function () {
            return this.currentDatafile;
        };
        HttpPollingDatafileManager.prototype.start = function () {
            if (!this.isStarted) {
                logger$d.debug('Datafile manager started');
                this.isStarted = true;
                this.backoffController.reset();
                this.setDatafileFromCacheIfAvailable();
                this.syncDatafile();
            }
        };
        HttpPollingDatafileManager.prototype.stop = function () {
            logger$d.debug('Datafile manager stopped');
            this.isStarted = false;
            if (this.currentTimeout) {
                clearTimeout(this.currentTimeout);
                this.currentTimeout = null;
            }
            this.emitter.removeAllListeners();
            if (this.currentRequest) {
                this.currentRequest.abort();
                this.currentRequest = null;
            }
            return Promise.resolve();
        };
        HttpPollingDatafileManager.prototype.onReady = function () {
            return this.readyPromise;
        };
        HttpPollingDatafileManager.prototype.on = function (eventName, listener) {
            return this.emitter.on(eventName, listener);
        };
        HttpPollingDatafileManager.prototype.onRequestRejected = function (err) {
            if (!this.isStarted) {
                return;
            }
            this.backoffController.countError();
            if (err instanceof Error) {
                logger$d.error('Error fetching datafile: %s', err.message, err);
            }
            else if (typeof err === 'string') {
                logger$d.error('Error fetching datafile: %s', err);
            }
            else {
                logger$d.error('Error fetching datafile');
            }
        };
        HttpPollingDatafileManager.prototype.onRequestResolved = function (response) {
            if (!this.isStarted) {
                return;
            }
            if (typeof response.statusCode !== 'undefined' && isSuccessStatusCode(response.statusCode)) {
                this.backoffController.reset();
            }
            else {
                this.backoffController.countError();
            }
            this.trySavingLastModified(response.headers);
            var datafile = this.getNextDatafileFromResponse(response);
            if (datafile !== '') {
                logger$d.info('Updating datafile from response');
                this.currentDatafile = datafile;
                this.cache.set(this.cacheKey, datafile);
                if (!this.isReadyPromiseSettled) {
                    this.resolveReadyPromise();
                }
                else {
                    var datafileUpdate = {
                        datafile: datafile,
                    };
                    this.emitter.emit(UPDATE_EVT, datafileUpdate);
                }
            }
        };
        HttpPollingDatafileManager.prototype.onRequestComplete = function () {
            if (!this.isStarted) {
                return;
            }
            this.currentRequest = null;
            if (!this.isReadyPromiseSettled && !this.autoUpdate) {
                // We will never resolve ready, so reject it
                this.rejectReadyPromise(new Error('Failed to become ready'));
            }
            if (this.autoUpdate && this.syncOnCurrentRequestComplete) {
                this.syncDatafile();
            }
            this.syncOnCurrentRequestComplete = false;
        };
        HttpPollingDatafileManager.prototype.syncDatafile = function () {
            var _this = this;
            var headers = {};
            if (this.lastResponseLastModified) {
                headers['if-modified-since'] = this.lastResponseLastModified;
            }
            logger$d.debug('Making datafile request to url %s with headers: %s', this.datafileUrl, function () { return JSON.stringify(headers); });
            this.currentRequest = this.makeGetRequest(this.datafileUrl, headers);
            var onRequestComplete = function () {
                _this.onRequestComplete();
            };
            var onRequestResolved = function (response) {
                _this.onRequestResolved(response);
            };
            var onRequestRejected = function (err) {
                _this.onRequestRejected(err);
            };
            this.currentRequest.responsePromise
                .then(onRequestResolved, onRequestRejected)
                .then(onRequestComplete, onRequestComplete);
            if (this.autoUpdate) {
                this.scheduleNextUpdate();
            }
        };
        HttpPollingDatafileManager.prototype.resolveReadyPromise = function () {
            this.readyPromiseResolver();
            this.isReadyPromiseSettled = true;
        };
        HttpPollingDatafileManager.prototype.rejectReadyPromise = function (err) {
            this.readyPromiseRejecter(err);
            this.isReadyPromiseSettled = true;
        };
        HttpPollingDatafileManager.prototype.scheduleNextUpdate = function () {
            var _this = this;
            var currentBackoffDelay = this.backoffController.getDelay();
            var nextUpdateDelay = Math.max(currentBackoffDelay, this.updateInterval);
            logger$d.debug('Scheduling sync in %s ms', nextUpdateDelay);
            this.currentTimeout = setTimeout(function () {
                if (_this.currentRequest) {
                    _this.syncOnCurrentRequestComplete = true;
                }
                else {
                    _this.syncDatafile();
                }
            }, nextUpdateDelay);
        };
        HttpPollingDatafileManager.prototype.getNextDatafileFromResponse = function (response) {
            logger$d.debug('Response status code: %s', response.statusCode);
            if (typeof response.statusCode === 'undefined') {
                return '';
            }
            if (response.statusCode === 304) {
                return '';
            }
            if (isSuccessStatusCode(response.statusCode)) {
                return response.body;
            }
            return '';
        };
        HttpPollingDatafileManager.prototype.trySavingLastModified = function (headers) {
            var lastModifiedHeader = headers['last-modified'] || headers['Last-Modified'];
            if (typeof lastModifiedHeader !== 'undefined') {
                this.lastResponseLastModified = lastModifiedHeader;
                logger$d.debug('Saved last modified header value from response: %s', this.lastResponseLastModified);
            }
        };
        HttpPollingDatafileManager.prototype.setDatafileFromCacheIfAvailable = function () {
            var _this = this;
            this.cache.get(this.cacheKey).then(function (datafile) {
                if (_this.isStarted && !_this.isReadyPromiseSettled && datafile !== '') {
                    logger$d.debug('Using datafile from cache');
                    _this.currentDatafile = datafile;
                    _this.resolveReadyPromise();
                }
            });
        };
        return HttpPollingDatafileManager;
    }());
    httpPollingDatafileManager.default = HttpPollingDatafileManager$1;

    /**
     * Copyright 2019-2020, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var __extends$1 = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var __assign$1 = (commonjsGlobal && commonjsGlobal.__assign) || function () {
        __assign$1 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign$1.apply(this, arguments);
    };
    var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };
    Object.defineProperty(nodeDatafileManager, "__esModule", { value: true });
    var js_sdk_logging_1 = lib$1;
    var nodeRequest_1 = nodeRequest;
    var httpPollingDatafileManager_1 = __importDefault(httpPollingDatafileManager);
    var config_1 = config;
    var logger$c = js_sdk_logging_1.getLogger('NodeDatafileManager');
    var NodeDatafileManager = /** @class */ (function (_super) {
        __extends$1(NodeDatafileManager, _super);
        function NodeDatafileManager(config) {
            var _this = this;
            var defaultUrlTemplate = config.datafileAccessToken ? config_1.DEFAULT_AUTHENTICATED_URL_TEMPLATE : config_1.DEFAULT_URL_TEMPLATE;
            _this = _super.call(this, __assign$1(__assign$1({}, config), { urlTemplate: config.urlTemplate || defaultUrlTemplate })) || this;
            _this.accessToken = config.datafileAccessToken;
            return _this;
        }
        NodeDatafileManager.prototype.makeGetRequest = function (reqUrl, headers) {
            var requestHeaders = Object.assign({}, headers);
            if (this.accessToken) {
                logger$c.debug('Adding Authorization header with Bearer Token');
                requestHeaders['Authorization'] = "Bearer " + this.accessToken;
            }
            return nodeRequest_1.makeGetRequest(reqUrl, requestHeaders);
        };
        NodeDatafileManager.prototype.getConfigDefaults = function () {
            return {
                autoUpdate: true,
            };
        };
        return NodeDatafileManager;
    }(httpPollingDatafileManager_1.default));
    nodeDatafileManager.default = NodeDatafileManager;

    /**
     * Copyright 2019-2020, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    Object.defineProperty(index_node, "__esModule", { value: true });
    var nodeDatafileManager_1 = nodeDatafileManager;
    var HttpPollingDatafileManager = index_node.HttpPollingDatafileManager = nodeDatafileManager_1.default;

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    }

    /**
     * @export
     * @class NoopErrorHandler
     * @implements {ErrorHandler}
     */
    var NoopErrorHandler = /** @class */ (function () {
        function NoopErrorHandler() {
        }
        /**
         * @param {Error} exception
         * @memberof NoopErrorHandler
         */
        NoopErrorHandler.prototype.handleError = function (exception) {
            // no-op
            return;
        };
        return NoopErrorHandler;
    }());
    var globalErrorHandler = new NoopErrorHandler();
    /**
     * @export
     * @param {ErrorHandler} handler
     */
    function setErrorHandler(handler) {
        globalErrorHandler = handler;
    }
    /**
     * @export
     * @returns {ErrorHandler}
     */
    function getErrorHandler() {
        return globalErrorHandler;
    }

    var MAX_SAFE_INTEGER_LIMIT = Math.pow(2, 53);
    // eslint-disable-next-line
    function assign(target) {
        var sources = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            sources[_i - 1] = arguments[_i];
        }
        if (!target) {
            return {};
        }
        if (typeof Object.assign === 'function') {
            return Object.assign.apply(Object, __spreadArray([target], sources, false));
        }
        else {
            var to = Object(target);
            for (var index = 0; index < sources.length; index++) {
                var nextSource = sources[index];
                if (nextSource !== null && nextSource !== undefined) {
                    for (var nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        }
    }
    function currentTimestamp() {
        return Math.round(new Date().getTime());
    }
    function isSafeInteger(number) {
        return typeof number == 'number' && Math.abs(number) <= MAX_SAFE_INTEGER_LIMIT;
    }
    function keyBy(arr, key) {
        if (!arr)
            return {};
        return keyByUtil(arr, function (item) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return item[key];
        });
    }
    function isNumber(value) {
        return typeof value === 'number';
    }
    function uuid() {
        return v4$2();
    }
    function getTimestamp() {
        return new Date().getTime();
    }
    /**
    * Validates a value is a valid TypeScript enum
    *
    * @export
    * @param {object} enumToCheck
    * @param {*} value
    * @returns {boolean}
    */
    // TODO[OASIS-6649]: Don't use any type
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    function isValidEnum(enumToCheck, value) {
        var found = false;
        var keys = Object.keys(enumToCheck);
        for (var index = 0; index < keys.length; index++) {
            if (value === enumToCheck[keys[index]]) {
                found = true;
                break;
            }
        }
        return found;
    }
    function groupBy(arr, grouperFn) {
        var grouper = {};
        arr.forEach(function (item) {
            var key = grouperFn(item);
            grouper[key] = grouper[key] || [];
            grouper[key].push(item);
        });
        return objectValues(grouper);
    }
    function objectValues(obj) {
        return Object.keys(obj).map(function (key) { return obj[key]; });
    }
    function objectEntries(obj) {
        return Object.keys(obj).map(function (key) { return [key, obj[key]]; });
    }
    function find(arr, cond) {
        var found;
        for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
            var item = arr_1[_i];
            if (cond(item)) {
                found = item;
                break;
            }
        }
        return found;
    }
    function keyByUtil(arr, keyByFn) {
        var map = {};
        arr.forEach(function (item) {
            var key = keyByFn(item);
            map[key] = item;
        });
        return map;
    }
    // TODO[OASIS-6649]: Don't use any type
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    function sprintf(format) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var i = 0;
        return format.replace(/%s/g, function () {
            var arg = args[i++];
            var type = typeof arg;
            if (type === 'function') {
                return arg();
            }
            else if (type === 'string') {
                return arg;
            }
            else {
                return String(arg);
            }
        });
    }
    var fns = {
        assign: assign,
        currentTimestamp: currentTimestamp,
        isSafeInteger: isSafeInteger,
        keyBy: keyBy,
        uuid: uuid,
        isNumber: isNumber,
        getTimestamp: getTimestamp,
        isValidEnum: isValidEnum,
        groupBy: groupBy,
        objectValues: objectValues,
        objectEntries: objectEntries,
        find: find,
        keyByUtil: keyByUtil,
        sprintf: sprintf,
    };

    /**
     * Copyright 2019, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["NOTSET"] = 0] = "NOTSET";
        LogLevel[LogLevel["DEBUG"] = 1] = "DEBUG";
        LogLevel[LogLevel["INFO"] = 2] = "INFO";
        LogLevel[LogLevel["WARNING"] = 3] = "WARNING";
        LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    })(LogLevel || (LogLevel = {}));

    var stringToLogLevel = {
        NOTSET: 0,
        DEBUG: 1,
        INFO: 2,
        WARNING: 3,
        ERROR: 4,
    };
    function coerceLogLevel(level) {
        if (typeof level !== 'string') {
            return level;
        }
        level = level.toUpperCase();
        if (level === 'WARN') {
            level = 'WARNING';
        }
        if (!stringToLogLevel[level]) {
            return level;
        }
        return stringToLogLevel[level];
    }
    var DefaultLogManager = /** @class */ (function () {
        function DefaultLogManager() {
            this.defaultLoggerFacade = new OptimizelyLogger();
            this.loggers = {};
        }
        DefaultLogManager.prototype.getLogger = function (name) {
            if (!name) {
                return this.defaultLoggerFacade;
            }
            if (!this.loggers[name]) {
                this.loggers[name] = new OptimizelyLogger({ messagePrefix: name });
            }
            return this.loggers[name];
        };
        return DefaultLogManager;
    }());
    var ConsoleLogHandler = /** @class */ (function () {
        /**
         * Creates an instance of ConsoleLogger.
         * @param {ConsoleLogHandlerConfig} config
         * @memberof ConsoleLogger
         */
        function ConsoleLogHandler(config) {
            if (config === void 0) { config = {}; }
            this.logLevel = LogLevel.NOTSET;
            if (config.logLevel !== undefined && isValidEnum(LogLevel, config.logLevel)) {
                this.setLogLevel(config.logLevel);
            }
            this.logToConsole = config.logToConsole !== undefined ? !!config.logToConsole : true;
            this.prefix = config.prefix !== undefined ? config.prefix : '[OPTIMIZELY]';
        }
        /**
         * @param {LogLevel} level
         * @param {string} message
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.log = function (level, message) {
            if (!this.shouldLog(level) || !this.logToConsole) {
                return;
            }
            var logMessage = "".concat(this.prefix, " - ").concat(this.getLogLevelName(level), " ").concat(this.getTime(), " ").concat(message);
            this.consoleLog(level, [logMessage]);
        };
        /**
         * @param {LogLevel} level
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.setLogLevel = function (level) {
            level = coerceLogLevel(level);
            if (!isValidEnum(LogLevel, level) || level === undefined) {
                this.logLevel = LogLevel.ERROR;
            }
            else {
                this.logLevel = level;
            }
        };
        /**
         * @returns {string}
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.getTime = function () {
            return new Date().toISOString();
        };
        /**
         * @private
         * @param {LogLevel} targetLogLevel
         * @returns {boolean}
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.shouldLog = function (targetLogLevel) {
            return targetLogLevel >= this.logLevel;
        };
        /**
         * @private
         * @param {LogLevel} logLevel
         * @returns {string}
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.getLogLevelName = function (logLevel) {
            switch (logLevel) {
                case LogLevel.DEBUG:
                    return 'DEBUG';
                case LogLevel.INFO:
                    return 'INFO ';
                case LogLevel.WARNING:
                    return 'WARN ';
                case LogLevel.ERROR:
                    return 'ERROR';
                default:
                    return 'NOTSET';
            }
        };
        /**
         * @private
         * @param {LogLevel} logLevel
         * @param {string[]} logArguments
         * @memberof ConsoleLogger
         */
        ConsoleLogHandler.prototype.consoleLog = function (logLevel, logArguments) {
            switch (logLevel) {
                case LogLevel.DEBUG:
                    console.log.apply(console, logArguments);
                    break;
                case LogLevel.INFO:
                    console.info.apply(console, logArguments);
                    break;
                case LogLevel.WARNING:
                    console.warn.apply(console, logArguments);
                    break;
                case LogLevel.ERROR:
                    console.error.apply(console, logArguments);
                    break;
                default:
                    console.log.apply(console, logArguments);
            }
        };
        return ConsoleLogHandler;
    }());
    var globalLogLevel = LogLevel.NOTSET;
    var globalLogHandler = null;
    var OptimizelyLogger = /** @class */ (function () {
        function OptimizelyLogger(opts) {
            if (opts === void 0) { opts = {}; }
            this.messagePrefix = '';
            if (opts.messagePrefix) {
                this.messagePrefix = opts.messagePrefix;
            }
        }
        /**
         * @param {(LogLevel | LogInputObject)} levelOrObj
         * @param {string} [message]
         * @memberof OptimizelyLogger
         */
        OptimizelyLogger.prototype.log = function (level, message) {
            var splat = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                splat[_i - 2] = arguments[_i];
            }
            this.internalLog(coerceLogLevel(level), {
                message: message,
                splat: splat,
            });
        };
        OptimizelyLogger.prototype.info = function (message) {
            var splat = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                splat[_i - 1] = arguments[_i];
            }
            this.namedLog(LogLevel.INFO, message, splat);
        };
        OptimizelyLogger.prototype.debug = function (message) {
            var splat = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                splat[_i - 1] = arguments[_i];
            }
            this.namedLog(LogLevel.DEBUG, message, splat);
        };
        OptimizelyLogger.prototype.warn = function (message) {
            var splat = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                splat[_i - 1] = arguments[_i];
            }
            this.namedLog(LogLevel.WARNING, message, splat);
        };
        OptimizelyLogger.prototype.error = function (message) {
            var splat = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                splat[_i - 1] = arguments[_i];
            }
            this.namedLog(LogLevel.ERROR, message, splat);
        };
        OptimizelyLogger.prototype.format = function (data) {
            return "".concat(this.messagePrefix ? this.messagePrefix + ': ' : '').concat(sprintf.apply(void 0, __spreadArray([data.message], data.splat, false)));
        };
        OptimizelyLogger.prototype.internalLog = function (level, data) {
            if (!globalLogHandler) {
                return;
            }
            if (level < globalLogLevel) {
                return;
            }
            globalLogHandler.log(level, this.format(data));
            if (data.error && data.error instanceof Error) {
                getErrorHandler().handleError(data.error);
            }
        };
        OptimizelyLogger.prototype.namedLog = function (level, message, splat) {
            var error;
            if (message instanceof Error) {
                error = message;
                message = error.message;
                this.internalLog(level, {
                    error: error,
                    message: message,
                    splat: splat,
                });
                return;
            }
            if (splat.length === 0) {
                this.internalLog(level, {
                    message: message,
                    splat: splat,
                });
                return;
            }
            var last = splat[splat.length - 1];
            if (last instanceof Error) {
                error = last;
                splat.splice(-1);
            }
            this.internalLog(level, { message: message, error: error, splat: splat });
        };
        return OptimizelyLogger;
    }());
    var globalLogManager = new DefaultLogManager();
    function getLogger(name) {
        return globalLogManager.getLogger(name);
    }
    function setLogHandler(logger) {
        globalLogHandler = logger;
    }
    function setLogLevel(level) {
        level = coerceLogLevel(level);
        if (!isValidEnum(LogLevel, level) || level === undefined) {
            globalLogLevel = LogLevel.ERROR;
        }
        else {
            globalLogLevel = level;
        }
    }
    var logHelper = {
        setLogLevel: setLogLevel,
        setLogHandler: setLogHandler
    };

    function areEventContextsEqual(eventA, eventB) {
        var contextA = eventA.context;
        var contextB = eventB.context;
        return (contextA.accountId === contextB.accountId &&
            contextA.projectId === contextB.projectId &&
            contextA.clientName === contextB.clientName &&
            contextA.clientVersion === contextB.clientVersion &&
            contextA.revision === contextB.revision &&
            contextA.anonymizeIP === contextB.anonymizeIP &&
            contextA.botFiltering === contextB.botFiltering);
    }

    /**
     * Copyright 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var logger = getLogger('EventProcessor');
    var Timer = /** @class */ (function () {
        function Timer(_a) {
            var timeout = _a.timeout, callback = _a.callback;
            this.timeout = Math.max(timeout, 0);
            this.callback = callback;
        }
        Timer.prototype.start = function () {
            this.timeoutId = setTimeout(this.callback, this.timeout);
        };
        Timer.prototype.refresh = function () {
            this.stop();
            this.start();
        };
        Timer.prototype.stop = function () {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
        };
        return Timer;
    }());
    var SingleEventQueue = /** @class */ (function () {
        function SingleEventQueue(_a) {
            var sink = _a.sink;
            this.sink = sink;
        }
        SingleEventQueue.prototype.start = function () {
            // no-op
        };
        SingleEventQueue.prototype.stop = function () {
            // no-op
            return Promise.resolve();
        };
        SingleEventQueue.prototype.enqueue = function (event) {
            this.sink([event]);
        };
        return SingleEventQueue;
    }());
    var DefaultEventQueue = /** @class */ (function () {
        function DefaultEventQueue(_a) {
            var flushInterval = _a.flushInterval, maxQueueSize = _a.maxQueueSize, sink = _a.sink, batchComparator = _a.batchComparator;
            this.buffer = [];
            this.maxQueueSize = Math.max(maxQueueSize, 1);
            this.sink = sink;
            this.batchComparator = batchComparator;
            this.timer = new Timer({
                callback: this.flush.bind(this),
                timeout: flushInterval,
            });
            this.started = false;
        }
        DefaultEventQueue.prototype.start = function () {
            this.started = true;
            // dont start the timer until the first event is enqueued
        };
        DefaultEventQueue.prototype.stop = function () {
            this.started = false;
            var result = this.sink(this.buffer);
            this.buffer = [];
            this.timer.stop();
            return result;
        };
        DefaultEventQueue.prototype.enqueue = function (event) {
            if (!this.started) {
                logger.warn('Queue is stopped, not accepting event');
                return;
            }
            // If new event cannot be included into the current batch, flush so it can
            // be in its own new batch.
            var bufferedEvent = this.buffer[0];
            if (bufferedEvent && !this.batchComparator(bufferedEvent, event)) {
                this.flush();
            }
            // start the timer when the first event is put in
            if (this.buffer.length === 0) {
                this.timer.refresh();
            }
            this.buffer.push(event);
            if (this.buffer.length >= this.maxQueueSize) {
                this.flush();
            }
        };
        DefaultEventQueue.prototype.flush = function () {
            this.sink(this.buffer);
            this.buffer = [];
            this.timer.stop();
        };
        return DefaultEventQueue;
    }());

    /****************************************************************************
     * Copyright 2016-2022, Optimizely, Inc. and contributors                   *
     *                                                                          *
     * Licensed under the Apache License, Version 2.0 (the "License");          *
     * you may not use this file except in compliance with the License.         *
     * You may obtain a copy of the License at                                  *
     *                                                                          *
     *    https://www.apache.org/licenses/LICENSE-2.0                            *
     *                                                                          *
     * Unless required by applicable law or agreed to in writing, software      *
     * distributed under the License is distributed on an "AS IS" BASIS,        *
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
     * See the License for the specific language governing permissions and      *
     * limitations under the License.                                           *
     ***************************************************************************/
    /**
     * Contains global enums used throughout the library
     */
    var LOG_LEVEL = {
        NOTSET: 0,
        DEBUG: 1,
        INFO: 2,
        WARNING: 3,
        ERROR: 4,
    };
    var ERROR_MESSAGES = {
        CONDITION_EVALUATOR_ERROR: '%s: Error evaluating audience condition of type %s: %s',
        DATAFILE_AND_SDK_KEY_MISSING: '%s: You must provide at least one of sdkKey or datafile. Cannot start Optimizely',
        EXPERIMENT_KEY_NOT_IN_DATAFILE: '%s: Experiment key %s is not in datafile.',
        FEATURE_NOT_IN_DATAFILE: '%s: Feature key %s is not in datafile.',
        IMPROPERLY_FORMATTED_EXPERIMENT: '%s: Experiment key %s is improperly formatted.',
        INVALID_ATTRIBUTES: '%s: Provided attributes are in an invalid format.',
        INVALID_BUCKETING_ID: '%s: Unable to generate hash for bucketing ID %s: %s',
        INVALID_DATAFILE: '%s: Datafile is invalid - property %s: %s',
        INVALID_DATAFILE_MALFORMED: '%s: Datafile is invalid because it is malformed.',
        INVALID_CONFIG: '%s: Provided Optimizely config is in an invalid format.',
        INVALID_JSON: '%s: JSON object is not valid.',
        INVALID_ERROR_HANDLER: '%s: Provided "errorHandler" is in an invalid format.',
        INVALID_EVENT_DISPATCHER: '%s: Provided "eventDispatcher" is in an invalid format.',
        INVALID_EVENT_TAGS: '%s: Provided event tags are in an invalid format.',
        INVALID_EXPERIMENT_KEY: '%s: Experiment key %s is not in datafile. It is either invalid, paused, or archived.',
        INVALID_EXPERIMENT_ID: '%s: Experiment ID %s is not in datafile.',
        INVALID_GROUP_ID: '%s: Group ID %s is not in datafile.',
        INVALID_LOGGER: '%s: Provided "logger" is in an invalid format.',
        INVALID_ROLLOUT_ID: '%s: Invalid rollout ID %s attached to feature %s',
        INVALID_USER_ID: '%s: Provided user ID is in an invalid format.',
        INVALID_USER_PROFILE_SERVICE: '%s: Provided user profile service instance is in an invalid format: %s.',
        NO_DATAFILE_SPECIFIED: '%s: No datafile specified. Cannot start optimizely.',
        NO_JSON_PROVIDED: '%s: No JSON object to validate against schema.',
        NO_VARIATION_FOR_EXPERIMENT_KEY: '%s: No variation key %s defined in datafile for experiment %s.',
        UNDEFINED_ATTRIBUTE: '%s: Provided attribute: %s has an undefined value.',
        UNRECOGNIZED_ATTRIBUTE: '%s: Unrecognized attribute %s provided. Pruning before sending event to Optimizely.',
        UNABLE_TO_CAST_VALUE: '%s: Unable to cast value %s to type %s, returning null.',
        USER_NOT_IN_FORCED_VARIATION: '%s: User %s is not in the forced variation map. Cannot remove their forced variation.',
        USER_PROFILE_LOOKUP_ERROR: '%s: Error while looking up user profile for user ID "%s": %s.',
        USER_PROFILE_SAVE_ERROR: '%s: Error while saving user profile for user ID "%s": %s.',
        VARIABLE_KEY_NOT_IN_DATAFILE: '%s: Variable with key "%s" associated with feature with key "%s" is not in datafile.',
        VARIATION_ID_NOT_IN_DATAFILE: '%s: No variation ID %s defined in datafile for experiment %s.',
        VARIATION_ID_NOT_IN_DATAFILE_NO_EXPERIMENT: '%s: Variation ID %s is not in the datafile.',
        INVALID_INPUT_FORMAT: '%s: Provided %s is in an invalid format.',
        INVALID_DATAFILE_VERSION: '%s: This version of the JavaScript SDK does not support the given datafile version: %s',
        INVALID_VARIATION_KEY: '%s: Provided variation key is in an invalid format.',
    };
    var LOG_MESSAGES = {
        ACTIVATE_USER: '%s: Activating user %s in experiment %s.',
        DISPATCH_CONVERSION_EVENT: '%s: Dispatching conversion event to URL %s with params %s.',
        DISPATCH_IMPRESSION_EVENT: '%s: Dispatching impression event to URL %s with params %s.',
        DEPRECATED_EVENT_VALUE: '%s: Event value is deprecated in %s call.',
        EVENT_KEY_NOT_FOUND: '%s: Event key %s is not in datafile.',
        EXPERIMENT_NOT_RUNNING: '%s: Experiment %s is not running.',
        FEATURE_ENABLED_FOR_USER: '%s: Feature %s is enabled for user %s.',
        FEATURE_NOT_ENABLED_FOR_USER: '%s: Feature %s is not enabled for user %s.',
        FEATURE_HAS_NO_EXPERIMENTS: '%s: Feature %s is not attached to any experiments.',
        FAILED_TO_PARSE_VALUE: '%s: Failed to parse event value "%s" from event tags.',
        FAILED_TO_PARSE_REVENUE: '%s: Failed to parse revenue value "%s" from event tags.',
        FORCED_BUCKETING_FAILED: '%s: Variation key %s is not in datafile. Not activating user %s.',
        INVALID_OBJECT: '%s: Optimizely object is not valid. Failing %s.',
        INVALID_CLIENT_ENGINE: '%s: Invalid client engine passed: %s. Defaulting to node-sdk.',
        INVALID_DEFAULT_DECIDE_OPTIONS: '%s: Provided default decide options is not an array.',
        INVALID_DECIDE_OPTIONS: '%s: Provided decide options is not an array. Using default decide options.',
        INVALID_VARIATION_ID: '%s: Bucketed into an invalid variation ID. Returning null.',
        NOTIFICATION_LISTENER_EXCEPTION: '%s: Notification listener for (%s) threw exception: %s',
        NO_ROLLOUT_EXISTS: '%s: There is no rollout of feature %s.',
        NOT_ACTIVATING_USER: '%s: Not activating user %s for experiment %s.',
        NOT_TRACKING_USER: '%s: Not tracking user %s.',
        PARSED_REVENUE_VALUE: '%s: Parsed revenue value "%s" from event tags.',
        PARSED_NUMERIC_VALUE: '%s: Parsed event value "%s" from event tags.',
        RETURNING_STORED_VARIATION: '%s: Returning previously activated variation "%s" of experiment "%s" for user "%s" from user profile.',
        ROLLOUT_HAS_NO_EXPERIMENTS: '%s: Rollout of feature %s has no experiments',
        SAVED_VARIATION: '%s: Saved variation "%s" of experiment "%s" for user "%s".',
        SAVED_VARIATION_NOT_FOUND: '%s: User %s was previously bucketed into variation with ID %s for experiment %s, but no matching variation was found.',
        SHOULD_NOT_DISPATCH_ACTIVATE: '%s: Experiment %s is not in "Running" state. Not activating user.',
        SKIPPING_JSON_VALIDATION: '%s: Skipping JSON schema validation.',
        TRACK_EVENT: '%s: Tracking event %s for user %s.',
        UNRECOGNIZED_DECIDE_OPTION: '%s: Unrecognized decide option %s provided.',
        USER_ASSIGNED_TO_EXPERIMENT_BUCKET: '%s: Assigned bucket %s to user with bucketing ID %s.',
        USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP: '%s: User %s is in experiment %s of group %s.',
        USER_BUCKETED_INTO_TARGETING_RULE: '%s: User %s bucketed into targeting rule %s.',
        USER_IN_FEATURE_EXPERIMENT: '%s: User %s is in variation %s of experiment %s on the feature %s.',
        USER_IN_ROLLOUT: '%s: User %s is in rollout of feature %s.',
        USER_NOT_BUCKETED_INTO_EVERYONE_TARGETING_RULE: '%s: User %s not bucketed into everyone targeting rule due to traffic allocation.',
        USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP: '%s: User %s is not in experiment %s of group %s.',
        USER_NOT_BUCKETED_INTO_ANY_EXPERIMENT_IN_GROUP: '%s: User %s is not in any experiment of group %s.',
        USER_NOT_BUCKETED_INTO_TARGETING_RULE: '%s User %s not bucketed into targeting rule %s due to traffic allocation. Trying everyone rule.',
        USER_NOT_IN_FEATURE_EXPERIMENT: '%s: User %s is not in any experiment on the feature %s.',
        USER_NOT_IN_ROLLOUT: '%s: User %s is not in rollout of feature %s.',
        USER_FORCED_IN_VARIATION: '%s: User %s is forced in variation %s.',
        USER_MAPPED_TO_FORCED_VARIATION: '%s: Set variation %s for experiment %s and user %s in the forced variation map.',
        USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE: '%s: User %s does not meet conditions for targeting rule %s.',
        USER_MEETS_CONDITIONS_FOR_TARGETING_RULE: '%s: User %s meets conditions for targeting rule %s.',
        USER_HAS_VARIATION: '%s: User %s is in variation %s of experiment %s.',
        USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED: 'Variation (%s) is mapped to flag (%s), rule (%s) and user (%s) in the forced decision map.',
        USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED: 'Variation (%s) is mapped to flag (%s) and user (%s) in the forced decision map.',
        USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID: 'Invalid variation is mapped to flag (%s), rule (%s) and user (%s) in the forced decision map.',
        USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID: 'Invalid variation is mapped to flag (%s) and user (%s) in the forced decision map.',
        USER_HAS_FORCED_VARIATION: '%s: Variation %s is mapped to experiment %s and user %s in the forced variation map.',
        USER_HAS_NO_VARIATION: '%s: User %s is in no variation of experiment %s.',
        USER_HAS_NO_FORCED_VARIATION: '%s: User %s is not in the forced variation map.',
        USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT: '%s: No experiment %s mapped to user %s in the forced variation map.',
        USER_NOT_IN_ANY_EXPERIMENT: '%s: User %s is not in any experiment of group %s.',
        USER_NOT_IN_EXPERIMENT: '%s: User %s does not meet conditions to be in experiment %s.',
        USER_RECEIVED_DEFAULT_VARIABLE_VALUE: '%s: User "%s" is not in any variation or rollout rule. Returning default value for variable "%s" of feature flag "%s".',
        FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE: '%s: Feature "%s" is not enabled for user %s. Returning the default variable value "%s".',
        VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE: '%s: Variable "%s" is not used in variation "%s". Returning default value.',
        USER_RECEIVED_VARIABLE_VALUE: '%s: Got variable value "%s" for variable "%s" of feature flag "%s"',
        VALID_DATAFILE: '%s: Datafile is valid.',
        VALID_USER_PROFILE_SERVICE: '%s: Valid user profile service provided.',
        VARIATION_REMOVED_FOR_USER: '%s: Variation mapped to experiment %s has been removed for user %s.',
        VARIABLE_REQUESTED_WITH_WRONG_TYPE: '%s: Requested variable type "%s", but variable is of type "%s". Use correct API to retrieve value. Returning None.',
        VALID_BUCKETING_ID: '%s: BucketingId is valid: "%s"',
        BUCKETING_ID_NOT_STRING: '%s: BucketingID attribute is not a string. Defaulted to userId',
        EVALUATING_AUDIENCE: '%s: Starting to evaluate audience "%s" with conditions: %s.',
        EVALUATING_AUDIENCES_COMBINED: '%s: Evaluating audiences for %s "%s": %s.',
        AUDIENCE_EVALUATION_RESULT: '%s: Audience "%s" evaluated to %s.',
        AUDIENCE_EVALUATION_RESULT_COMBINED: '%s: Audiences for %s %s collectively evaluated to %s.',
        MISSING_ATTRIBUTE_VALUE: '%s: Audience condition %s evaluated to UNKNOWN because no value was passed for user attribute "%s".',
        UNEXPECTED_CONDITION_VALUE: '%s: Audience condition %s evaluated to UNKNOWN because the condition value is not supported.',
        UNEXPECTED_TYPE: '%s: Audience condition %s evaluated to UNKNOWN because a value of type "%s" was passed for user attribute "%s".',
        UNEXPECTED_TYPE_NULL: '%s: Audience condition %s evaluated to UNKNOWN because a null value was passed for user attribute "%s".',
        UNKNOWN_CONDITION_TYPE: '%s: Audience condition %s has an unknown condition type. You may need to upgrade to a newer release of the Optimizely SDK.',
        UNKNOWN_MATCH_TYPE: '%s: Audience condition %s uses an unknown match type. You may need to upgrade to a newer release of the Optimizely SDK.',
        UPDATED_OPTIMIZELY_CONFIG: '%s: Updated Optimizely config to revision %s (project id %s)',
        OUT_OF_BOUNDS: '%s: Audience condition %s evaluated to UNKNOWN because the number value for user attribute "%s" is not in the range [-2^53, +2^53].',
        UNABLE_TO_ATTACH_UNLOAD: '%s: unable to bind optimizely.close() to page unload event: "%s"',
    };
    var CONTROL_ATTRIBUTES = {
        BOT_FILTERING: '$opt_bot_filtering',
        BUCKETING_ID: '$opt_bucketing_id',
        STICKY_BUCKETING_KEY: '$opt_experiment_bucket_map',
        USER_AGENT: '$opt_user_agent',
        FORCED_DECISION_NULL_RULE_KEY: '$opt_null_rule_key'
    };
    var JAVASCRIPT_CLIENT_ENGINE = 'javascript-sdk';
    var NODE_CLIENT_ENGINE = 'node-sdk';
    var NODE_CLIENT_VERSION = '4.9.2';
    var DECISION_NOTIFICATION_TYPES = {
        AB_TEST: 'ab-test',
        FEATURE: 'feature',
        FEATURE_TEST: 'feature-test',
        FEATURE_VARIABLE: 'feature-variable',
        ALL_FEATURE_VARIABLES: 'all-feature-variables',
        FLAG: 'flag',
    };
    /*
     * Represents the source of a decision for feature management. When a feature
     * is accessed through isFeatureEnabled or getVariableValue APIs, the decision
     * source is used to decide whether to dispatch an impression event to
     * Optimizely.
     */
    var DECISION_SOURCES = {
        FEATURE_TEST: 'feature-test',
        ROLLOUT: 'rollout',
        EXPERIMENT: 'experiment',
    };
    var AUDIENCE_EVALUATION_TYPES = {
        RULE: 'rule',
        EXPERIMENT: 'experiment',
    };
    /*
     * Possible types of variables attached to features
     */
    var FEATURE_VARIABLE_TYPES = {
        BOOLEAN: 'boolean',
        DOUBLE: 'double',
        INTEGER: 'integer',
        STRING: 'string',
        JSON: 'json',
    };
    /*
     * Supported datafile versions
     */
    var DATAFILE_VERSIONS = {
        V2: '2',
        V3: '3',
        V4: '4',
    };
    var DECISION_MESSAGES = {
        SDK_NOT_READY: 'Optimizely SDK not configured properly yet.',
        FLAG_KEY_INVALID: 'No flag was found for key "%s".',
        VARIABLE_VALUE_INVALID: 'Variable value for key "%s" is invalid or wrong type.',
    };
    /*
    * Notification types for use with NotificationCenter
    * Format is EVENT: <list of parameters to callback>
    *
    * SDK consumers can use these to register callbacks with the notification center.
    *
    *  @deprecated since 3.1.0
    *  ACTIVATE: An impression event will be sent to Optimizely
    *  Callbacks will receive an object argument with the following properties:
    *    - experiment {Object}
    *    - userId {string}
    *    - attributes {Object|undefined}
    *    - variation {Object}
    *    - logEvent {Object}
    *
    *  DECISION: A decision is made in the system. i.e. user activation,
    *  feature access or feature-variable value retrieval
    *  Callbacks will receive an object argument with the following properties:
    *    - type {string}
    *    - userId {string}
    *    - attributes {Object|undefined}
    *    - decisionInfo {Object|undefined}
    *
    *  LOG_EVENT: A batch of events, which could contain impressions and/or conversions,
    *  will be sent to Optimizely
    *  Callbacks will receive an object argument with the following properties:
    *    - url {string}
    *    - httpVerb {string}
    *    - params {Object}
    *
    *  OPTIMIZELY_CONFIG_UPDATE: This Optimizely instance has been updated with a new
    *  config
    *
    *  TRACK: A conversion event will be sent to Optimizely
    *  Callbacks will receive the an object argument with the following properties:
    *    - eventKey {string}
    *    - userId {string}
    *    - attributes {Object|undefined}
    *    - eventTags {Object|undefined}
    *    - logEvent {Object}
    *
    */
    var NOTIFICATION_TYPES;
    (function (NOTIFICATION_TYPES) {
        NOTIFICATION_TYPES["ACTIVATE"] = "ACTIVATE:experiment, user_id,attributes, variation, event";
        NOTIFICATION_TYPES["DECISION"] = "DECISION:type, userId, attributes, decisionInfo";
        NOTIFICATION_TYPES["LOG_EVENT"] = "LOG_EVENT:logEvent";
        NOTIFICATION_TYPES["OPTIMIZELY_CONFIG_UPDATE"] = "OPTIMIZELY_CONFIG_UPDATE";
        NOTIFICATION_TYPES["TRACK"] = "TRACK:event_key, user_id, attributes, event_tags, event";
    })(NOTIFICATION_TYPES || (NOTIFICATION_TYPES = {}));
    /**
     * Valid types of Javascript contexts in which this code is executing
     */
    var EXECUTION_CONTEXT_TYPE;
    (function (EXECUTION_CONTEXT_TYPE) {
        EXECUTION_CONTEXT_TYPE[EXECUTION_CONTEXT_TYPE["NOT_DEFINED"] = 0] = "NOT_DEFINED";
        EXECUTION_CONTEXT_TYPE[EXECUTION_CONTEXT_TYPE["BROWSER"] = 1] = "BROWSER";
        EXECUTION_CONTEXT_TYPE[EXECUTION_CONTEXT_TYPE["NODE"] = 2] = "NODE";
    })(EXECUTION_CONTEXT_TYPE || (EXECUTION_CONTEXT_TYPE = {}));
    /**
     * ODP User Key
     */
    var ODP_USER_KEY;
    (function (ODP_USER_KEY) {
        ODP_USER_KEY["VUID"] = "vuid";
        ODP_USER_KEY["FS_USER_ID"] = "fs_user_id";
    })(ODP_USER_KEY || (ODP_USER_KEY = {}));
    /**
     * Possible states of ODP integration
     */
    var ODP_CONFIG_STATE;
    (function (ODP_CONFIG_STATE) {
        ODP_CONFIG_STATE[ODP_CONFIG_STATE["UNDETERMINED"] = 0] = "UNDETERMINED";
        ODP_CONFIG_STATE[ODP_CONFIG_STATE["INTEGRATED"] = 1] = "INTEGRATED";
        ODP_CONFIG_STATE[ODP_CONFIG_STATE["NOT_INTEGRATED"] = 2] = "NOT_INTEGRATED";
    })(ODP_CONFIG_STATE || (ODP_CONFIG_STATE = {}));

    var DEFAULT_FLUSH_INTERVAL = 30000; // Unit is ms - default flush interval is 30s
    var DEFAULT_BATCH_SIZE = 10;
    var logger$1 = getLogger('EventProcessor');
    function validateAndGetFlushInterval(flushInterval) {
        if (flushInterval <= 0) {
            logger$1.warn("Invalid flushInterval ".concat(flushInterval, ", defaulting to ").concat(DEFAULT_FLUSH_INTERVAL));
            flushInterval = DEFAULT_FLUSH_INTERVAL;
        }
        return flushInterval;
    }
    function validateAndGetBatchSize(batchSize) {
        batchSize = Math.floor(batchSize);
        if (batchSize < 1) {
            logger$1.warn("Invalid batchSize ".concat(batchSize, ", defaulting to ").concat(DEFAULT_BATCH_SIZE));
            batchSize = DEFAULT_BATCH_SIZE;
        }
        batchSize = Math.max(1, batchSize);
        return batchSize;
    }
    function getQueue(batchSize, flushInterval, sink, batchComparator) {
        var queue;
        if (batchSize > 1) {
            queue = new DefaultEventQueue({
                flushInterval: flushInterval,
                maxQueueSize: batchSize,
                sink: sink,
                batchComparator: batchComparator,
            });
        }
        else {
            queue = new SingleEventQueue({ sink: sink });
        }
        return queue;
    }
    function sendEventNotification(notificationSender, event) {
        if (notificationSender) {
            notificationSender.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, event);
        }
    }

    /**
     * Copyright 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var logger$2 = getLogger('EventProcessor');
    var LocalStorageStore = /** @class */ (function () {
        function LocalStorageStore(_a) {
            var key = _a.key, _b = _a.maxValues, maxValues = _b === void 0 ? 1000 : _b;
            this.LS_KEY = key;
            this.maxValues = maxValues;
        }
        LocalStorageStore.prototype.get = function (key) {
            return this.getMap()[key] || null;
        };
        LocalStorageStore.prototype.set = function (key, value) {
            var map = this.getMap();
            map[key] = value;
            this.replace(map);
        };
        LocalStorageStore.prototype.remove = function (key) {
            var map = this.getMap();
            delete map[key];
            this.replace(map);
        };
        LocalStorageStore.prototype.values = function () {
            return objectValues(this.getMap());
        };
        LocalStorageStore.prototype.clear = function () {
            this.replace({});
        };
        LocalStorageStore.prototype.replace = function (map) {
            try {
                // This is a temporary fix to support React Native which does not have localStorage.
                window.localStorage && localStorage.setItem(this.LS_KEY, JSON.stringify(map));
                this.clean();
            }
            catch (e) {
                logger$2.error(String(e));
            }
        };
        LocalStorageStore.prototype.clean = function () {
            var map = this.getMap();
            var keys = Object.keys(map);
            var toRemove = keys.length - this.maxValues;
            if (toRemove < 1) {
                return;
            }
            var entries = keys.map(function (key) { return ({
                key: key,
                value: map[key]
            }); });
            entries.sort(function (a, b) { return a.value.timestamp - b.value.timestamp; });
            for (var i = 0; i < toRemove; i++) {
                delete map[entries[i].key];
            }
            this.replace(map);
        };
        LocalStorageStore.prototype.getMap = function () {
            try {
                // This is a temporary fix to support React Native which does not have localStorage.
                var data = window.localStorage && localStorage.getItem(this.LS_KEY);
                if (data) {
                    return JSON.parse(data) || {};
                }
            }
            catch (e) {
                logger$2.error(String(e));
            }
            return {};
        };
        return LocalStorageStore;
    }());

    var logger$3 = getLogger('EventProcessor');
    var PendingEventsDispatcher = /** @class */ (function () {
        function PendingEventsDispatcher(_a) {
            var eventDispatcher = _a.eventDispatcher, store = _a.store;
            this.dispatcher = eventDispatcher;
            this.store = store;
        }
        PendingEventsDispatcher.prototype.dispatchEvent = function (request, callback) {
            this.send({
                uuid: uuid(),
                timestamp: getTimestamp(),
                request: request,
            }, callback);
        };
        PendingEventsDispatcher.prototype.sendPendingEvents = function () {
            var _this = this;
            var pendingEvents = this.store.values();
            logger$3.debug('Sending %s pending events from previous page', pendingEvents.length);
            pendingEvents.forEach(function (item) {
                try {
                    _this.send(item, function () { });
                }
                catch (e) {
                    logger$3.debug(String(e));
                }
            });
        };
        PendingEventsDispatcher.prototype.send = function (entry, callback) {
            var _this = this;
            this.store.set(entry.uuid, entry);
            this.dispatcher.dispatchEvent(entry.request, function (response) {
                _this.store.remove(entry.uuid);
                callback(response);
            });
        };
        return PendingEventsDispatcher;
    }());
    var LocalStoragePendingEventsDispatcher = /** @class */ (function (_super) {
        __extends(LocalStoragePendingEventsDispatcher, _super);
        function LocalStoragePendingEventsDispatcher(_a) {
            var eventDispatcher = _a.eventDispatcher;
            return _super.call(this, {
                eventDispatcher: eventDispatcher,
                store: new LocalStorageStore({
                    // TODO make this configurable
                    maxValues: 100,
                    key: 'fs_optly_pending_events',
                }),
            }) || this;
        }
        return LocalStoragePendingEventsDispatcher;
    }(PendingEventsDispatcher));

    var ACTIVATE_EVENT_KEY = 'campaign_activated';
    var CUSTOM_ATTRIBUTE_FEATURE_TYPE = 'custom';
    var BOT_FILTERING_KEY = '$opt_bot_filtering';
    /**
     * Given an array of batchable Decision or ConversionEvent events it returns
     * a single EventV1 with proper batching
     *
     * @param {ProcessableEvent[]} events
     * @returns {EventV1}
     */
    function makeBatchedEventV1(events) {
        var visitors = [];
        var data = events[0];
        events.forEach(function (event) {
            if (event.type === 'conversion' || event.type === 'impression') {
                var visitor = makeVisitor(event);
                if (event.type === 'impression') {
                    visitor.snapshots.push(makeDecisionSnapshot(event));
                }
                else if (event.type === 'conversion') {
                    visitor.snapshots.push(makeConversionSnapshot(event));
                }
                visitors.push(visitor);
            }
        });
        return {
            client_name: data.context.clientName,
            client_version: data.context.clientVersion,
            account_id: data.context.accountId,
            project_id: data.context.projectId,
            revision: data.context.revision,
            anonymize_ip: data.context.anonymizeIP,
            enrich_decisions: true,
            visitors: visitors,
        };
    }
    function makeConversionSnapshot(conversion) {
        var tags = __assign({}, conversion.tags);
        delete tags['revenue'];
        delete tags['value'];
        var event = {
            entity_id: conversion.event.id,
            key: conversion.event.key,
            timestamp: conversion.timestamp,
            uuid: conversion.uuid,
        };
        if (conversion.tags) {
            event.tags = conversion.tags;
        }
        if (conversion.value != null) {
            event.value = conversion.value;
        }
        if (conversion.revenue != null) {
            event.revenue = conversion.revenue;
        }
        return {
            events: [event],
        };
    }
    function makeDecisionSnapshot(event) {
        var _a, _b;
        var layer = event.layer, experiment = event.experiment, variation = event.variation, ruleKey = event.ruleKey, flagKey = event.flagKey, ruleType = event.ruleType, enabled = event.enabled;
        var layerId = layer ? layer.id : null;
        var experimentId = (_a = experiment === null || experiment === void 0 ? void 0 : experiment.id) !== null && _a !== void 0 ? _a : '';
        var variationId = (_b = variation === null || variation === void 0 ? void 0 : variation.id) !== null && _b !== void 0 ? _b : '';
        var variationKey = variation ? variation.key : '';
        return {
            decisions: [
                {
                    campaign_id: layerId,
                    experiment_id: experimentId,
                    variation_id: variationId,
                    metadata: {
                        flag_key: flagKey,
                        rule_key: ruleKey,
                        rule_type: ruleType,
                        variation_key: variationKey,
                        enabled: enabled,
                    },
                },
            ],
            events: [
                {
                    entity_id: layerId,
                    timestamp: event.timestamp,
                    key: ACTIVATE_EVENT_KEY,
                    uuid: event.uuid,
                },
            ],
        };
    }
    function makeVisitor(data) {
        var visitor = {
            snapshots: [],
            visitor_id: data.user.id,
            attributes: [],
        };
        var type = 'custom';
        data.user.attributes.forEach(function (attr) {
            visitor.attributes.push({
                entity_id: attr.entityId,
                key: attr.key,
                type: type,
                value: attr.value,
            });
        });
        if (typeof data.context.botFiltering === 'boolean') {
            visitor.attributes.push({
                entity_id: BOT_FILTERING_KEY,
                key: BOT_FILTERING_KEY,
                type: CUSTOM_ATTRIBUTE_FEATURE_TYPE,
                value: data.context.botFiltering,
            });
        }
        return visitor;
    }
    function formatEvents(events) {
        return {
            url: 'https://logx.optimizely.com/v1/events',
            httpVerb: 'POST',
            params: makeBatchedEventV1(events),
        };
    }

    /**
     * Copyright 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * RequestTracker keeps track of in-flight requests for EventProcessor using
     * an internal counter. It exposes methods for adding a new request to be
     * tracked, and getting a Promise representing the completion of currently
     * tracked requests.
     */
    var RequestTracker = /** @class */ (function () {
        function RequestTracker() {
            this.reqsInFlightCount = 0;
            this.reqsCompleteResolvers = [];
        }
        /**
         * Track the argument request (represented by a Promise). reqPromise will feed
         * into the state of Promises returned by onRequestsComplete.
         * @param {Promise<void>} reqPromise
         */
        RequestTracker.prototype.trackRequest = function (reqPromise) {
            var _this = this;
            this.reqsInFlightCount++;
            var onReqComplete = function () {
                _this.reqsInFlightCount--;
                if (_this.reqsInFlightCount === 0) {
                    _this.reqsCompleteResolvers.forEach(function (resolver) { return resolver(); });
                    _this.reqsCompleteResolvers = [];
                }
            };
            reqPromise.then(onReqComplete, onReqComplete);
        };
        /**
         * Return a Promise that fulfills after all currently-tracked request promises
         * are resolved.
         * @return {Promise<void>}
         */
        RequestTracker.prototype.onRequestsComplete = function () {
            var _this = this;
            return new Promise(function (resolve) {
                if (_this.reqsInFlightCount === 0) {
                    resolve();
                }
                else {
                    _this.reqsCompleteResolvers.push(resolve);
                }
            });
        };
        return RequestTracker;
    }());

    var logger$4 = getLogger('LogTierV1EventProcessor');
    var LogTierV1EventProcessor = /** @class */ (function () {
        function LogTierV1EventProcessor(_a) {
            var dispatcher = _a.dispatcher, _b = _a.flushInterval, flushInterval = _b === void 0 ? DEFAULT_FLUSH_INTERVAL : _b, _c = _a.batchSize, batchSize = _c === void 0 ? DEFAULT_BATCH_SIZE : _c, notificationCenter = _a.notificationCenter;
            this.dispatcher = dispatcher;
            this.notificationCenter = notificationCenter;
            this.requestTracker = new RequestTracker();
            flushInterval = validateAndGetFlushInterval(flushInterval);
            batchSize = validateAndGetBatchSize(batchSize);
            this.queue = getQueue(batchSize, flushInterval, this.drainQueue.bind(this), areEventContextsEqual);
        }
        LogTierV1EventProcessor.prototype.drainQueue = function (buffer) {
            var _this = this;
            var reqPromise = new Promise(function (resolve) {
                logger$4.debug('draining queue with %s events', buffer.length);
                if (buffer.length === 0) {
                    resolve();
                    return;
                }
                var formattedEvent = formatEvents(buffer);
                _this.dispatcher.dispatchEvent(formattedEvent, function () {
                    resolve();
                });
                sendEventNotification(_this.notificationCenter, formattedEvent);
            });
            this.requestTracker.trackRequest(reqPromise);
            return reqPromise;
        };
        LogTierV1EventProcessor.prototype.process = function (event) {
            this.queue.enqueue(event);
        };
        // TODO[OASIS-6649]: Don't use any type
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        LogTierV1EventProcessor.prototype.stop = function () {
            // swallow - an error stopping this queue shouldn't prevent this from stopping
            try {
                this.queue.stop();
                return this.requestTracker.onRequestsComplete();
            }
            catch (e) {
                logger$4.error('Error stopping EventProcessor: "%s"', Object(e).message, String(e));
            }
            return Promise.resolve();
        };
        LogTierV1EventProcessor.prototype.start = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    this.queue.start();
                    return [2 /*return*/];
                });
            });
        };
        return LogTierV1EventProcessor;
    }());

    /**
     * Copyright 2016, 2018-2020, 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var MODULE_NAME = 'CONFIG_VALIDATOR';
    var SUPPORTED_VERSIONS = [DATAFILE_VERSIONS.V2, DATAFILE_VERSIONS.V3, DATAFILE_VERSIONS.V4];
    /**
     * Validates the given config options
     * @param  {unknown} config
     * @param  {object}  config.errorHandler
     * @param  {object}  config.eventDispatcher
     * @param  {object}  config.logger
     * @return {boolean} true if the config options are valid
     * @throws If any of the config options are not valid
     */
    var validate = function (config) {
        if (typeof config === 'object' && config !== null) {
            var configObj = config;
            var errorHandler = configObj['errorHandler'];
            var eventDispatcher = configObj['eventDispatcher'];
            var logger = configObj['logger'];
            if (errorHandler && typeof errorHandler['handleError'] !== 'function') {
                throw new Error(sprintf(ERROR_MESSAGES.INVALID_ERROR_HANDLER, MODULE_NAME));
            }
            if (eventDispatcher && typeof eventDispatcher['dispatchEvent'] !== 'function') {
                throw new Error(sprintf(ERROR_MESSAGES.INVALID_EVENT_DISPATCHER, MODULE_NAME));
            }
            if (logger && typeof logger['log'] !== 'function') {
                throw new Error(sprintf(ERROR_MESSAGES.INVALID_LOGGER, MODULE_NAME));
            }
            return true;
        }
        throw new Error(sprintf(ERROR_MESSAGES.INVALID_CONFIG, MODULE_NAME));
    };
    /**
     * Validates the datafile
     * @param {Object|string}  datafile
     * @return {Object} The datafile object if the datafile is valid
     * @throws If the datafile is not valid for any of the following reasons:
     - The datafile string is undefined
     - The datafile string cannot be parsed as a JSON object
     - The datafile version is not supported
     */
    // eslint-disable-next-line
    var validateDatafile = function (datafile) {
        if (!datafile) {
            throw new Error(sprintf(ERROR_MESSAGES.NO_DATAFILE_SPECIFIED, MODULE_NAME));
        }
        if (typeof datafile === 'string') {
            // Attempt to parse the datafile string
            try {
                datafile = JSON.parse(datafile);
            }
            catch (ex) {
                throw new Error(sprintf(ERROR_MESSAGES.INVALID_DATAFILE_MALFORMED, MODULE_NAME));
            }
        }
        if (typeof datafile === 'object' && !Array.isArray(datafile) && datafile !== null) {
            if (SUPPORTED_VERSIONS.indexOf(datafile['version']) === -1) {
                throw new Error(sprintf(ERROR_MESSAGES.INVALID_DATAFILE_VERSION, MODULE_NAME, datafile['version']));
            }
        }
        return datafile;
    };
    /**
     * Provides utility methods for validating that the configuration options are valid
     */
    var configValidator = {
        validate: validate,
        validateDatafile: validateDatafile,
    };

    /**
     * Copyright 2016-2017, 2020-2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var POST_METHOD = 'POST';
    var GET_METHOD = 'GET';
    var READYSTATE_COMPLETE = 4;
    /**
     * Sample event dispatcher implementation for tracking impression and conversions
     * Users of the SDK can provide their own implementation
     * @param  {Event}    eventObj
     * @param  {Function} callback
     */
    var dispatchEvent = function (eventObj, callback) {
        var params = eventObj.params;
        var url = eventObj.url;
        var req;
        if (eventObj.httpVerb === POST_METHOD) {
            req = new XMLHttpRequest();
            req.open(POST_METHOD, url, true);
            req.setRequestHeader('Content-Type', 'application/json');
            req.onreadystatechange = function () {
                if (req.readyState === READYSTATE_COMPLETE && callback && typeof callback === 'function') {
                    try {
                        callback({ statusCode: req.status });
                    }
                    catch (e) {
                        // TODO: Log this somehow (consider adding a logger to the EventDispatcher interface)
                    }
                }
            };
            req.send(JSON.stringify(params));
        }
        else {
            // add param for cors headers to be sent by the log endpoint
            url += '?wxhr=true';
            if (params) {
                url += '&' + toQueryString(params);
            }
            req = new XMLHttpRequest();
            req.open(GET_METHOD, url, true);
            req.onreadystatechange = function () {
                if (req.readyState === READYSTATE_COMPLETE && callback && typeof callback === 'function') {
                    try {
                        callback({ statusCode: req.status });
                    }
                    catch (e) {
                        // TODO: Log this somehow (consider adding a logger to the EventDispatcher interface)
                    }
                }
            };
            req.send();
        }
    };
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    var toQueryString = function (obj) {
        return Object.keys(obj)
            .map(function (k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
        })
            .join('&');
    };
    var defaultEventDispatcher = {
        dispatchEvent: dispatchEvent,
    };

    /**
     * Copyright 2016-2017, 2020-2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** @class */ ((function () {
        function NoOpLogger() {
        }
        NoOpLogger.prototype.log = function () { };
        return NoOpLogger;
    })());
    function createLogger(opts) {
        return new ConsoleLogHandler(opts);
    }

    var VariableType;
    (function (VariableType) {
        VariableType["BOOLEAN"] = "boolean";
        VariableType["DOUBLE"] = "double";
        VariableType["INTEGER"] = "integer";
        VariableType["STRING"] = "string";
        VariableType["JSON"] = "json";
    })(VariableType || (VariableType = {}));
    //TODO: Move OptimizelyDecideOption to @optimizely/optimizely-sdk/lib/utils/enums
    var OptimizelyDecideOption;
    (function (OptimizelyDecideOption) {
        OptimizelyDecideOption["DISABLE_DECISION_EVENT"] = "DISABLE_DECISION_EVENT";
        OptimizelyDecideOption["ENABLED_FLAGS_ONLY"] = "ENABLED_FLAGS_ONLY";
        OptimizelyDecideOption["IGNORE_USER_PROFILE_SERVICE"] = "IGNORE_USER_PROFILE_SERVICE";
        OptimizelyDecideOption["INCLUDE_REASONS"] = "INCLUDE_REASONS";
        OptimizelyDecideOption["EXCLUDE_VARIABLES"] = "EXCLUDE_VARIABLES";
    })(OptimizelyDecideOption || (OptimizelyDecideOption = {}));

    function newErrorDecision(key, user, reasons) {
        return {
            variationKey: null,
            enabled: false,
            variables: {},
            ruleKey: null,
            flagKey: key,
            userContext: user,
            reasons: reasons,
        };
    }

    /**
     * Copyright 2019-2020, 2022 Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Default milliseconds before request timeout
     */
    var REQUEST_TIMEOUT_MS = 60 * 1000; // 1 minute

    /**
     * Copyright 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * https://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Standard failure message for fetch errors
     */
    var FETCH_FAILURE_MESSAGE = 'Audience segments fetch failed';
    /**
     * Return value for scenarios with no valid JSON
     */
    var EMPTY_JSON_RESPONSE = null;
    /**
     * Http implementation for sending requests and handling responses to Optimizely Data Platform
     */
    var OdpClient = /** @class */ (function () {
        /**
         * An implementation for sending requests and handling responses to Optimizely Data Platform (ODP)
         * @param errorHandler Handler to record exceptions
         * @param logger Collect and record events/errors for this ODP client
         * @param requestHandler Client implementation to send/receive requests over HTTP
         * @param timeout Maximum milliseconds before requests are considered timed out
         */
        function OdpClient(errorHandler, logger, requestHandler, timeout) {
            if (timeout === void 0) { timeout = REQUEST_TIMEOUT_MS; }
            this._errorHandler = errorHandler;
            this._logger = logger;
            this._requestHandler = requestHandler;
            this._timeout = timeout;
        }
        /**
         * Handler for querying the ODP GraphQL endpoint
         * @param parameters
         * @returns JSON response string from ODP
         */
        OdpClient.prototype.querySegments = function (parameters) {
            var _a;
            return __awaiter(this, void 0, void 0, function () {
                var method, url, headers, data, response, request, error_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!(parameters === null || parameters === void 0 ? void 0 : parameters.apiHost) || !(parameters === null || parameters === void 0 ? void 0 : parameters.apiKey)) {
                                this._logger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments');
                                return [2 /*return*/, EMPTY_JSON_RESPONSE];
                            }
                            method = 'POST';
                            url = parameters.apiHost;
                            headers = {
                                'Content-Type': 'application/json',
                                'x-api-key': parameters.apiKey,
                            };
                            data = parameters.toGraphQLJson();
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            request = this._requestHandler.makeRequest(url, headers, method, data);
                            return [4 /*yield*/, request.responsePromise];
                        case 2:
                            response = _b.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_1 = _b.sent();
                            this._errorHandler.handleError(error_1);
                            this._logger.log(LogLevel.ERROR, "".concat(FETCH_FAILURE_MESSAGE, " (").concat((_a = error_1.statusCode) !== null && _a !== void 0 ? _a : 'network error', ")"));
                            return [2 /*return*/, EMPTY_JSON_RESPONSE];
                        case 4: return [2 /*return*/, response.body];
                    }
                });
            });
        };
        return OdpClient;
    }());

    /**
     * Copyright 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * https://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Handles parameters used in querying ODP segments
     */
    var QuerySegmentsParameters = /** @class */ (function () {
        function QuerySegmentsParameters(parameters) {
            Object.assign(this, parameters);
        }
        /**
         * Converts the QuerySegmentsParameters to a GraphQL JSON payload
         * @returns GraphQL JSON string
         */
        QuerySegmentsParameters.prototype.toGraphQLJson = function () {
            var _this = this;
            JSON.stringify(this.segmentsToCheck);
            // const hardCoded = `{"query": "query {customer(fs_user_id: \\"tester-101\\") {audiences(subset: [\\"has_email\\", \\"has_email_opted_in\\", \\"push_on_sale\\"]) {edges {node {name state}}}}}"}`
            // console.log(hardCoded)
            // return hardCoded
            var json = [];
            json.push('{"query" : "query {customer');
            json.push("(".concat(this.userKey, " : \\\"").concat(this.userValue, "\\\") "));
            json.push('{audiences');
            json.push("(subset: [");
            if (this.segmentsToCheck && this.segmentsToCheck.length) {
                this.segmentsToCheck.forEach(function (segment, idx) {
                    var _a;
                    json.push("\\\"".concat(segment, "\\\"").concat(idx < (((_a = _this.segmentsToCheck) === null || _a === void 0 ? void 0 : _a.length) || 0) ? '' : ','));
                });
            }
            json.push(']) {edges {node {name state}}}}}"}');
            console.log("Zaius GraphQL Query: ".concat(json.join('')));
            return json.join('');
        };
        return QuerySegmentsParameters;
    }());

    /**
     * Copyright 2022 Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * https://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var READY_STATE_DONE = 4;
    /**
     * Handles sending requests and receiving responses over HTTP via XMLHttpRequest
     */
    var BrowserRequestHandler = /** @class */ (function () {
        function BrowserRequestHandler(logger, timeout) {
            if (timeout === void 0) { timeout = REQUEST_TIMEOUT_MS; }
            this._logger = logger;
            this._timeout = timeout;
        }
        /**
         * Builds an XMLHttpRequest
         * @param reqUrl Fully-qualified URL to which to send the request
         * @param headers List of headers to include in the request
         * @param method HTTP method to use
         * @param data stringified version of data to POST, PUT, etc
         * @returns AbortableRequest contains both the response Promise and capability to abort()
         */
        BrowserRequestHandler.prototype.makeRequest = function (reqUrl, headers, method, data) {
            var _this = this;
            var request = new XMLHttpRequest();
            var responsePromise = new Promise(function (resolve, reject) {
                request.open(method, reqUrl, true);
                _this.setHeadersInXhr(headers, request);
                request.onreadystatechange = function () {
                    if (request.readyState === READY_STATE_DONE) {
                        var statusCode = request.status;
                        if (statusCode === 0) {
                            reject(new Error('Request error'));
                            return;
                        }
                        var headers_1 = _this.parseHeadersFromXhr(request);
                        var response = {
                            statusCode: request.status,
                            body: request.responseText,
                            headers: headers_1,
                        };
                        resolve(response);
                    }
                };
                request.timeout = _this._timeout;
                request.ontimeout = function () {
                    _this._logger.log(LogLevel.WARNING, 'Request timed out');
                };
                request.send(data);
            });
            return {
                responsePromise: responsePromise,
                abort: function () {
                    request.abort();
                },
            };
        };
        /**
         * Sets the header collection for an XHR
         * @param headers Headers to set
         * @param request Request into which headers are to be set
         * @private
         */
        BrowserRequestHandler.prototype.setHeadersInXhr = function (headers, request) {
            Object.keys(headers).forEach(function (headerName) {
                var header = headers[headerName];
                if (typeof header === 'string') {
                    request.setRequestHeader(headerName, header);
                }
            });
        };
        /**
         * Parses headers from an XHR
         * @param request Request containing headers to be retrieved
         * @private
         * @returns List of headers without duplicates
         */
        BrowserRequestHandler.prototype.parseHeadersFromXhr = function (request) {
            var _this = this;
            var allHeadersString = request.getAllResponseHeaders();
            if (allHeadersString === null) {
                return {};
            }
            var headerLines = allHeadersString.split('\r\n');
            var headers = {};
            headerLines.forEach(function (headerLine) {
                try {
                    var separatorIndex = headerLine.indexOf(': ');
                    if (separatorIndex > -1) {
                        var headerName = headerLine.slice(0, separatorIndex);
                        var headerValue = headerLine.slice(separatorIndex + 2);
                        if (headerName && headerValue) {
                            headers[headerName] = headerValue;
                        }
                    }
                }
                catch (_a) {
                    _this._logger.log(LogLevel.WARNING, "Unable to parse & skipped header item '".concat(headerLine, "'"));
                }
            });
            return headers;
        };
        return BrowserRequestHandler;
    }());

    /**
     * Copyright 2022 Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * https://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // import { ExecutionContext } from '../execution_context';
    // import { EXECUTION_CONTEXT_TYPE } from '../enums';
    /**
     * Factory to create the appropriate type of RequestHandler based on a provided context
     */
    var RequestHandlerFactory = /** @class */ (function () {
        function RequestHandlerFactory() {
        }
        RequestHandlerFactory.createHandler = function (logger, timeout) {
            return new BrowserRequestHandler(logger, timeout);
        };
        return RequestHandlerFactory;
    }());

    /**
     * Copyright 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * https://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Expected value for a qualified/valid segment
     */
    var QUALIFIED = 'qualified';
    /**
     * Return value when no valid segments found
     */
    var EMPTY_SEGMENTS_COLLECTION = [];
    /**
     * Return value for scenarios with no valid JSON
     */
    var EMPTY_JSON_RESPONSE$1 = null;
    /**
     * Concrete implementation for communicating with the Optimizely Data Platform GraphQL endpoint
     */
    var GraphqlManager = /** @class */ (function () {
        /**
         * Retrieves the audience segments from the Optimizely Data Platform (ODP)
         * @param errorHandler Handler to record exceptions
         * @param logger Collect and record events/errors for this GraphQL implementation
         * @param client Client to use to send queries to ODP
         */
        function GraphqlManager(errorHandler, logger, client) {
            this._errorHandler = errorHandler;
            this._logger = logger;
            this._odpClient = client !== null && client !== void 0 ? client : new OdpClient(this._errorHandler, this._logger, RequestHandlerFactory.createHandler(this._logger));
        }
        /**
         * Retrieves the audience segments from ODP
         * @param apiKey ODP public key
         * @param apiHost Fully-qualified URL of ODP
         * @param userKey 'vuid' or 'fs_user_id key'
         * @param userValue Associated value to query for the user key
         * @param segmentsToCheck Audience segments to check for experiment inclusion
         */
        GraphqlManager.prototype.fetchSegments = function (apiKey, apiHost, userKey, userValue, segmentsToCheck) {
            var _a, _b, _c, _d;
            return __awaiter(this, void 0, void 0, function () {
                var parameters, segmentsResponse, parsedSegments, errors, edges;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            parameters = new QuerySegmentsParameters({
                                apiKey: apiKey,
                                apiHost: apiHost,
                                userKey: userKey,
                                userValue: userValue,
                                segmentsToCheck: segmentsToCheck,
                            });
                            console.log('fetchSegments...');
                            console.log(parameters);
                            return [4 /*yield*/, this._odpClient.querySegments(parameters)];
                        case 1:
                            segmentsResponse = _e.sent();
                            if (!segmentsResponse) {
                                this._logger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)');
                                return [2 /*return*/, EMPTY_SEGMENTS_COLLECTION];
                            }
                            parsedSegments = this.parseSegmentsResponseJson(segmentsResponse);
                            if (!parsedSegments) {
                                this._logger.log(LogLevel.ERROR, 'Audience segments fetch failed (decode error)');
                                return [2 /*return*/, EMPTY_SEGMENTS_COLLECTION];
                            }
                            if (((_a = parsedSegments.errors) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                                errors = parsedSegments.errors.map(function (e) { return e.message; }).join('; ');
                                this._logger.log(LogLevel.WARNING, "Audience segments fetch failed (".concat(errors, ")"));
                                return [2 /*return*/, EMPTY_SEGMENTS_COLLECTION];
                            }
                            edges = (_d = (_c = (_b = parsedSegments === null || parsedSegments === void 0 ? void 0 : parsedSegments.data) === null || _b === void 0 ? void 0 : _b.customer) === null || _c === void 0 ? void 0 : _c.audiences) === null || _d === void 0 ? void 0 : _d.edges;
                            if (!edges) {
                                this._logger.log(LogLevel.WARNING, 'Audience segments fetch failed (decode error)');
                                return [2 /*return*/, EMPTY_SEGMENTS_COLLECTION];
                            }
                            return [2 /*return*/, edges.filter(function (edge) { return edge.node.state == QUALIFIED; }).map(function (edge) { return edge.node.name; })];
                    }
                });
            });
        };
        /**
         * Parses JSON response
         * @param jsonResponse JSON response from ODP
         * @private
         * @returns Response Strongly-typed ODP Response object
         */
        GraphqlManager.prototype.parseSegmentsResponseJson = function (jsonResponse) {
            var jsonObject = {};
            try {
                jsonObject = JSON.parse(jsonResponse);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (error) {
                this._errorHandler.handleError(error);
                this._logger.log(LogLevel.ERROR, 'Attempted to parse invalid segment response JSON.');
                return EMPTY_JSON_RESPONSE$1;
            }
            // if (validate(jsonObject, OdpResponseSchema, false)) {
            //   return jsonObject as Response;
            // }
            return jsonObject;
            // return EMPTY_JSON_RESPONSE;
        };
        return GraphqlManager;
    }());

    /**
     * Copyright 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * https://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var BrowserAsyncStorageCache = /** @class */ (function () {
        function BrowserAsyncStorageCache() {
        }
        BrowserAsyncStorageCache.prototype.contains = function (key) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, localStorage.getItem(key) !== null];
                });
            });
        };
        BrowserAsyncStorageCache.prototype.get = function (key) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, localStorage.getItem(key)];
                });
            });
        };
        BrowserAsyncStorageCache.prototype.remove = function (key) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.contains(key)];
                        case 1:
                            if (_a.sent()) {
                                localStorage.removeItem(key);
                                return [2 /*return*/, true];
                            }
                            else {
                                return [2 /*return*/, false];
                            }
                    }
                });
            });
        };
        BrowserAsyncStorageCache.prototype.set = function (key, val) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, localStorage.setItem(key, val)];
                });
            });
        };
        return BrowserAsyncStorageCache;
    }());

    /**
     * Copyright 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * https://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Manager for creating, persisting, and retrieving a Visitor Unique Identifier
     */
    var VuidManager = /** @class */ (function () {
        function VuidManager() {
            var _this = this;
            /**
             * Unique key used within the persistent value cache against which to
             * store the VUID
             * @private
             */
            this._keyForVuid = 'optimizely-vuid';
            /**
             * Prefix used as part of the VUID format
             * @private
             */
            this._prefix = "vuid_";
            /**
             * Validates the format of a Visitor Unique Identifier
             * @param vuid VistorId to check
             * @returns *true* if the VisitorId is valid otherwise *false* for invalid
             */
            this.isVuid = function (vuid) { return vuid.startsWith(_this._prefix); };
            this._vuid = '';
        }
        Object.defineProperty(VuidManager.prototype, "vuid", {
            /**
             * Get the current VUID value being used
             */
            get: function () {
                return this._vuid;
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Gets the current instance of the VUID Manager, initializing if needed
         * @param cache Caching mechanism to use for persisting the VUID outside working memory   *
         * @returns An instance of VuidManager
         */
        VuidManager.instance = function (cache) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this._instance) {
                                this._instance = new VuidManager();
                            }
                            if (!!this._instance._vuid) return [3 /*break*/, 2];
                            return [4 /*yield*/, this._instance.load(cache)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [2 /*return*/, this._instance];
                    }
                });
            });
        };
        /**
         * Attempts to load a VUID from persistent cache or generates a new VUID
         * @param cache Caching mechanism to use for persisting the VUID outside working memory
         * @returns Current VUID stored in the VuidManager
         */
        VuidManager.prototype.load = function (cache) {
            return __awaiter(this, void 0, void 0, function () {
                var cachedValue;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, cache.get(this._keyForVuid)];
                        case 1:
                            cachedValue = _a.sent();
                            if (!(cachedValue && this.isVuid(cachedValue))) return [3 /*break*/, 2];
                            this._vuid = cachedValue;
                            return [3 /*break*/, 4];
                        case 2:
                            this._vuid = this.makeVuid();
                            return [4 /*yield*/, this.save(this._vuid, cache)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [2 /*return*/, this._vuid];
                    }
                });
            });
        };
        /**
         * Creates a new VUID
         * @returns A new visitor unique identifier
         */
        VuidManager.prototype.makeVuid = function () {
            var maxLength = 32; // required by ODP server
            // make sure UUIDv4 is used (not UUIDv1 or UUIDv6) since the trailing 5 chars will be truncated. See TDD for details.
            var uuidV4 = uuid();
            var formatted = uuidV4.replace(/-/g, '').toLowerCase();
            var vuidFull = "".concat((this._prefix)).concat(formatted);
            return (vuidFull.length <= maxLength) ? vuidFull : vuidFull.substring(0, maxLength);
        };
        /**
         * Saves a VUID to a persistent cache
         * @param vuid VUID to be stored
         * @param cache Caching mechanism to use for persisting the VUID outside working memory
         */
        VuidManager.prototype.save = function (vuid, cache) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, cache.set(this._keyForVuid, vuid)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Function used in unit testing to reset the VuidManager
         * **Important**: This should not to be used in production code
         */
        VuidManager._reset = function () {
            this._instance._vuid = '';
        };
        return VuidManager;
    }());

    var OptimizelyUserContext = /** @class */ (function () {
        function OptimizelyUserContext(_a) {
            var optimizely = _a.optimizely, userId = _a.userId, attributes = _a.attributes;
            var _b;
            this._qualifiedSegments = [];
            this.cacheInstance = new BrowserAsyncStorageCache();
            this.optimizely = optimizely;
            this.userId = userId || '';
            this.attributes = (_b = __assign({}, attributes)) !== null && _b !== void 0 ? _b : {};
            this.forcedDecisionsMap = {};
        }
        /**
         * Sets an attribute for a given key.
         * @param     {string}                     key         An attribute key
         * @param     {any}                        value       An attribute value
         */
        OptimizelyUserContext.prototype.setAttribute = function (key, value) {
            this.attributes[key] = value;
        };
        OptimizelyUserContext.prototype.getUserId = function () {
            return this.userId;
        };
        OptimizelyUserContext.prototype.getUserIdOdp = function () {
            return __awaiter(this, void 0, void 0, function () {
                var vuidManager, userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, VuidManager.instance(this.cacheInstance)];
                        case 1:
                            vuidManager = _a.sent();
                            userId = (this.getUserId() !== '')
                                ? this.getUserId()
                                : vuidManager.vuid;
                            return [2 /*return*/, userId]; // Return VUID/FS_UID Type here too?
                    }
                });
            });
        };
        OptimizelyUserContext.prototype.getAttributes = function () {
            return __assign({}, this.attributes);
        };
        OptimizelyUserContext.prototype.getOptimizely = function () {
            return this.optimizely;
        };
        Object.defineProperty(OptimizelyUserContext.prototype, "qualifiedSegments", {
            get: function () {
                return this._qualifiedSegments;
            },
            set: function (qualifiedSegments) {
                this._qualifiedSegments = __spreadArray([], qualifiedSegments, true);
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Returns a decision result for a given flag key and a user context, which contains all data required to deliver the flag.
         * If the SDK finds an error, it will return a decision with null for variationKey. The decision will include an error message in reasons.
         * @param     {string}                     key         A flag key for which a decision will be made.
         * @param     {OptimizelyDecideOption}     options     An array of options for decision-making.
         * @return    {OptimizelyDecision}                     A decision result.
         */
        OptimizelyUserContext.prototype.decide = function (key, options) {
            if (options === void 0) { options = []; }
            return this.optimizely.decide(this.cloneUserContext(), key, options);
        };
        /**
         * Returns an object of decision results for multiple flag keys and a user context.
         * If the SDK finds an error for a key, the response will include a decision for the key showing reasons for the error.
         * The SDK will always return key-mapped decisions. When it cannot process requests, it will return an empty map after logging the errors.
         * @param     {string[]}                   keys        An array of flag keys for which decisions will be made.
         * @param     {OptimizelyDecideOption[]}   options     An array of options for decision-making.
         * @return    {[key: string]: OptimizelyDecision}      An object of decision results mapped by flag keys.
         */
        OptimizelyUserContext.prototype.decideForKeys = function (keys, options) {
            if (options === void 0) { options = []; }
            return this.optimizely.decideForKeys(this.cloneUserContext(), keys, options);
        };
        /**
         * Returns an object of decision results for all active flag keys.
         * @param     {OptimizelyDecideOption[]}   options     An array of options for decision-making.
         * @return    {[key: string]: OptimizelyDecision}      An object of all decision results mapped by flag keys.
         */
        OptimizelyUserContext.prototype.decideAll = function (options) {
            if (options === void 0) { options = []; }
            return this.optimizely.decideAll(this.cloneUserContext(), options);
        };
        /**
         * Tracks an event.
         * @param     {string}                     eventName The event name.
         * @param     {EventTags}                  eventTags An optional map of event tag names to event tag values.
         */
        OptimizelyUserContext.prototype.trackEvent = function (eventName, eventTags) {
            this.optimizely.track(eventName, this.userId, this.attributes, eventTags);
        };
        /**
         * Sets the forced decision for specified optimizely decision context.
         * @param     {OptimizelyDecisionContext}   context      OptimizelyDecisionContext containing flagKey and optional ruleKey.
         * @param     {OptimizelyForcedDecision}    decision     OptimizelyForcedDecision containing forced variation key.
         * @return    {boolean}                     true if the forced decision has been set successfully.
         */
        OptimizelyUserContext.prototype.setForcedDecision = function (context, decision) {
            var _a;
            var flagKey = context.flagKey;
            var ruleKey = (_a = context.ruleKey) !== null && _a !== void 0 ? _a : CONTROL_ATTRIBUTES.FORCED_DECISION_NULL_RULE_KEY;
            var variationKey = decision.variationKey;
            var forcedDecision = { variationKey: variationKey };
            if (!this.forcedDecisionsMap[flagKey]) {
                this.forcedDecisionsMap[flagKey] = {};
            }
            this.forcedDecisionsMap[flagKey][ruleKey] = forcedDecision;
            return true;
        };
        /**
         * Returns the forced decision for specified optimizely decision context.
         * @param     {OptimizelyDecisionContext}  context  OptimizelyDecisionContext containing flagKey and optional ruleKey.
         * @return    {OptimizelyForcedDecision|null}       OptimizelyForcedDecision for specified context if exists or null.
         */
        OptimizelyUserContext.prototype.getForcedDecision = function (context) {
            return this.findForcedDecision(context);
        };
        /**
         * Removes the forced decision for specified optimizely decision context.
         * @param     {OptimizelyDecisionContext}  context  OptimizelyDecisionContext containing flagKey and optional ruleKey.
         * @return    {boolean}                    true if the forced decision has been removed successfully
         */
        OptimizelyUserContext.prototype.removeForcedDecision = function (context) {
            var _a;
            var ruleKey = (_a = context.ruleKey) !== null && _a !== void 0 ? _a : CONTROL_ATTRIBUTES.FORCED_DECISION_NULL_RULE_KEY;
            var flagKey = context.flagKey;
            var isForcedDecisionRemoved = false;
            if (this.forcedDecisionsMap.hasOwnProperty(flagKey)) {
                var forcedDecisionByRuleKey = this.forcedDecisionsMap[flagKey];
                if (forcedDecisionByRuleKey.hasOwnProperty(ruleKey)) {
                    delete this.forcedDecisionsMap[flagKey][ruleKey];
                    isForcedDecisionRemoved = true;
                }
                if (Object.keys(this.forcedDecisionsMap[flagKey]).length === 0) {
                    delete this.forcedDecisionsMap[flagKey];
                }
            }
            return isForcedDecisionRemoved;
        };
        /**
         * Removes all forced decisions bound to this user context.
         * @return    {boolean}                    true if the forced decision has been removed successfully
         */
        OptimizelyUserContext.prototype.removeAllForcedDecisions = function () {
            this.forcedDecisionsMap = {};
            return true;
        };
        /**
         * Finds a forced decision in forcedDecisionsMap for provided optimizely decision context.
         * @param     {OptimizelyDecisionContext}     context  OptimizelyDecisionContext containing flagKey and optional ruleKey.
         * @return    {OptimizelyForcedDecision|null}          OptimizelyForcedDecision for specified context if exists or null.
         */
        OptimizelyUserContext.prototype.findForcedDecision = function (context) {
            var _a;
            var variationKey;
            var validRuleKey = (_a = context.ruleKey) !== null && _a !== void 0 ? _a : CONTROL_ATTRIBUTES.FORCED_DECISION_NULL_RULE_KEY;
            var flagKey = context.flagKey;
            if (this.forcedDecisionsMap.hasOwnProperty(context.flagKey)) {
                var forcedDecisionByRuleKey = this.forcedDecisionsMap[flagKey];
                if (forcedDecisionByRuleKey.hasOwnProperty(validRuleKey)) {
                    variationKey = forcedDecisionByRuleKey[validRuleKey].variationKey;
                    return { variationKey: variationKey };
                }
            }
            return null;
        };
        OptimizelyUserContext.prototype.isQualifiedFor = function (segment) {
            return this._qualifiedSegments.indexOf(segment) > -1;
        };
        OptimizelyUserContext.prototype.fetchQualifiedSegments = function (options) {
            return __awaiter(this, void 0, void 0, function () {
                var userIdOdp, apiManager, updatedSegments;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserIdOdp()];
                        case 1:
                            userIdOdp = _a.sent();
                            apiManager = new GraphqlManager({
                                handleError: function (exception) {
                                    console.error(exception);
                                }
                            }, {
                                log: function (level, message) {
                                    console.log(level, message);
                                }
                            });
                            console.info("Fetching segments using params: {\n      key: ".concat(this.optimizely.odpInformation.key, ",\n      endpoint: ").concat(this.optimizely.odpInformation.host, "/v3/graphql,\n      userKey: 'fs_user_id',\n      userValue: ").concat(userIdOdp, ",\n      segments: ").concat(Array.from(this.optimizely.odpInformation.segments), "\n    }"));
                            return [4 /*yield*/, apiManager.fetchSegments(this.optimizely.odpInformation.key, this.optimizely.odpInformation.host + '/v3/graphql', 'fs_user_id', userIdOdp, Array.from(this.optimizely.odpInformation.segments))];
                        case 2:
                            updatedSegments = _a.sent();
                            this._qualifiedSegments = updatedSegments;
                            return [2 /*return*/];
                    }
                });
            });
        };
        OptimizelyUserContext.prototype.cloneUserContext = function () {
            var userContext = new OptimizelyUserContext({
                optimizely: this.getOptimizely(),
                userId: this.getUserId(),
                attributes: this.getAttributes(),
            });
            if (Object.keys(this.forcedDecisionsMap).length > 0) {
                userContext.forcedDecisionsMap = __assign({}, this.forcedDecisionsMap);
            }
            if (this._qualifiedSegments) {
                userContext._qualifiedSegments = __spreadArray([], this._qualifiedSegments, true);
            }
            return userContext;
        };
        return OptimizelyUserContext;
    }());

    /****************************************************************************
     * Copyright 2018, 2021, Optimizely, Inc. and contributors                  *
     *                                                                          *
     * Licensed under the Apache License, Version 2.0 (the "License");          *
     * you may not use this file except in compliance with the License.         *
     * You may obtain a copy of the License at                                  *
     *                                                                          *
     *    http://www.apache.org/licenses/LICENSE-2.0                            *
     *                                                                          *
     * Unless required by applicable law or agreed to in writing, software      *
     * distributed under the License is distributed on an "AS IS" BASIS,        *
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
     * See the License for the specific language governing permissions and      *
     * limitations under the License.                                           *
     ***************************************************************************/
    var AND_CONDITION = 'and';
    var OR_CONDITION = 'or';
    var NOT_CONDITION = 'not';
    var DEFAULT_OPERATOR_TYPES = [AND_CONDITION, OR_CONDITION, NOT_CONDITION];
    /**
     * Top level method to evaluate conditions
     * @param  {ConditionTree<Leaf>}    conditions      Nested array of and/or conditions, or a single leaf
     *                                                  condition value of any type
     *                                                  Example: ['and', '0', ['or', '1', '2']]
     * @param  {LeafEvaluator<Leaf>}    leafEvaluator   Function which will be called to evaluate leaf condition
     *                                                  values
     * @return {?boolean}                               Result of evaluating the conditions using the operator
     *                                                  rules and the leaf evaluator. A return value of null
     *                                                  indicates that the conditions are invalid or unable to be
     *                                                  evaluated.
     */
    function evaluate(conditions, leafEvaluator) {
        if (Array.isArray(conditions)) {
            var firstOperator = conditions[0];
            var restOfConditions = conditions.slice(1);
            if (typeof firstOperator === 'string' && DEFAULT_OPERATOR_TYPES.indexOf(firstOperator) === -1) {
                // Operator to apply is not explicit - assume 'or'
                firstOperator = OR_CONDITION;
                restOfConditions = conditions;
            }
            switch (firstOperator) {
                case AND_CONDITION:
                    return andEvaluator(restOfConditions, leafEvaluator);
                case NOT_CONDITION:
                    return notEvaluator(restOfConditions, leafEvaluator);
                default:
                    // firstOperator is OR_CONDITION
                    return orEvaluator(restOfConditions, leafEvaluator);
            }
        }
        var leafCondition = conditions;
        return leafEvaluator(leafCondition);
    }
    /**
     * Evaluates an array of conditions as if the evaluator had been applied
     * to each entry and the results AND-ed together.
     * @param  {unknown[]}             conditions      Array of conditions ex: [operand_1, operand_2]
     * @param  {LeafEvaluator<Leaf>}   leafEvaluator   Function which will be called to evaluate leaf condition values
     * @return {?boolean}                              Result of evaluating the conditions. A return value of null
     *                                                 indicates that the conditions are invalid or unable to be
     *                                                 evaluated.
     */
    function andEvaluator(conditions, leafEvaluator) {
        var sawNullResult = false;
        if (Array.isArray(conditions)) {
            for (var i = 0; i < conditions.length; i++) {
                var conditionResult = evaluate(conditions[i], leafEvaluator);
                if (conditionResult === false) {
                    return false;
                }
                if (conditionResult === null) {
                    sawNullResult = true;
                }
            }
            return sawNullResult ? null : true;
        }
        return null;
    }
    /**
     * Evaluates an array of conditions as if the evaluator had been applied
     * to a single entry and NOT was applied to the result.
     * @param  {unknown[]}             conditions      Array of conditions ex: [operand_1]
     * @param  {LeafEvaluator<Leaf>}   leafEvaluator   Function which will be called to evaluate leaf condition values
     * @return {?boolean}                              Result of evaluating the conditions. A return value of null
     *                                                 indicates that the conditions are invalid or unable to be
     *                                                 evaluated.
     */
    function notEvaluator(conditions, leafEvaluator) {
        if (Array.isArray(conditions) && conditions.length > 0) {
            var result = evaluate(conditions[0], leafEvaluator);
            return result === null ? null : !result;
        }
        return null;
    }
    /**
     * Evaluates an array of conditions as if the evaluator had been applied
     * to each entry and the results OR-ed together.
     * @param  {unknown[]}             conditions      Array of conditions ex: [operand_1, operand_2]
     * @param  {LeafEvaluator<Leaf>}   leafEvaluator   Function which will be called to evaluate leaf condition values
     * @return {?boolean}                              Result of evaluating the conditions. A return value of null
     *                                                 indicates that the conditions are invalid or unable to be
     *                                                 evaluated.
     */
    function orEvaluator(conditions, leafEvaluator) {
        var sawNullResult = false;
        if (Array.isArray(conditions)) {
            for (var i = 0; i < conditions.length; i++) {
                var conditionResult = evaluate(conditions[i], leafEvaluator);
                if (conditionResult === true) {
                    return true;
                }
                if (conditionResult === null) {
                    sawNullResult = true;
                }
            }
            return sawNullResult ? null : false;
        }
        return null;
    }

    /**
     * The OptimizelyConfig class
     * @param {ProjectConfig} configObj
     * @param {string}        datafile
     */
    var OptimizelyConfig = /** @class */ (function () {
        function OptimizelyConfig(configObj, datafile) {
            var _a, _b;
            this.sdkKey = (_a = configObj.sdkKey) !== null && _a !== void 0 ? _a : '';
            this.environmentKey = (_b = configObj.environmentKey) !== null && _b !== void 0 ? _b : '';
            this.attributes = configObj.attributes;
            this.audiences = OptimizelyConfig.getAudiences(configObj);
            this.events = configObj.events;
            this.revision = configObj.revision;
            var featureIdVariablesMap = (configObj.featureFlags || []).reduce(function (resultMap, feature) {
                resultMap[feature.id] = feature.variables;
                return resultMap;
            }, {});
            var experimentsMapById = OptimizelyConfig.getExperimentsMapById(configObj, featureIdVariablesMap);
            this.experimentsMap = OptimizelyConfig.getExperimentsKeyMap(experimentsMapById);
            this.featuresMap = OptimizelyConfig.getFeaturesMap(configObj, featureIdVariablesMap, experimentsMapById);
            this.datafile = datafile;
        }
        /**
         * Get the datafile
         * @returns {string} JSON string representation of the datafile that was used to create the current config object
         */
        OptimizelyConfig.prototype.getDatafile = function () {
            return this.datafile;
        };
        /**
         * Get Unique audiences list with typedAudiences as priority
         * @param       {ProjectConfig}              configObj
         * @returns     {OptimizelyAudience[]}       Array of unique audiences
         */
        OptimizelyConfig.getAudiences = function (configObj) {
            var audiences = [];
            var typedAudienceIds = [];
            (configObj.typedAudiences || []).forEach(function (typedAudience) {
                audiences.push({
                    id: typedAudience.id,
                    conditions: JSON.stringify(typedAudience.conditions),
                    name: typedAudience.name,
                });
                typedAudienceIds.push(typedAudience.id);
            });
            (configObj.audiences || []).forEach(function (audience) {
                if (typedAudienceIds.indexOf(audience.id) === -1 && audience.id != '$opt_dummy_audience') {
                    audiences.push({
                        id: audience.id,
                        conditions: JSON.stringify(audience.conditions),
                        name: audience.name,
                    });
                }
            });
            return audiences;
        };
        /**
         * Converts list of audience conditions to serialized audiences used in experiment
         * for examples:
         * 1. Input: ["or", "1", "2"]
         * Output: "\"us\" OR \"female\""
         * 2. Input: ["not", "1"]
         * Output: "NOT \"us\""
         * 3. Input: ["or", "1"]
         * Output: "\"us\""
         * 4. Input: ["and", ["or", "1", ["and", "2", "3"]], ["and", "11", ["or", "12", "13"]]]
         * Output: "(\"us\" OR (\"female\" AND \"adult\")) AND (\"fr\" AND (\"male\" OR \"kid\"))"
         * @param       {Array<string | string[]>}                 conditions
         * @param       {[id: string]: Audience}                   audiencesById
         * @returns     {string}                                   Serialized audiences condition string
         */
        OptimizelyConfig.getSerializedAudiences = function (conditions, audiencesById) {
            var serializedAudience = '';
            if (conditions) {
                var cond_1 = '';
                conditions.forEach(function (item) {
                    var subAudience = '';
                    // Checks if item is list of conditions means it is sub audience
                    if (item instanceof Array) {
                        subAudience = OptimizelyConfig.getSerializedAudiences(item, audiencesById);
                        subAudience = "(".concat(subAudience, ")");
                    }
                    else if (DEFAULT_OPERATOR_TYPES.indexOf(item) > -1) {
                        cond_1 = item.toUpperCase();
                    }
                    else {
                        // Checks if item is audience id
                        var audienceName = audiencesById[item] ? audiencesById[item].name : item;
                        // if audience condition is "NOT" then add "NOT" at start. Otherwise check if there is already audience id in serializedAudience then append condition between serializedAudience and item
                        if (serializedAudience || cond_1 === 'NOT') {
                            cond_1 = cond_1 === '' ? 'OR' : cond_1;
                            if (serializedAudience === '') {
                                serializedAudience = "".concat(cond_1, " \"").concat(audiencesById[item].name, "\"");
                            }
                            else {
                                serializedAudience = serializedAudience.concat(" ".concat(cond_1, " \"").concat(audienceName, "\""));
                            }
                        }
                        else {
                            serializedAudience = "\"".concat(audienceName, "\"");
                        }
                    }
                    // Checks if sub audience is empty or not
                    if (subAudience !== '') {
                        if (serializedAudience !== '' || cond_1 === 'NOT') {
                            cond_1 = cond_1 === '' ? 'OR' : cond_1;
                            if (serializedAudience === '') {
                                serializedAudience = "".concat(cond_1, " ").concat(subAudience);
                            }
                            else {
                                serializedAudience = serializedAudience.concat(" ".concat(cond_1, " ").concat(subAudience));
                            }
                        }
                        else {
                            serializedAudience = serializedAudience.concat(subAudience);
                        }
                    }
                });
            }
            return serializedAudience;
        };
        /**
         * Get serialized audience condition string for experiment
         * @param       {Experiment}                 experiment
         * @param       {ProjectConfig}              configObj
         * @returns     {string}                     Serialized audiences condition string
         */
        OptimizelyConfig.getExperimentAudiences = function (experiment, configObj) {
            if (!experiment.audienceConditions) {
                return '';
            }
            return OptimizelyConfig.getSerializedAudiences(experiment.audienceConditions, configObj.audiencesById);
        };
        /**
         * Make map of featureVariable which are associated with given feature experiment
         * @param       {FeatureVariablesMap}                 featureIdVariableMap
         * @param       {[id: string]: FeatureVariable}       variableIdMap
         * @param       {string}                              featureId
         * @param       {VariationVariable[] | undefined}     featureVariableUsages
         * @param       {boolean | undefined}                 isFeatureEnabled
         * @returns     {OptimizelyVariablesMap}              FeatureVariables mapped by key
         */
        OptimizelyConfig.mergeFeatureVariables = function (featureIdVariableMap, variableIdMap, featureId, featureVariableUsages, isFeatureEnabled) {
            var variablesMap = (featureIdVariableMap[featureId] || []).reduce(function (optlyVariablesMap, featureVariable) {
                optlyVariablesMap[featureVariable.key] = {
                    id: featureVariable.id,
                    key: featureVariable.key,
                    type: featureVariable.type,
                    value: featureVariable.defaultValue,
                };
                return optlyVariablesMap;
            }, {});
            (featureVariableUsages || []).forEach(function (featureVariableUsage) {
                var defaultVariable = variableIdMap[featureVariableUsage.id];
                var optimizelyVariable = {
                    id: featureVariableUsage.id,
                    key: defaultVariable.key,
                    type: defaultVariable.type,
                    value: isFeatureEnabled ? featureVariableUsage.value : defaultVariable.defaultValue,
                };
                variablesMap[defaultVariable.key] = optimizelyVariable;
            });
            return variablesMap;
        };
        /**
         * Gets Map of all experiment variations and variables including rollouts
         * @param       {Variation[]}                           variations
         * @param       {FeatureVariablesMap}                   featureIdVariableMap
         * @param       {[id: string]: FeatureVariable}         variableIdMap
         * @param       {string}                                featureId
         * @returns     {[key: string]: Variation}              Variations mapped by key
         */
        OptimizelyConfig.getVariationsMap = function (variations, featureIdVariableMap, variableIdMap, featureId) {
            var variationsMap = {};
            variationsMap = variations.reduce(function (optlyVariationsMap, variation) {
                var variablesMap = OptimizelyConfig.mergeFeatureVariables(featureIdVariableMap, variableIdMap, featureId, variation.variables, variation.featureEnabled);
                optlyVariationsMap[variation.key] = {
                    id: variation.id,
                    key: variation.key,
                    featureEnabled: variation.featureEnabled,
                    variablesMap: variablesMap,
                };
                return optlyVariationsMap;
            }, {});
            return variationsMap;
        };
        /**
         * Gets Map of FeatureVariable with respect to featureVariableId
         * @param       {ProjectConfig}                        configObj
         * @returns     {[id: string]: FeatureVariable}        FeatureVariables mapped by id
         */
        OptimizelyConfig.getVariableIdMap = function (configObj) {
            var variablesIdMap = {};
            variablesIdMap = (configObj.featureFlags || []).reduce(function (resultMap, feature) {
                feature.variables.forEach(function (variable) {
                    resultMap[variable.id] = variable;
                });
                return resultMap;
            }, {});
            return variablesIdMap;
        };
        /**
         * Gets list of rollout experiments
         * @param       {ProjectConfig}               configObj
         * @param       {FeatureVariablesMap}         featureVariableIdMap
         * @param       {string}                      featureId
         * @param       {Experiment[]}                experiments
         * @returns     {OptimizelyExperiment[]}      List of Optimizely rollout experiments
         */
        OptimizelyConfig.getDeliveryRules = function (configObj, featureVariableIdMap, featureId, experiments) {
            var variableIdMap = OptimizelyConfig.getVariableIdMap(configObj);
            return experiments.map(function (experiment) {
                return {
                    id: experiment.id,
                    key: experiment.key,
                    audiences: OptimizelyConfig.getExperimentAudiences(experiment, configObj),
                    variationsMap: OptimizelyConfig.getVariationsMap(experiment.variations, featureVariableIdMap, variableIdMap, featureId),
                };
            });
        };
        /**
         * Get Experiment Ids which are part of rollout
         * @param       {Rollout[]}     rollouts
         * @returns     {string[]}      Array of experiment Ids
         */
        OptimizelyConfig.getRolloutExperimentIds = function (rollouts) {
            var experimentIds = [];
            (rollouts || []).forEach(function (rollout) {
                rollout.experiments.forEach(function (e) {
                    experimentIds.push(e.id);
                });
            });
            return experimentIds;
        };
        /**
         * Get experiments mapped by their id's which are not part of a rollout
         * @param       {ProjectConfig}                           configObj
         * @param       {FeatureVariablesMap}                     featureIdVariableMap
         * @returns     {[id: string]: OptimizelyExperiment}      Experiments mapped by id
         */
        OptimizelyConfig.getExperimentsMapById = function (configObj, featureIdVariableMap) {
            var variableIdMap = OptimizelyConfig.getVariableIdMap(configObj);
            var rolloutExperimentIds = this.getRolloutExperimentIds(configObj.rollouts);
            var experiments = configObj.experiments;
            return (experiments || []).reduce(function (experimentsMap, experiment) {
                if (rolloutExperimentIds.indexOf(experiment.id) === -1) {
                    var featureIds = configObj.experimentFeatureMap[experiment.id];
                    var featureId = '';
                    if (featureIds && featureIds.length > 0) {
                        featureId = featureIds[0];
                    }
                    var variationsMap = OptimizelyConfig.getVariationsMap(experiment.variations, featureIdVariableMap, variableIdMap, featureId.toString());
                    experimentsMap[experiment.id] = {
                        id: experiment.id,
                        key: experiment.key,
                        audiences: OptimizelyConfig.getExperimentAudiences(experiment, configObj),
                        variationsMap: variationsMap,
                    };
                }
                return experimentsMap;
            }, {});
        };
        /**
         * Get experiments mapped by their keys
         * @param       {OptimizelyExperimentsMap}     experimentsMapById
         * @returns     {OptimizelyExperimentsMap}     Experiments mapped by key
         */
        OptimizelyConfig.getExperimentsKeyMap = function (experimentsMapById) {
            var experimentKeysMap = {};
            for (var id in experimentsMapById) {
                var experiment = experimentsMapById[id];
                experimentKeysMap[experiment.key] = experiment;
            }
            return experimentKeysMap;
        };
        /**
         * Gets Map of all FeatureFlags and associated experiment map inside it
         * @param       {ProjectConfig}              configObj
         * @param       {FeatureVariablesMap}        featureVariableIdMap
         * @param       {OptimizelyExperimentsMap}   experimentsMapById
         * @returns     {OptimizelyFeaturesMap}      OptimizelyFeature mapped by key
         */
        OptimizelyConfig.getFeaturesMap = function (configObj, featureVariableIdMap, experimentsMapById) {
            var featuresMap = {};
            configObj.featureFlags.forEach(function (featureFlag) {
                var featureExperimentMap = {};
                var experimentRules = [];
                featureFlag.experimentIds.forEach(function (experimentId) {
                    var experiment = experimentsMapById[experimentId];
                    if (experiment) {
                        featureExperimentMap[experiment.key] = experiment;
                    }
                    experimentRules.push(experimentsMapById[experimentId]);
                });
                var featureVariableMap = (featureFlag.variables || []).reduce(function (variables, variable) {
                    variables[variable.key] = {
                        id: variable.id,
                        key: variable.key,
                        type: variable.type,
                        value: variable.defaultValue,
                    };
                    return variables;
                }, {});
                var deliveryRules = [];
                var rollout = configObj.rolloutIdMap[featureFlag.rolloutId];
                if (rollout) {
                    deliveryRules = OptimizelyConfig.getDeliveryRules(configObj, featureVariableIdMap, featureFlag.id, rollout.experiments);
                }
                featuresMap[featureFlag.key] = {
                    id: featureFlag.id,
                    key: featureFlag.key,
                    experimentRules: experimentRules,
                    deliveryRules: deliveryRules,
                    experimentsMap: featureExperimentMap,
                    variablesMap: featureVariableMap,
                };
            });
            return featuresMap;
        };
        return OptimizelyConfig;
    }());
    /**
     * Create an instance of OptimizelyConfig
     * @param   {ProjectConfig}             configObj
     * @param   {string}                    datafile
     * @returns {OptimizelyConfig}          An instance of OptimizelyConfig
     */
    function createOptimizelyConfig(configObj, datafile) {
        return new OptimizelyConfig(configObj, datafile);
    }

    /**
     * Copyright 2016-2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var EXPERIMENT_RUNNING_STATUS = 'Running';
    var RESERVED_ATTRIBUTE_PREFIX = '$opt_';
    var MODULE_NAME$1 = 'PROJECT_CONFIG';
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    function createMutationSafeDatafileCopy(datafile) {
        var _a, _b;
        var datafileCopy = assign({}, datafile);
        datafileCopy.audiences = (datafile.audiences || []).map(function (audience) {
            return assign({}, audience);
        });
        datafileCopy.experiments = (datafile.experiments || []).map(function (experiment) {
            return assign({}, experiment);
        });
        datafileCopy.featureFlags = (datafile.featureFlags || []).map(function (featureFlag) {
            return assign({}, featureFlag);
        });
        datafileCopy.groups = (datafile.groups || []).map(function (group) {
            var groupCopy = assign({}, group);
            groupCopy.experiments = (group.experiments || []).map(function (experiment) {
                return assign({}, experiment);
            });
            return groupCopy;
        });
        datafileCopy.rollouts = (datafile.rollouts || []).map(function (rollout) {
            var rolloutCopy = assign({}, rollout);
            rolloutCopy.experiments = (rollout.experiments || []).map(function (experiment) {
                return assign({}, experiment);
            });
            return rolloutCopy;
        });
        datafileCopy.environmentKey = (_a = datafile.environmentKey) !== null && _a !== void 0 ? _a : '';
        datafileCopy.sdkKey = (_b = datafile.sdkKey) !== null && _b !== void 0 ? _b : '';
        return datafileCopy;
    }
    /**
     * Creates projectConfig object to be used for quick project property lookup
     * @param  {Object}        datafileObj   JSON datafile representing the project
     * @param  {string|null}   datafileStr   JSON string representation of the datafile
     * @return {ProjectConfig} Object representing project configuration
     */
    var createProjectConfig = function (datafileObj, datafileStr) {
        if (datafileStr === void 0) { datafileStr = null; }
        var projectConfig = createMutationSafeDatafileCopy(datafileObj);
        projectConfig.__datafileStr = datafileStr === null ? JSON.stringify(datafileObj) : datafileStr;
        /*
         * Conditions of audiences in projectConfig.typedAudiences are not
         * expected to be string-encoded as they are here in projectConfig.audiences.
         */
        (projectConfig.audiences || []).forEach(function (audience) {
            audience.conditions = JSON.parse(audience.conditions);
        });
        projectConfig.audiencesById = keyBy(projectConfig.audiences, 'id');
        assign(projectConfig.audiencesById, keyBy(projectConfig.typedAudiences, 'id'));
        projectConfig.allSegments = new Set([]);
        Object.keys(projectConfig.audiencesById)
            .map(function (audience) { return getAudienceSegments(projectConfig.audiencesById[audience]); })
            .forEach(function (audienceSegments) {
            audienceSegments.forEach(function (segment) {
                projectConfig.allSegments.add(segment);
            });
        });
        projectConfig.attributeKeyMap = keyBy(projectConfig.attributes, 'key');
        projectConfig.eventKeyMap = keyBy(projectConfig.events, 'key');
        projectConfig.groupIdMap = keyBy(projectConfig.groups, 'id');
        var experiments;
        Object.keys(projectConfig.groupIdMap || {}).forEach(function (Id) {
            experiments = projectConfig.groupIdMap[Id].experiments;
            (experiments || []).forEach(function (experiment) {
                projectConfig.experiments.push(assign(experiment, { groupId: Id }));
            });
        });
        projectConfig.rolloutIdMap = keyBy(projectConfig.rollouts || [], 'id');
        objectValues(projectConfig.rolloutIdMap || {}).forEach(function (rollout) {
            (rollout.experiments || []).forEach(function (experiment) {
                projectConfig.experiments.push(experiment);
                // Creates { <variationKey>: <variation> } map inside of the experiment
                experiment.variationKeyMap = keyBy(experiment.variations, 'key');
            });
        });
        if (projectConfig.integrations) {
            projectConfig.integrationKeyMap = keyBy(projectConfig.integrations, 'key');
            projectConfig.integrations
                .filter(function (integration) { return integration.key === 'odp'; })
                .forEach(function (integration) {
                if (integration.publicKey)
                    projectConfig.publicKeyForOdp = integration.publicKey;
                if (integration.host)
                    projectConfig.hostForOdp = integration.host;
            });
        }
        projectConfig.experimentKeyMap = keyBy(projectConfig.experiments, 'key');
        projectConfig.experimentIdMap = keyBy(projectConfig.experiments, 'id');
        projectConfig.variationIdMap = {};
        projectConfig.variationVariableUsageMap = {};
        (projectConfig.experiments || []).forEach(function (experiment) {
            // Creates { <variationKey>: <variation> } map inside of the experiment
            experiment.variationKeyMap = keyBy(experiment.variations, 'key');
            // Creates { <variationId>: { key: <variationKey>, id: <variationId> } } mapping for quick lookup
            assign(projectConfig.variationIdMap, keyBy(experiment.variations, 'id'));
            objectValues(experiment.variationKeyMap || {}).forEach(function (variation) {
                if (variation.variables) {
                    projectConfig.variationVariableUsageMap[variation.id] = keyBy(variation.variables, 'id');
                }
            });
        });
        // Object containing experiment Ids that exist in any feature
        // for checking that experiment is a feature experiment or not.
        projectConfig.experimentFeatureMap = {};
        projectConfig.featureKeyMap = keyBy(projectConfig.featureFlags || [], 'key');
        objectValues(projectConfig.featureKeyMap || {}).forEach(function (feature) {
            // Json type is represented in datafile as a subtype of string for the sake of backwards compatibility.
            // Converting it to a first-class json type while creating Project Config
            feature.variables.forEach(function (variable) {
                if (variable.type === FEATURE_VARIABLE_TYPES.STRING && variable.subType === FEATURE_VARIABLE_TYPES.JSON) {
                    variable.type = FEATURE_VARIABLE_TYPES.JSON;
                    delete variable.subType;
                }
            });
            feature.variableKeyMap = keyBy(feature.variables, 'key');
            (feature.experimentIds || []).forEach(function (experimentId) {
                // Add this experiment in experiment-feature map.
                if (projectConfig.experimentFeatureMap[experimentId]) {
                    projectConfig.experimentFeatureMap[experimentId].push(feature.id);
                }
                else {
                    projectConfig.experimentFeatureMap[experimentId] = [feature.id];
                }
            });
        });
        // all rules (experiment rules and delivery rules) for each flag
        projectConfig.flagRulesMap = {};
        (projectConfig.featureFlags || []).forEach(function (featureFlag) {
            var flagRuleExperiments = [];
            featureFlag.experimentIds.forEach(function (experimentId) {
                var experiment = projectConfig.experimentIdMap[experimentId];
                if (experiment) {
                    flagRuleExperiments.push(experiment);
                }
            });
            var rollout = projectConfig.rolloutIdMap[featureFlag.rolloutId];
            if (rollout) {
                flagRuleExperiments.push.apply(flagRuleExperiments, rollout.experiments);
            }
            projectConfig.flagRulesMap[featureFlag.key] = flagRuleExperiments;
        });
        // all variations for each flag
        // - datafile does not contain a separate entity for this.
        // - we collect variations used in each rule (experiment rules and delivery rules)
        projectConfig.flagVariationsMap = {};
        objectEntries(projectConfig.flagRulesMap || {}).forEach(function (_a) {
            var flagKey = _a[0], rules = _a[1];
            var variations = [];
            rules.forEach(function (rule) {
                rule.variations.forEach(function (variation) {
                    if (!find(variations, function (item) { return item.id === variation.id; })) {
                        variations.push(variation);
                    }
                });
            });
            projectConfig.flagVariationsMap[flagKey] = variations;
        });
        return projectConfig;
    };
    /**
     * Extract all audience segments used in this audience's conditions
     * @param  {Audience}     audience  Object representing the audience being parsed
     * @return {string[]}               List of all audience segments
     */
    var getAudienceSegments = function (audience) {
        if (!audience.conditions)
            return [];
        return getSegmentsFromConditions(audience.conditions);
    };
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    var getSegmentsFromConditions = function (condition) {
        var segments = [];
        if (isLogicalOperator(condition)) {
            return [];
        }
        else if (Array.isArray(condition)) {
            condition.forEach(function (nextCondition) { return segments.push.apply(segments, getSegmentsFromConditions(nextCondition)); });
        }
        else if (condition['match'] === 'qualified') {
            segments.push(condition['value']);
        }
        return segments;
    };
    function isLogicalOperator(condition) {
        return ['and', 'or', 'not'].includes(condition);
    }
    /**
     * Get layer ID for the provided experiment key
     * @param  {ProjectConfig}    projectConfig   Object representing project configuration
     * @param  {string}           experimentId    Experiment ID for which layer ID is to be determined
     * @return {string}                           Layer ID corresponding to the provided experiment key
     * @throws If experiment key is not in datafile
     */
    var getLayerId = function (projectConfig, experimentId) {
        var experiment = projectConfig.experimentIdMap[experimentId];
        if (!experiment) {
            throw new Error(sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, MODULE_NAME$1, experimentId));
        }
        return experiment.layerId;
    };
    /**
     * Get attribute ID for the provided attribute key
     * @param  {ProjectConfig}   projectConfig    Object representing project configuration
     * @param  {string}          attributeKey     Attribute key for which ID is to be determined
     * @param  {LogHandler}      logger
     * @return {string|null}     Attribute ID corresponding to the provided attribute key. Attribute key if it is a reserved attribute.
     */
    var getAttributeId = function (projectConfig, attributeKey, logger) {
        var attribute = projectConfig.attributeKeyMap[attributeKey];
        var hasReservedPrefix = attributeKey.indexOf(RESERVED_ATTRIBUTE_PREFIX) === 0;
        if (attribute) {
            if (hasReservedPrefix) {
                logger.log(LOG_LEVEL.WARNING, 'Attribute %s unexpectedly has reserved prefix %s; using attribute ID instead of reserved attribute name.', attributeKey, RESERVED_ATTRIBUTE_PREFIX);
            }
            return attribute.id;
        }
        else if (hasReservedPrefix) {
            return attributeKey;
        }
        logger.log(LOG_LEVEL.DEBUG, ERROR_MESSAGES.UNRECOGNIZED_ATTRIBUTE, MODULE_NAME$1, attributeKey);
        return null;
    };
    /**
     * Get event ID for the provided
     * @param  {ProjectConfig}   projectConfig  Object representing project configuration
     * @param  {string}          eventKey       Event key for which ID is to be determined
     * @return {string|null}     Event ID corresponding to the provided event key
     */
    var getEventId = function (projectConfig, eventKey) {
        var event = projectConfig.eventKeyMap[eventKey];
        if (event) {
            return event.id;
        }
        return null;
    };
    /**
     * Get experiment status for the provided experiment key
     * @param  {ProjectConfig}  projectConfig   Object representing project configuration
     * @param  {string}         experimentKey   Experiment key for which status is to be determined
     * @return {string}         Experiment status corresponding to the provided experiment key
     * @throws If experiment key is not in datafile
     */
    var getExperimentStatus = function (projectConfig, experimentKey) {
        var experiment = projectConfig.experimentKeyMap[experimentKey];
        if (!experiment) {
            throw new Error(sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME$1, experimentKey));
        }
        return experiment.status;
    };
    /**
     * Returns whether experiment has a status of 'Running'
     * @param  {ProjectConfig}  projectConfig   Object representing project configuration
     * @param  {string}         experimentKey   Experiment key for which status is to be compared with 'Running'
     * @return {boolean}                        True if experiment status is set to 'Running', false otherwise
     */
    var isActive = function (projectConfig, experimentKey) {
        return getExperimentStatus(projectConfig, experimentKey) === EXPERIMENT_RUNNING_STATUS;
    };
    /**
     * Determine for given experiment if event is running, which determines whether should be dispatched or not
     * @param  {ProjectConfig}  configObj       Object representing project configuration
     * @param  {string}         experimentKey   Experiment key for which the status is to be determined
     * @return {boolean}                        True if the experiment is running
     *                                          False if the experiment is not running
     *
     */
    var isRunning = function (projectConfig, experimentKey) {
        return getExperimentStatus(projectConfig, experimentKey) === EXPERIMENT_RUNNING_STATUS;
    };
    /**
     * Get audience conditions for the experiment
     * @param  {ProjectConfig}  projectConfig   Object representing project configuration
     * @param  {string}         experimentId    Experiment id for which audience conditions are to be determined
     * @return {Array<string|string[]>}         Audience conditions for the experiment - can be an array of audience IDs, or a
     *                                          nested array of conditions
     *                                          Examples: ["5", "6"], ["and", ["or", "1", "2"], "3"]
     * @throws If experiment key is not in datafile
     */
    var getExperimentAudienceConditions = function (projectConfig, experimentId) {
        var experiment = projectConfig.experimentIdMap[experimentId];
        if (!experiment) {
            throw new Error(sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, MODULE_NAME$1, experimentId));
        }
        return experiment.audienceConditions || experiment.audienceIds;
    };
    /**
     * Get variation key given experiment key and variation ID
     * @param  {ProjectConfig}  projectConfig   Object representing project configuration
     * @param  {string}         variationId     ID of the variation
     * @return {string|null}    Variation key or null if the variation ID is not found
     */
    var getVariationKeyFromId = function (projectConfig, variationId) {
        if (projectConfig.variationIdMap.hasOwnProperty(variationId)) {
            return projectConfig.variationIdMap[variationId].key;
        }
        return null;
    };
    /**
     * Get variation given variation ID
     * @param  {ProjectConfig}  projectConfig   Object representing project configuration
     * @param  {string}         variationId     ID of the variation
     * @return {Variation|null}    Variation or null if the variation ID is not found
     */
    var getVariationFromId = function (projectConfig, variationId) {
        if (projectConfig.variationIdMap.hasOwnProperty(variationId)) {
            return projectConfig.variationIdMap[variationId];
        }
        return null;
    };
    /**
     * Get the variation ID given the experiment key and variation key
     * @param  {ProjectConfig}  projectConfig   Object representing project configuration
     * @param  {string}         experimentKey   Key of the experiment the variation belongs to
     * @param  {string}         variationKey    The variation key
     * @return {string|null}    Variation ID or null
     */
    var getVariationIdFromExperimentAndVariationKey = function (projectConfig, experimentKey, variationKey) {
        var experiment = projectConfig.experimentKeyMap[experimentKey];
        if (experiment.variationKeyMap.hasOwnProperty(variationKey)) {
            return experiment.variationKeyMap[variationKey].id;
        }
        return null;
    };
    /**
     * Get experiment from provided experiment key
     * @param  {ProjectConfig}  projectConfig  Object representing project configuration
     * @param  {string}         experimentKey  Event key for which experiment IDs are to be retrieved
     * @return {Experiment}     Experiment
     * @throws If experiment key is not in datafile
     */
    var getExperimentFromKey = function (projectConfig, experimentKey) {
        if (projectConfig.experimentKeyMap.hasOwnProperty(experimentKey)) {
            var experiment = projectConfig.experimentKeyMap[experimentKey];
            if (experiment) {
                return experiment;
            }
        }
        throw new Error(sprintf(ERROR_MESSAGES.EXPERIMENT_KEY_NOT_IN_DATAFILE, MODULE_NAME$1, experimentKey));
    };
    /**
     * Given an experiment id, returns the traffic allocation within that experiment
     * @param  {ProjectConfig}  projectConfig  Object representing project configuration
     * @param  {string}         experimentId   Id representing the experiment
     * @return {TrafficAllocation[]}           Traffic allocation for the experiment
     * @throws If experiment key is not in datafile
     */
    var getTrafficAllocation = function (projectConfig, experimentId) {
        var experiment = projectConfig.experimentIdMap[experimentId];
        if (!experiment) {
            throw new Error(sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, MODULE_NAME$1, experimentId));
        }
        return experiment.trafficAllocation;
    };
    /**
     * Get experiment from provided experiment id. Log an error if no experiment
     * exists in the project config with the given ID.
     * @param  {ProjectConfig}  projectConfig  Object representing project configuration
     * @param  {string}         experimentId   ID of desired experiment object
     * @param  {LogHandler}     logger
     * @return {Experiment|null}               Experiment object or null
     */
    var getExperimentFromId = function (projectConfig, experimentId, logger) {
        if (projectConfig.experimentIdMap.hasOwnProperty(experimentId)) {
            var experiment = projectConfig.experimentIdMap[experimentId];
            if (experiment) {
                return experiment;
            }
        }
        logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.INVALID_EXPERIMENT_ID, MODULE_NAME$1, experimentId);
        return null;
    };
    /**
    * Returns flag variation for specified flagKey and variationKey
    * @param  {flagKey}        string
    * @param  {variationKey}   string
    * @return {Variation|null}
    */
    var getFlagVariationByKey = function (projectConfig, flagKey, variationKey) {
        if (!projectConfig) {
            return null;
        }
        var variations = projectConfig.flagVariationsMap[flagKey];
        var result = find(variations, function (item) { return item.key === variationKey; });
        if (result) {
            return result;
        }
        return null;
    };
    /**
     * Get feature from provided feature key. Log an error if no feature exists in
     * the project config with the given key.
     * @param  {ProjectConfig}    projectConfig
     * @param  {string}           featureKey
     * @param  {LogHandler}       logger
     * @return {FeatureFlag|null} Feature object, or null if no feature with the given
     *                            key exists
     */
    var getFeatureFromKey = function (projectConfig, featureKey, logger) {
        if (projectConfig.featureKeyMap.hasOwnProperty(featureKey)) {
            var feature = projectConfig.featureKeyMap[featureKey];
            if (feature) {
                return feature;
            }
        }
        logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.FEATURE_NOT_IN_DATAFILE, MODULE_NAME$1, featureKey);
        return null;
    };
    /**
     * Get the variable with the given key associated with the feature with the
     * given key. If the feature key or the variable key are invalid, log an error
     * message.
     * @param  {ProjectConfig}        projectConfig
     * @param  {string}               featureKey
     * @param  {string}               variableKey
     * @param  {LogHandler}           logger
     * @return {FeatureVariable|null} Variable object, or null one or both of the given
     * feature and variable keys are invalid
     */
    var getVariableForFeature = function (projectConfig, featureKey, variableKey, logger) {
        var feature = projectConfig.featureKeyMap[featureKey];
        if (!feature) {
            logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.FEATURE_NOT_IN_DATAFILE, MODULE_NAME$1, featureKey);
            return null;
        }
        var variable = feature.variableKeyMap[variableKey];
        if (!variable) {
            logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.VARIABLE_KEY_NOT_IN_DATAFILE, MODULE_NAME$1, variableKey, featureKey);
            return null;
        }
        return variable;
    };
    /**
     * Get the value of the given variable for the given variation. If the given
     * variable has no value for the given variation, return null. Log an error message if the variation is invalid. If the
     * variable or variation are invalid, return null.
     * @param  {ProjectConfig}     projectConfig
     * @param  {FeatureVariable}   variable
     * @param  {Variation}         variation
     * @param  {LogHandler}        logger
     * @return {string|null}       The value of the given variable for the given
     * variation, or null if the given variable has no value
     * for the given variation or if the variation or variable are invalid
     */
    var getVariableValueForVariation = function (projectConfig, variable, variation, logger) {
        if (!variable || !variation) {
            return null;
        }
        if (!projectConfig.variationVariableUsageMap.hasOwnProperty(variation.id)) {
            logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.VARIATION_ID_NOT_IN_DATAFILE_NO_EXPERIMENT, MODULE_NAME$1, variation.id);
            return null;
        }
        var variableUsages = projectConfig.variationVariableUsageMap[variation.id];
        var variableUsage = variableUsages[variable.id];
        return variableUsage ? variableUsage.value : null;
    };
    /**
     * Given a variable value in string form, try to cast it to the argument type.
     * If the type cast succeeds, return the type casted value, otherwise log an
     * error and return null.
     * @param {string}     variableValue  Variable value in string form
     * @param {string}     variableType   Type of the variable whose value was passed
     *                                    in the first argument. Must be one of
     *                                    FEATURE_VARIABLE_TYPES in
     *                                    lib/utils/enums/index.js. The return value's
     *                                    type is determined by this argument (boolean
     *                                    for BOOLEAN, number for INTEGER or DOUBLE,
     *                                    and string for STRING).
     * @param {LogHandler} logger         Logger instance
     * @returns {*}                       Variable value of the appropriate type, or
     *                                    null if the type cast failed
     */
    var getTypeCastValue = function (variableValue, variableType, logger) {
        var castValue;
        switch (variableType) {
            case FEATURE_VARIABLE_TYPES.BOOLEAN:
                if (variableValue !== 'true' && variableValue !== 'false') {
                    logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.UNABLE_TO_CAST_VALUE, MODULE_NAME$1, variableValue, variableType);
                    castValue = null;
                }
                else {
                    castValue = variableValue === 'true';
                }
                break;
            case FEATURE_VARIABLE_TYPES.INTEGER:
                castValue = parseInt(variableValue, 10);
                if (isNaN(castValue)) {
                    logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.UNABLE_TO_CAST_VALUE, MODULE_NAME$1, variableValue, variableType);
                    castValue = null;
                }
                break;
            case FEATURE_VARIABLE_TYPES.DOUBLE:
                castValue = parseFloat(variableValue);
                if (isNaN(castValue)) {
                    logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.UNABLE_TO_CAST_VALUE, MODULE_NAME$1, variableValue, variableType);
                    castValue = null;
                }
                break;
            case FEATURE_VARIABLE_TYPES.JSON:
                try {
                    castValue = JSON.parse(variableValue);
                }
                catch (e) {
                    logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.UNABLE_TO_CAST_VALUE, MODULE_NAME$1, variableValue, variableType);
                    castValue = null;
                }
                break;
            default:
                // type is STRING
                castValue = variableValue;
                break;
        }
        return castValue;
    };
    /**
     * Returns an object containing all audiences in the project config. Keys are audience IDs
     * and values are audience objects.
     * @param   {ProjectConfig}     projectConfig
     * @returns {{ [id: string]: Audience }}
     */
    var getAudiencesById = function (projectConfig) {
        return projectConfig.audiencesById;
    };
    /**
     * Returns true if an event with the given key exists in the datafile, and false otherwise
     * @param   {ProjectConfig}     projectConfig
     * @param   {string}            eventKey
     * @returns {boolean}
     */
    var eventWithKeyExists = function (projectConfig, eventKey) {
        return projectConfig.eventKeyMap.hasOwnProperty(eventKey);
    };
    /**
     * Returns true if experiment belongs to any feature, false otherwise.
     * @param   {ProjectConfig}       projectConfig
     * @param   {string}              experimentId
     * @returns {boolean}
     */
    var isFeatureExperiment = function (projectConfig, experimentId) {
        return projectConfig.experimentFeatureMap.hasOwnProperty(experimentId);
    };
    /**
     * Returns the JSON string representation of the datafile
     * @param   {ProjectConfig}       projectConfig
     * @returns {string}
     */
    var toDatafile = function (projectConfig) {
        return projectConfig.__datafileStr;
    };
    /**
     * @typedef   {Object}
     * @property  {Object|null} configObj
     * @property  {Error|null}  error
     */
    /**
     * Try to create a project config object from the given datafile and
     * configuration properties.
     * Returns an object with configObj and error properties.
     * If successful, configObj is the project config object, and error is null.
     * Otherwise, configObj is null and error is an error with more information.
     * @param   {Object}         config
     * @param   {Object|string}  config.datafile
     * @param   {Object}         config.jsonSchemaValidator
     * @param   {Object}         config.logger
     * @returns {Object}         Object containing configObj and error properties
     */
    var tryCreatingProjectConfig = function (config) {
        var newDatafileObj;
        try {
            newDatafileObj = configValidator.validateDatafile(config.datafile);
        }
        catch (error) {
            return { configObj: null, error: error };
        }
        if (config.jsonSchemaValidator) {
            try {
                config.jsonSchemaValidator.validate(newDatafileObj);
                config.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.VALID_DATAFILE, MODULE_NAME$1);
            }
            catch (error) {
                return { configObj: null, error: error };
            }
        }
        else {
            config.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.SKIPPING_JSON_VALIDATION, MODULE_NAME$1);
        }
        var createProjectConfigArgs = [newDatafileObj];
        if (typeof config.datafile === 'string') {
            // Since config.datafile was validated above, we know that it is a valid JSON string
            createProjectConfigArgs.push(config.datafile);
        }
        var newConfigObj = createProjectConfig.apply(void 0, createProjectConfigArgs);
        return {
            configObj: newConfigObj,
            error: null,
        };
    };
    /**
     * Get the send flag decisions value
     * @param  {ProjectConfig}   projectConfig
     * @return {boolean}         A boolean value that indicates if we should send flag decisions
     */
    var getSendFlagDecisionsValue = function (projectConfig) {
        return !!projectConfig.sendFlagDecisions;
    };

    /**
     * Copyright 2019-2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var logger$5 = getLogger();
    var MODULE_NAME$2 = 'PROJECT_CONFIG_MANAGER';
    /**
     * Return an error message derived from a thrown value. If the thrown value is
     * an error, return the error's message property. Otherwise, return a default
     * provided by the second argument.
     * @param  {Error|null}                   maybeError
     * @param  {string}                       defaultMessage
     * @return {string}
     */
    function getErrorMessage(maybeError, defaultMessage) {
        if (maybeError instanceof Error) {
            return maybeError.message;
        }
        return defaultMessage || 'Unknown error';
    }
    /**
     * ProjectConfigManager provides project config objects via its methods
     * getConfig and onUpdate. It uses a DatafileManager to fetch datafiles. It is
     * responsible for parsing and validating datafiles, and converting datafile
     * string into project config objects.
     * @param {ProjectConfigManagerConfig}    config
     */
    var ProjectConfigManager = /** @class */ (function () {
        function ProjectConfigManager(config) {
            this.updateListeners = [];
            this.configObj = null;
            this.optimizelyConfigObj = null;
            this.datafileManager = null;
            try {
                this.jsonSchemaValidator = config.jsonSchemaValidator;
                if (!config.datafile && !config.sdkKey) {
                    var datafileAndSdkKeyMissingError = new Error(sprintf(ERROR_MESSAGES.DATAFILE_AND_SDK_KEY_MISSING, MODULE_NAME$2));
                    this.readyPromise = Promise.resolve({
                        success: false,
                        reason: getErrorMessage(datafileAndSdkKeyMissingError),
                    });
                    logger$5.error(datafileAndSdkKeyMissingError);
                    return;
                }
                var handleNewDatafileException = null;
                if (config.datafile) {
                    handleNewDatafileException = this.handleNewDatafile(config.datafile);
                }
                if (config.sdkKey && config.datafileManager) {
                    this.datafileManager = config.datafileManager;
                    this.datafileManager.start();
                    this.readyPromise = this.datafileManager
                        .onReady()
                        .then(this.onDatafileManagerReadyFulfill.bind(this), this.onDatafileManagerReadyReject.bind(this));
                    this.datafileManager.on('update', this.onDatafileManagerUpdate.bind(this));
                }
                else if (this.configObj) {
                    this.readyPromise = Promise.resolve({
                        success: true,
                    });
                }
                else {
                    this.readyPromise = Promise.resolve({
                        success: false,
                        reason: getErrorMessage(handleNewDatafileException, 'Invalid datafile'),
                    });
                }
            }
            catch (ex) {
                logger$5.error(ex);
                this.readyPromise = Promise.resolve({
                    success: false,
                    reason: getErrorMessage(ex, 'Error in initialize'),
                });
            }
        }
        /**
         * Respond to datafile manager's onReady promise becoming fulfilled.
         * If there are validation or parse failures using the datafile provided by
         * DatafileManager, ProjectConfigManager's ready promise is resolved with an
         * unsuccessful result. Otherwise, ProjectConfigManager updates its own project
         * config object from the new datafile, and its ready promise is resolved with a
         * successful result.
         */
        ProjectConfigManager.prototype.onDatafileManagerReadyFulfill = function () {
            if (this.datafileManager) {
                var newDatafileError = this.handleNewDatafile(this.datafileManager.get());
                if (newDatafileError) {
                    return {
                        success: false,
                        reason: getErrorMessage(newDatafileError),
                    };
                }
                return { success: true };
            }
            return {
                success: false,
                reason: getErrorMessage(null, 'Datafile manager is not provided'),
            };
        };
        /**
         * Respond to datafile manager's onReady promise becoming rejected.
         * When DatafileManager's onReady promise is rejected, there is no possibility
         * of obtaining a datafile. In this case, ProjectConfigManager's ready promise
         * is fulfilled with an unsuccessful result.
         * @param   {Error}   err
         * @returns {Object}
         */
        ProjectConfigManager.prototype.onDatafileManagerReadyReject = function (err) {
            return {
                success: false,
                reason: getErrorMessage(err, 'Failed to become ready'),
            };
        };
        /**
         * Respond to datafile manager's update event. Attempt to update own config
         * object using latest datafile from datafile manager. Call own registered
         * update listeners if successful
         */
        ProjectConfigManager.prototype.onDatafileManagerUpdate = function () {
            if (this.datafileManager) {
                this.handleNewDatafile(this.datafileManager.get());
            }
        };
        /**
         * Handle new datafile by attemping to create a new Project Config object. If successful and
         * the new config object's revision is newer than the current one, sets/updates the project config
         * and optimizely config object instance variables and returns null for the error. If unsuccessful,
         * the project config and optimizely config objects will not be updated, and the error is returned.
         * @param   {string | object}        newDatafile
         * @returns {Error|null}    error or null
         */
        // TODO[OASIS-6649]: Don't use object type
        // eslint-disable-next-line  @typescript-eslint/ban-types
        ProjectConfigManager.prototype.handleNewDatafile = function (newDatafile) {
            var _a = tryCreatingProjectConfig({
                datafile: newDatafile,
                jsonSchemaValidator: this.jsonSchemaValidator,
                logger: logger$5
            }), configObj = _a.configObj, error = _a.error;
            if (error) {
                logger$5.error(error);
            }
            else {
                var oldRevision = this.configObj ? this.configObj.revision : 'null';
                if (configObj && oldRevision !== configObj.revision) {
                    this.configObj = configObj;
                    this.optimizelyConfigObj = null;
                    this.updateListeners.forEach(function (listener) { return listener(configObj); });
                }
            }
            return error;
        };
        /**
         * Returns the current project config object, or null if no project config object
         * is available
         * @return {ProjectConfig|null}
         */
        ProjectConfigManager.prototype.getConfig = function () {
            return this.configObj;
        };
        /**
         * Returns the optimizely config object or null
         * @return {OptimizelyConfig|null}
         */
        ProjectConfigManager.prototype.getOptimizelyConfig = function () {
            if (!this.optimizelyConfigObj && this.configObj) {
                this.optimizelyConfigObj = createOptimizelyConfig(this.configObj, toDatafile(this.configObj));
            }
            return this.optimizelyConfigObj;
        };
        /**
         * Returns a Promise that fulfills when this ProjectConfigManager is ready to
         * use (meaning it has a valid project config object), or has failed to become
         * ready.
         *
         * Failure can be caused by the following:
         * - At least one of sdkKey or datafile is not provided in the constructor argument
         * - The provided datafile was invalid
         * - The datafile provided by the datafile manager was invalid
         * - The datafile manager failed to fetch a datafile
         *
         * The returned Promise is fulfilled with a result object containing these
         * properties:
         *    - success (boolean): True if this instance is ready to use with a valid
         *                         project config object, or false if it failed to
         *                         become ready
         *    - reason (string=):  If success is false, this is a string property with
         *                         an explanatory message.
         * @return {Promise}
         */
        ProjectConfigManager.prototype.onReady = function () {
            return this.readyPromise;
        };
        /**
         * Add a listener for project config updates. The listener will be called
         * whenever this instance has a new project config object available.
         * Returns a dispose function that removes the subscription
         * @param  {Function} listener
         * @return {Function}
         */
        ProjectConfigManager.prototype.onUpdate = function (listener) {
            var _this = this;
            this.updateListeners.push(listener);
            return function () {
                var index = _this.updateListeners.indexOf(listener);
                if (index > -1) {
                    _this.updateListeners.splice(index, 1);
                }
            };
        };
        /**
         * Stop the internal datafile manager and remove all update listeners
         */
        ProjectConfigManager.prototype.stop = function () {
            if (this.datafileManager) {
                this.datafileManager.stop();
            }
            this.updateListeners = [];
        };
        return ProjectConfigManager;
    }());
    function createProjectConfigManager(config) {
        return new ProjectConfigManager(config);
    }

    /**
     * Copyright 2016, 2019-2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var HASH_SEED = 1;
    var MAX_HASH_VALUE = Math.pow(2, 32);
    var MAX_TRAFFIC_VALUE = 10000;
    var MODULE_NAME$3 = 'BUCKETER';
    var RANDOM_POLICY = 'random';
    /**
     * Determines ID of variation to be shown for the given input params
     * @param  {Object}             bucketerParams
     * @param  {string}             bucketerParams.experimentId
     * @param  {string}             bucketerParams.experimentKey
     * @param  {string}             bucketerParams.userId
     * @param  {Object[]}           bucketerParams.trafficAllocationConfig
     * @param  {Array}              bucketerParams.experimentKeyMap
     * @param  {Object}             bucketerParams.groupIdMap
     * @param  {Object}             bucketerParams.variationIdMap
     * @param  {string}             bucketerParams.varationIdMap[].key
     * @param  {Object}             bucketerParams.logger
     * @param  {string}             bucketerParams.bucketingId
     * @return {Object}             DecisionResponse                         DecisionResponse containing variation ID that user has been bucketed into,
     *                                                                       null if user is not bucketed into any experiment and the decide reasons.
     */
    var bucket = function (bucketerParams) {
        var decideReasons = [];
        // Check if user is in a random group; if so, check if user is bucketed into a specific experiment
        var experiment = bucketerParams.experimentIdMap[bucketerParams.experimentId];
        var groupId = experiment['groupId'];
        if (groupId) {
            var group = bucketerParams.groupIdMap[groupId];
            if (!group) {
                throw new Error(sprintf(ERROR_MESSAGES.INVALID_GROUP_ID, MODULE_NAME$3, groupId));
            }
            if (group.policy === RANDOM_POLICY) {
                var bucketedExperimentId = bucketUserIntoExperiment(group, bucketerParams.bucketingId, bucketerParams.userId, bucketerParams.logger);
                // Return if user is not bucketed into any experiment
                if (bucketedExperimentId === null) {
                    bucketerParams.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_NOT_IN_ANY_EXPERIMENT, MODULE_NAME$3, bucketerParams.userId, groupId);
                    decideReasons.push([
                        LOG_MESSAGES.USER_NOT_IN_ANY_EXPERIMENT,
                        MODULE_NAME$3,
                        bucketerParams.userId,
                        groupId,
                    ]);
                    return {
                        result: null,
                        reasons: decideReasons,
                    };
                }
                // Return if user is bucketed into a different experiment than the one specified
                if (bucketedExperimentId !== bucketerParams.experimentId) {
                    bucketerParams.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP, MODULE_NAME$3, bucketerParams.userId, bucketerParams.experimentKey, groupId);
                    decideReasons.push([
                        LOG_MESSAGES.USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
                        MODULE_NAME$3,
                        bucketerParams.userId,
                        bucketerParams.experimentKey,
                        groupId,
                    ]);
                    return {
                        result: null,
                        reasons: decideReasons,
                    };
                }
                // Continue bucketing if user is bucketed into specified experiment      
                bucketerParams.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP, MODULE_NAME$3, bucketerParams.userId, bucketerParams.experimentKey, groupId);
                decideReasons.push([
                    LOG_MESSAGES.USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
                    MODULE_NAME$3,
                    bucketerParams.userId,
                    bucketerParams.experimentKey,
                    groupId,
                ]);
            }
        }
        var bucketingId = "".concat(bucketerParams.bucketingId).concat(bucketerParams.experimentId);
        var bucketValue = _generateBucketValue(bucketingId);
        bucketerParams.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, MODULE_NAME$3, bucketValue, bucketerParams.userId);
        decideReasons.push([
            LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET,
            MODULE_NAME$3,
            bucketValue,
            bucketerParams.userId,
        ]);
        var entityId = _findBucket(bucketValue, bucketerParams.trafficAllocationConfig);
        if (entityId !== null) {
            if (!bucketerParams.variationIdMap[entityId]) {
                if (entityId) {
                    bucketerParams.logger.log(LOG_LEVEL.WARNING, LOG_MESSAGES.INVALID_VARIATION_ID, MODULE_NAME$3);
                    decideReasons.push([LOG_MESSAGES.INVALID_VARIATION_ID, MODULE_NAME$3]);
                }
                return {
                    result: null,
                    reasons: decideReasons,
                };
            }
        }
        return {
            result: entityId,
            reasons: decideReasons,
        };
    };
    /**
     * Returns bucketed experiment ID to compare against experiment user is being called into
     * @param  {Group}       group        Group that experiment is in
     * @param  {string}      bucketingId  Bucketing ID
     * @param  {string}      userId       ID of user to be bucketed into experiment
     * @param  {LogHandler}  logger       Logger implementation
     * @return {string|null}              ID of experiment if user is bucketed into experiment within the group, null otherwise
     */
    var bucketUserIntoExperiment = function (group, bucketingId, userId, logger) {
        var bucketingKey = "".concat(bucketingId).concat(group.id);
        var bucketValue = _generateBucketValue(bucketingKey);
        logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, MODULE_NAME$3, bucketValue, userId);
        var trafficAllocationConfig = group.trafficAllocation;
        var bucketedExperimentId = _findBucket(bucketValue, trafficAllocationConfig);
        return bucketedExperimentId;
    };
    /**
     * Returns entity ID associated with bucket value
     * @param  {number}                bucketValue
     * @param  {TrafficAllocation[]}   trafficAllocationConfig
     * @param  {number}                trafficAllocationConfig[].endOfRange
     * @param  {string}                trafficAllocationConfig[].entityId
     * @return {string|null}           Entity ID for bucketing if bucket value is within traffic allocation boundaries, null otherwise
     */
    var _findBucket = function (bucketValue, trafficAllocationConfig) {
        for (var i = 0; i < trafficAllocationConfig.length; i++) {
            if (bucketValue < trafficAllocationConfig[i].endOfRange) {
                return trafficAllocationConfig[i].entityId;
            }
        }
        return null;
    };
    /**
     * Helper function to generate bucket value in half-closed interval [0, MAX_TRAFFIC_VALUE)
     * @param  {string}               bucketingKey          String value for bucketing
     * @return {number}               The generated bucket value
     * @throws                        If bucketing value is not a valid string
     */
    var _generateBucketValue = function (bucketingKey) {
        try {
            // NOTE: the mmh library already does cast the hash value as an unsigned 32bit int
            // https://github.com/perezd/node-murmurhash/blob/master/murmurhash.js#L115
            var hashValue = murmurhash.v3(bucketingKey, HASH_SEED);
            var ratio = hashValue / MAX_HASH_VALUE;
            return Math.floor(ratio * MAX_TRAFFIC_VALUE);
        }
        catch (ex) {
            throw new Error(sprintf(ERROR_MESSAGES.INVALID_BUCKETING_ID, MODULE_NAME$3, bucketingKey, ex.message));
        }
    };

    /**
     * Copyright 2020, 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var MODULE_NAME$4 = 'SEMANTIC VERSION';
    var logger$6 = getLogger();
    /**
     * Evaluate if provided string is number only
     * @param  {unknown}  content
     * @return {boolean}  true if the string is number only
     *
     */
    function isNumber$1(content) {
        return /^\d+$/.test(content);
    }
    /**
     * Evaluate if provided version contains pre-release "-"
     * @param  {unknown}  version
     * @return {boolean}  true if the version contains "-" and meets condition
     *
     */
    function isPreReleaseVersion(version) {
        var preReleaseIndex = version.indexOf("-" /* VERSION_TYPE.PRE_RELEASE_VERSION_DELIMITER */);
        var buildIndex = version.indexOf("+" /* VERSION_TYPE.BUILD_VERSION_DELIMITER */);
        if (preReleaseIndex < 0) {
            return false;
        }
        if (buildIndex < 0) {
            return true;
        }
        return preReleaseIndex < buildIndex;
    }
    /**
     * Evaluate if provided version contains build "+"
     * @param  {unknown}  version
     * @return {boolean}  true if the version contains "+" and meets condition
     *
     */
    function isBuildVersion(version) {
        var preReleaseIndex = version.indexOf("-" /* VERSION_TYPE.PRE_RELEASE_VERSION_DELIMITER */);
        var buildIndex = version.indexOf("+" /* VERSION_TYPE.BUILD_VERSION_DELIMITER */);
        if (buildIndex < 0) {
            return false;
        }
        if (preReleaseIndex < 0) {
            return true;
        }
        return buildIndex < preReleaseIndex;
    }
    /**
     * check if there is any white spaces " " in version
     * @param  {unknown}  version
     * @return {boolean}  true if the version contains " "
     *
     */
    function hasWhiteSpaces(version) {
        return /\s/.test(version);
    }
    /**
     * split version in parts
     * @param  {unknown}  version
     * @return {boolean}  The array of version split into smaller parts i.e major, minor, patch etc
     *                    null if given version is in invalid format
     */
    function splitVersion(version) {
        var targetPrefix = version;
        var targetSuffix = '';
        // check that version shouldn't have white space
        if (hasWhiteSpaces(version)) {
            logger$6.warn(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME$4, version);
            return null;
        }
        //check for pre release e.g. 1.0.0-alpha where 'alpha' is a pre release
        //otherwise check for build e.g. 1.0.0+001 where 001 is a build metadata
        if (isPreReleaseVersion(version)) {
            targetPrefix = version.substring(0, version.indexOf("-" /* VERSION_TYPE.PRE_RELEASE_VERSION_DELIMITER */));
            targetSuffix = version.substring(version.indexOf("-" /* VERSION_TYPE.PRE_RELEASE_VERSION_DELIMITER */) + 1);
        }
        else if (isBuildVersion(version)) {
            targetPrefix = version.substring(0, version.indexOf("+" /* VERSION_TYPE.BUILD_VERSION_DELIMITER */));
            targetSuffix = version.substring(version.indexOf("+" /* VERSION_TYPE.BUILD_VERSION_DELIMITER */) + 1);
        }
        // check dot counts in target_prefix
        if (typeof targetPrefix !== 'string' || typeof targetSuffix !== 'string') {
            return null;
        }
        var dotCount = targetPrefix.split('.').length - 1;
        if (dotCount > 2) {
            logger$6.warn(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME$4, version);
            return null;
        }
        var targetVersionParts = targetPrefix.split('.');
        if (targetVersionParts.length != dotCount + 1) {
            logger$6.warn(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME$4, version);
            return null;
        }
        for (var _i = 0, targetVersionParts_1 = targetVersionParts; _i < targetVersionParts_1.length; _i++) {
            var part = targetVersionParts_1[_i];
            if (!isNumber$1(part)) {
                logger$6.warn(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME$4, version);
                return null;
            }
        }
        if (targetSuffix) {
            targetVersionParts.push(targetSuffix);
        }
        return targetVersionParts;
    }
    /**
     * Compare user version with condition version
     * @param  {string}  conditionsVersion
     * @param  {string}  userProvidedVersion
     * @return {number | null}  0 if user version is equal to condition version
     *                          1 if user version is greater than condition version
     *                         -1 if user version is less than condition version
     *                          null if invalid user or condition version is provided
     */
    function compareVersion(conditionsVersion, userProvidedVersion) {
        var userVersionParts = splitVersion(userProvidedVersion);
        var conditionsVersionParts = splitVersion(conditionsVersion);
        if (!userVersionParts || !conditionsVersionParts) {
            return null;
        }
        var userVersionPartsLen = userVersionParts.length;
        for (var idx = 0; idx < conditionsVersionParts.length; idx++) {
            if (userVersionPartsLen <= idx) {
                return isPreReleaseVersion(conditionsVersion) || isBuildVersion(conditionsVersion) ? 1 : -1;
            }
            else if (!isNumber$1(userVersionParts[idx])) {
                if (userVersionParts[idx] < conditionsVersionParts[idx]) {
                    return isPreReleaseVersion(conditionsVersion) && !isPreReleaseVersion(userProvidedVersion) ? 1 : -1;
                }
                else if (userVersionParts[idx] > conditionsVersionParts[idx]) {
                    return !isPreReleaseVersion(conditionsVersion) && isPreReleaseVersion(userProvidedVersion) ? -1 : 1;
                }
            }
            else {
                var userVersionPart = parseInt(userVersionParts[idx]);
                var conditionsVersionPart = parseInt(conditionsVersionParts[idx]);
                if (userVersionPart > conditionsVersionPart) {
                    return 1;
                }
                else if (userVersionPart < conditionsVersionPart) {
                    return -1;
                }
            }
        }
        // check if user version contains release and target version does not
        if (isPreReleaseVersion(userProvidedVersion) && !isPreReleaseVersion(conditionsVersion)) {
            return -1;
        }
        return 0;
    }

    /****************************************************************************
     * Copyright 2018-2019, 2020, 2022, Optimizely, Inc. and contributors              *
     *                                                                          *
     * Licensed under the Apache License, Version 2.0 (the "License");          *
     * you may not use this file except in compliance with the License.         *
     * You may obtain a copy of the License at                                  *
     *                                                                          *
     *    http://www.apache.org/licenses/LICENSE-2.0                            *
     *                                                                          *
     * Unless required by applicable law or agreed to in writing, software      *
     * distributed under the License is distributed on an "AS IS" BASIS,        *
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
     * See the License for the specific language governing permissions and      *
     * limitations under the License.                                           *
     ***************************************************************************/
    var MODULE_NAME$5 = 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR';
    var logger$7 = getLogger();
    var EXACT_MATCH_TYPE = 'exact';
    var EXISTS_MATCH_TYPE = 'exists';
    var GREATER_OR_EQUAL_THAN_MATCH_TYPE = 'ge';
    var GREATER_THAN_MATCH_TYPE = 'gt';
    var LESS_OR_EQUAL_THAN_MATCH_TYPE = 'le';
    var LESS_THAN_MATCH_TYPE = 'lt';
    var SEMVER_EXACT_MATCH_TYPE = 'semver_eq';
    var SEMVER_GREATER_OR_EQUAL_THAN_MATCH_TYPE = 'semver_ge';
    var SEMVER_GREATER_THAN_MATCH_TYPE = 'semver_gt';
    var SEMVER_LESS_OR_EQUAL_THAN_MATCH_TYPE = 'semver_le';
    var SEMVER_LESS_THAN_MATCH_TYPE = 'semver_lt';
    var SUBSTRING_MATCH_TYPE = 'substring';
    var MATCH_TYPES = [
        EXACT_MATCH_TYPE,
        EXISTS_MATCH_TYPE,
        GREATER_THAN_MATCH_TYPE,
        GREATER_OR_EQUAL_THAN_MATCH_TYPE,
        LESS_THAN_MATCH_TYPE,
        LESS_OR_EQUAL_THAN_MATCH_TYPE,
        SUBSTRING_MATCH_TYPE,
        SEMVER_EXACT_MATCH_TYPE,
        SEMVER_LESS_THAN_MATCH_TYPE,
        SEMVER_LESS_OR_EQUAL_THAN_MATCH_TYPE,
        SEMVER_GREATER_THAN_MATCH_TYPE,
        SEMVER_GREATER_OR_EQUAL_THAN_MATCH_TYPE
    ];
    var EVALUATORS_BY_MATCH_TYPE = {};
    EVALUATORS_BY_MATCH_TYPE[EXACT_MATCH_TYPE] = exactEvaluator;
    EVALUATORS_BY_MATCH_TYPE[EXISTS_MATCH_TYPE] = existsEvaluator;
    EVALUATORS_BY_MATCH_TYPE[GREATER_THAN_MATCH_TYPE] = greaterThanEvaluator;
    EVALUATORS_BY_MATCH_TYPE[GREATER_OR_EQUAL_THAN_MATCH_TYPE] = greaterThanOrEqualEvaluator;
    EVALUATORS_BY_MATCH_TYPE[LESS_THAN_MATCH_TYPE] = lessThanEvaluator;
    EVALUATORS_BY_MATCH_TYPE[LESS_OR_EQUAL_THAN_MATCH_TYPE] = lessThanOrEqualEvaluator;
    EVALUATORS_BY_MATCH_TYPE[SUBSTRING_MATCH_TYPE] = substringEvaluator;
    EVALUATORS_BY_MATCH_TYPE[SEMVER_EXACT_MATCH_TYPE] = semverEqualEvaluator;
    EVALUATORS_BY_MATCH_TYPE[SEMVER_GREATER_THAN_MATCH_TYPE] = semverGreaterThanEvaluator;
    EVALUATORS_BY_MATCH_TYPE[SEMVER_GREATER_OR_EQUAL_THAN_MATCH_TYPE] = semverGreaterThanOrEqualEvaluator;
    EVALUATORS_BY_MATCH_TYPE[SEMVER_LESS_THAN_MATCH_TYPE] = semverLessThanEvaluator;
    EVALUATORS_BY_MATCH_TYPE[SEMVER_LESS_OR_EQUAL_THAN_MATCH_TYPE] = semverLessThanOrEqualEvaluator;
    /**
     * Given a custom attribute audience condition and user attributes, evaluate the
     * condition against the attributes.
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @return {?boolean}               true/false if the given user attributes match/don't match the given condition,
     *                                  null if the given user attributes and condition can't be evaluated
     * TODO: Change to accept and object with named properties
     */
    function evaluate$1(condition, user) {
        var userAttributes = user.getAttributes();
        var conditionMatch = condition.match;
        if (typeof conditionMatch !== 'undefined' && MATCH_TYPES.indexOf(conditionMatch) === -1) {
            logger$7.warn(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME$5, JSON.stringify(condition));
            return null;
        }
        var attributeKey = condition.name;
        if (!userAttributes.hasOwnProperty(attributeKey) && conditionMatch != EXISTS_MATCH_TYPE) {
            logger$7.debug(LOG_MESSAGES.MISSING_ATTRIBUTE_VALUE, MODULE_NAME$5, JSON.stringify(condition), attributeKey);
            return null;
        }
        var evaluatorForMatch;
        if (!conditionMatch) {
            evaluatorForMatch = exactEvaluator;
        }
        else {
            evaluatorForMatch = EVALUATORS_BY_MATCH_TYPE[conditionMatch] || exactEvaluator;
        }
        return evaluatorForMatch(condition, user);
    }
    /**
     * Returns true if the value is valid for exact conditions. Valid values include
     * strings, booleans, and numbers that aren't NaN, -Infinity, or Infinity.
     * @param value
     * @returns {boolean}
     */
    function isValueTypeValidForExactConditions(value) {
        return typeof value === 'string' || typeof value === 'boolean' || fns.isNumber(value);
    }
    /**
     * Evaluate the given exact match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @return  {?boolean}              true if the user attribute value is equal (===) to the condition value,
     *                                  false if the user attribute value is not equal (!==) to the condition value,
     *                                  null if the condition value or user attribute value has an invalid type, or
     *                                  if there is a mismatch between the user attribute type and the condition value
     *                                  type
     */
    function exactEvaluator(condition, user) {
        var userAttributes = user.getAttributes();
        var conditionValue = condition.value;
        var conditionValueType = typeof conditionValue;
        var conditionName = condition.name;
        var userValue = userAttributes[conditionName];
        var userValueType = typeof userValue;
        if (!isValueTypeValidForExactConditions(conditionValue) ||
            (fns.isNumber(conditionValue) && !fns.isSafeInteger(conditionValue))) {
            logger$7.warn(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME$5, JSON.stringify(condition));
            return null;
        }
        if (userValue === null) {
            logger$7.debug(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME$5, JSON.stringify(condition), conditionName);
            return null;
        }
        if (!isValueTypeValidForExactConditions(userValue) || conditionValueType !== userValueType) {
            logger$7.warn(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME$5, JSON.stringify(condition), userValueType, conditionName);
            return null;
        }
        if (fns.isNumber(userValue) && !fns.isSafeInteger(userValue)) {
            logger$7.warn(LOG_MESSAGES.OUT_OF_BOUNDS, MODULE_NAME$5, JSON.stringify(condition), conditionName);
            return null;
        }
        return conditionValue === userValue;
    }
    /**
     * Evaluate the given exists match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {boolean}               true if both:
     *                                    1) the user attributes have a value for the given condition, and
     *                                    2) the user attribute value is neither null nor undefined
     *                                  Returns false otherwise
     */
    function existsEvaluator(condition, user) {
        var userAttributes = user.getAttributes();
        var userValue = userAttributes[condition.name];
        return typeof userValue !== 'undefined' && userValue !== null;
    }
    /**
     * Validate user and condition values
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?boolean}              true if values are valid,
     *                                  false if values are not valid
     */
    function validateValuesForNumericCondition(condition, user) {
        var userAttributes = user.getAttributes();
        var conditionName = condition.name;
        var userValue = userAttributes[conditionName];
        var userValueType = typeof userValue;
        var conditionValue = condition.value;
        if (conditionValue === null || !fns.isSafeInteger(conditionValue)) {
            logger$7.warn(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME$5, JSON.stringify(condition));
            return false;
        }
        if (userValue === null) {
            logger$7.debug(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME$5, JSON.stringify(condition), conditionName);
            return false;
        }
        if (!fns.isNumber(userValue)) {
            logger$7.warn(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME$5, JSON.stringify(condition), userValueType, conditionName);
            return false;
        }
        if (!fns.isSafeInteger(userValue)) {
            logger$7.warn(LOG_MESSAGES.OUT_OF_BOUNDS, MODULE_NAME$5, JSON.stringify(condition), conditionName);
            return false;
        }
        return true;
    }
    /**
     * Evaluate the given greater than match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?boolean}              true if the user attribute value is greater than the condition value,
     *                                  false if the user attribute value is less than or equal to the condition value,
     *                                  null if the condition value isn't a number or the user attribute value
     *                                  isn't a number
     */
    function greaterThanEvaluator(condition, user) {
        var userAttributes = user.getAttributes();
        var userValue = userAttributes[condition.name];
        var conditionValue = condition.value;
        if (!validateValuesForNumericCondition(condition, user) || conditionValue === null) {
            return null;
        }
        return userValue > conditionValue;
    }
    /**
     * Evaluate the given greater or equal than match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?Boolean}              true if the user attribute value is greater or equal than the condition value,
     *                                  false if the user attribute value is less than to the condition value,
     *                                  null if the condition value isn't a number or the user attribute value isn't a
     *                                  number
     */
    function greaterThanOrEqualEvaluator(condition, user) {
        var userAttributes = user.getAttributes();
        var userValue = userAttributes[condition.name];
        var conditionValue = condition.value;
        if (!validateValuesForNumericCondition(condition, user) || conditionValue === null) {
            return null;
        }
        return userValue >= conditionValue;
    }
    /**
     * Evaluate the given less than match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?boolean}              true if the user attribute value is less than the condition value,
     *                                  false if the user attribute value is greater than or equal to the condition value,
     *                                  null if the condition value isn't a number or the user attribute value isn't a
     *                                  number
     */
    function lessThanEvaluator(condition, user) {
        var userAttributes = user.getAttributes();
        var userValue = userAttributes[condition.name];
        var conditionValue = condition.value;
        if (!validateValuesForNumericCondition(condition, user) || conditionValue === null) {
            return null;
        }
        return userValue < conditionValue;
    }
    /**
     * Evaluate the given less or equal than match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?Boolean}              true if the user attribute value is less or equal than the condition value,
     *                                  false if the user attribute value is greater than to the condition value,
     *                                  null if the condition value isn't a number or the user attribute value isn't a
     *                                  number
     */
    function lessThanOrEqualEvaluator(condition, user) {
        var userAttributes = user.getAttributes();
        var userValue = userAttributes[condition.name];
        var conditionValue = condition.value;
        if (!validateValuesForNumericCondition(condition, user) || conditionValue === null) {
            return null;
        }
        return userValue <= conditionValue;
    }
    /**
     * Evaluate the given substring match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?Boolean}              true if the condition value is a substring of the user attribute value,
     *                                  false if the condition value is not a substring of the user attribute value,
     *                                  null if the condition value isn't a string or the user attribute value
     *                                  isn't a string
     */
    function substringEvaluator(condition, user) {
        var userAttributes = user.getAttributes();
        var conditionName = condition.name;
        var userValue = userAttributes[condition.name];
        var userValueType = typeof userValue;
        var conditionValue = condition.value;
        if (typeof conditionValue !== 'string') {
            logger$7.warn(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME$5, JSON.stringify(condition));
            return null;
        }
        if (userValue === null) {
            logger$7.debug(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME$5, JSON.stringify(condition), conditionName);
            return null;
        }
        if (typeof userValue !== 'string') {
            logger$7.warn(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME$5, JSON.stringify(condition), userValueType, conditionName);
            return null;
        }
        return userValue.indexOf(conditionValue) !== -1;
    }
    /**
     * Evaluate the given semantic version match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?number}               returns compareVersion result
     *                                  null if the user attribute version has an invalid type
     */
    function evaluateSemanticVersion(condition, user) {
        var userAttributes = user.getAttributes();
        var conditionName = condition.name;
        var userValue = userAttributes[conditionName];
        var userValueType = typeof userValue;
        var conditionValue = condition.value;
        if (typeof conditionValue !== 'string') {
            logger$7.warn(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME$5, JSON.stringify(condition));
            return null;
        }
        if (userValue === null) {
            logger$7.debug(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME$5, JSON.stringify(condition), conditionName);
            return null;
        }
        if (typeof userValue !== 'string') {
            logger$7.warn(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME$5, JSON.stringify(condition), userValueType, conditionName);
            return null;
        }
        return compareVersion(conditionValue, userValue);
    }
    /**
     * Evaluate the given version match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?Boolean}              true if the user attribute version is equal (===) to the condition version,
     *                                  false if the user attribute version is not equal (!==) to the condition version,
     *                                  null if the user attribute version has an invalid type
     */
    function semverEqualEvaluator(condition, user) {
        var result = evaluateSemanticVersion(condition, user);
        if (result === null) {
            return null;
        }
        return result === 0;
    }
    /**
     * Evaluate the given version match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?Boolean}              true if the user attribute version is greater (>) than the condition version,
     *                                  false if the user attribute version is not greater than the condition version,
     *                                  null if the user attribute version has an invalid type
     */
    function semverGreaterThanEvaluator(condition, user) {
        var result = evaluateSemanticVersion(condition, user);
        if (result === null) {
            return null;
        }
        return result > 0;
    }
    /**
     * Evaluate the given version match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?Boolean}              true if the user attribute version is less (<) than the condition version,
     *                                  false if the user attribute version is not less than the condition version,
     *                                  null if the user attribute version has an invalid type
     */
    function semverLessThanEvaluator(condition, user) {
        var result = evaluateSemanticVersion(condition, user);
        if (result === null) {
            return null;
        }
        return result < 0;
    }
    /**
     * Evaluate the given version match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?Boolean}              true if the user attribute version is greater than or equal (>=) to the condition version,
     *                                  false if the user attribute version is not greater than or equal to the condition version,
     *                                  null if the user attribute version has an invalid type
     */
    function semverGreaterThanOrEqualEvaluator(condition, user) {
        var result = evaluateSemanticVersion(condition, user);
        if (result === null) {
            return null;
        }
        return result >= 0;
    }
    /**
     * Evaluate the given version match condition for the given user attributes
     * @param  {Condition}              condition
     * @param  {OptimizelyUserContext}  user
     * @returns {?Boolean}              true if the user attribute version is less than or equal (<=) to the condition version,
     *                                  false if the user attribute version is not less than or equal to the condition version,
     *                                  null if the user attribute version has an invalid type
     */
    function semverLessThanOrEqualEvaluator(condition, user) {
        var result = evaluateSemanticVersion(condition, user);
        if (result === null) {
            return null;
        }
        return result <= 0;
    }

    var customAttributeConditionEvaluator = /*#__PURE__*/Object.freeze({
        __proto__: null,
        evaluate: evaluate$1
    });

    /****************************************************************************
     * Copyright 2022 Optimizely, Inc. and contributors              *
     *                                                                          *
     * Licensed under the Apache License, Version 2.0 (the "License");          *
     * you may not use this file except in compliance with the License.         *
     * You may obtain a copy of the License at                                  *
     *                                                                          *
     *    http://www.apache.org/licenses/LICENSE-2.0                            *
     *                                                                          *
     * Unless required by applicable law or agreed to in writing, software      *
     * distributed under the License is distributed on an "AS IS" BASIS,        *
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
     * See the License for the specific language governing permissions and      *
     * limitations under the License.                                           *
     ***************************************************************************/
    var MODULE_NAME$6 = 'ODP_SEGMENT_CONDITION_EVALUATOR';
    var logger$8 = getLogger();
    var QUALIFIED_MATCH_TYPE = 'qualified';
    var MATCH_TYPES$1 = [
        QUALIFIED_MATCH_TYPE,
    ];
    var EVALUATORS_BY_MATCH_TYPE$1 = {};
    EVALUATORS_BY_MATCH_TYPE$1[QUALIFIED_MATCH_TYPE] = qualifiedEvaluator;
    /**
     * Given a custom attribute audience condition and user attributes, evaluate the
     * condition against the attributes.
     * @param  {Condition}        condition
     * @param  {OptimizelyUserContext} user
     * @return {?boolean}         true/false if the given user attributes match/don't match the given condition,
     *                            null if the given user attributes and condition can't be evaluated
     * TODO: Change to accept and object with named properties
     */
    function evaluate$2(condition, user) {
        var conditionMatch = condition.match;
        if (typeof conditionMatch !== 'undefined' && MATCH_TYPES$1.indexOf(conditionMatch) === -1) {
            logger$8.warn(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME$6, JSON.stringify(condition));
            return null;
        }
        var evaluator;
        if (!conditionMatch) {
            evaluator = qualifiedEvaluator;
        }
        else {
            evaluator = EVALUATORS_BY_MATCH_TYPE$1[conditionMatch] || qualifiedEvaluator;
        }
        return evaluator(condition, user);
    }
    function qualifiedEvaluator(condition, user) {
        return user.isQualifiedFor(condition.value);
    }

    var odpSegmentsConditionEvaluator = /*#__PURE__*/Object.freeze({
        __proto__: null,
        evaluate: evaluate$2
    });

    /**
     * Copyright 2016, 2018-2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var logger$9 = getLogger();
    var MODULE_NAME$7 = 'AUDIENCE_EVALUATOR';
    var AudienceEvaluator = /** @class */ (function () {
        /**
         * Construct an instance of AudienceEvaluator with given options
         * @param {Object=} UNSTABLE_conditionEvaluators     A map of condition evaluators provided by the consumer. This enables matching
         *                                                   condition types which are not supported natively by the SDK. Note that built in
         *                                                   Optimizely evaluators cannot be overridden.
         * @constructor
         */
        function AudienceEvaluator(UNSTABLE_conditionEvaluators) {
            this.typeToEvaluatorMap = fns.assign({}, UNSTABLE_conditionEvaluators, {
                custom_attribute: customAttributeConditionEvaluator,
                third_party_dimension: odpSegmentsConditionEvaluator,
            });
        }
        /**
         * Determine if the given user attributes satisfy the given audience conditions
         * @param  {Array<string|string[]}        audienceConditions    Audience conditions to match the user attributes against - can be an array
         *                                                              of audience IDs, a nested array of conditions, or a single leaf condition.
         *                                                              Examples: ["5", "6"], ["and", ["or", "1", "2"], "3"], "1"
         * @param  {[id: string]: Audience}       audiencesById         Object providing access to full audience objects for audience IDs
         *                                                              contained in audienceConditions. Keys should be audience IDs, values
         *                                                              should be full audience objects with conditions properties
         * @param  {OptimizelyUserContext}        userAttributes        User context which contains the attributes and segments which will be used in
         *                                                              determining if audience conditions are met.
         * @return {boolean}                                            true if the user attributes match the given audience conditions, false
         *                                                              otherwise
         */
        AudienceEvaluator.prototype.evaluate = function (audienceConditions, audiencesById, user) {
            var _this = this;
            // if there are no audiences, return true because that means ALL users are included in the experiment
            if (!audienceConditions || audienceConditions.length === 0) {
                return true;
            }
            var evaluateAudience = function (audienceId) {
                var audience = audiencesById[audienceId];
                if (audience) {
                    logger$9.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.EVALUATING_AUDIENCE, MODULE_NAME$7, audienceId, JSON.stringify(audience.conditions));
                    var result = evaluate(audience.conditions, _this.evaluateConditionWithUserAttributes.bind(_this, user));
                    var resultText = result === null ? 'UNKNOWN' : result.toString().toUpperCase();
                    logger$9.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT, MODULE_NAME$7, audienceId, resultText);
                    return result;
                }
                return null;
            };
            return !!evaluate(audienceConditions, evaluateAudience);
        };
        /**
         * Wrapper around evaluator.evaluate that is passed to the conditionTreeEvaluator.
         * Evaluates the condition provided given the user attributes if an evaluator has been defined for the condition type.
         * @param  {OptimizelyUserContext}  user             Optimizely user context containing attributes and segments
         * @param  {Condition}              condition        A single condition object to evaluate.
         * @return {boolean|null}                            true if the condition is satisfied, null if a matcher is not found.
         */
        AudienceEvaluator.prototype.evaluateConditionWithUserAttributes = function (user, condition) {
            var evaluator = this.typeToEvaluatorMap[condition.type];
            if (!evaluator) {
                logger$9.log(LOG_LEVEL.WARNING, LOG_MESSAGES.UNKNOWN_CONDITION_TYPE, MODULE_NAME$7, JSON.stringify(condition));
                return null;
            }
            try {
                return evaluator.evaluate(condition, user);
            }
            catch (err) {
                logger$9.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.CONDITION_EVALUATOR_ERROR, MODULE_NAME$7, condition.type, err.message);
            }
            return null;
        };
        return AudienceEvaluator;
    }());
    var createAudienceEvaluator = function (UNSTABLE_conditionEvaluators) {
        return new AudienceEvaluator(UNSTABLE_conditionEvaluators);
    };

    /**
     * Copyright 2018, 2020, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Validates provided value is a non-empty string
     * @param  {unknown}  input
     * @return {boolean}  true for non-empty string, false otherwise
     */
    function validate$1(input) {
        return typeof input === 'string' && input !== '';
    }

    var MODULE_NAME$8 = 'DECISION_SERVICE';
    /**
     * Optimizely's decision service that determines which variation of an experiment the user will be allocated to.
     *
     * The decision service contains all logic around how a user decision is made. This includes all of the following (in order):
     *   1. Checking experiment status
     *   2. Checking forced bucketing
     *   3. Checking whitelisting
     *   4. Checking user profile service for past bucketing decisions (sticky bucketing)
     *   5. Checking audience targeting
     *   6. Using Murmurhash3 to bucket the user.
     *
     * @constructor
     * @param   {DecisionServiceOptions}      options
     * @returns {DecisionService}
     */
    var DecisionService = /** @class */ (function () {
        function DecisionService(options) {
            this.audienceEvaluator = createAudienceEvaluator(options.UNSTABLE_conditionEvaluators);
            this.forcedVariationMap = {};
            this.logger = options.logger;
            this.userProfileService = options.userProfileService || null;
        }
        /**
         * Gets variation where visitor will be bucketed.
         * @param  {ProjectConfig}                          configObj         The parsed project configuration object
         * @param  {Experiment}                             experiment
         * @param  {OptimizelyUserContext}                  user              A user context
         * @param  {[key: string]: boolean}                 options           Optional map of decide options
         * @return {DecisionResponse<string|null>}          DecisionResponse containing the variation the user is bucketed into
         *                                                                    and the decide reasons.
         */
        DecisionService.prototype.getVariation = function (configObj, experiment, user, options) {
            if (options === void 0) { options = {}; }
            var userId = user.getUserId();
            var attributes = user.getAttributes();
            // by default, the bucketing ID should be the user ID
            var bucketingId = this.getBucketingId(userId, attributes);
            var decideReasons = [];
            var experimentKey = experiment.key;
            if (!this.checkIfExperimentIsActive(configObj, experimentKey)) {
                this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, MODULE_NAME$8, experimentKey);
                decideReasons.push([LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, MODULE_NAME$8, experimentKey]);
                return {
                    result: null,
                    reasons: decideReasons,
                };
            }
            var decisionForcedVariation = this.getForcedVariation(configObj, experimentKey, userId);
            decideReasons.push.apply(decideReasons, decisionForcedVariation.reasons);
            var forcedVariationKey = decisionForcedVariation.result;
            if (forcedVariationKey) {
                return {
                    result: forcedVariationKey,
                    reasons: decideReasons,
                };
            }
            var decisionWhitelistedVariation = this.getWhitelistedVariation(experiment, userId);
            decideReasons.push.apply(decideReasons, decisionWhitelistedVariation.reasons);
            var variation = decisionWhitelistedVariation.result;
            if (variation) {
                return {
                    result: variation.key,
                    reasons: decideReasons,
                };
            }
            var shouldIgnoreUPS = options[OptimizelyDecideOption.IGNORE_USER_PROFILE_SERVICE];
            var experimentBucketMap = this.resolveExperimentBucketMap(userId, attributes);
            // check for sticky bucketing if decide options do not include shouldIgnoreUPS
            if (!shouldIgnoreUPS) {
                variation = this.getStoredVariation(configObj, experiment, userId, experimentBucketMap);
                if (variation) {
                    this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.RETURNING_STORED_VARIATION, MODULE_NAME$8, variation.key, experimentKey, userId);
                    decideReasons.push([
                        LOG_MESSAGES.RETURNING_STORED_VARIATION,
                        MODULE_NAME$8,
                        variation.key,
                        experimentKey,
                        userId,
                    ]);
                    return {
                        result: variation.key,
                        reasons: decideReasons,
                    };
                }
            }
            // Perform regular targeting and bucketing
            var decisionifUserIsInAudience = this.checkIfUserIsInAudience(configObj, experiment, AUDIENCE_EVALUATION_TYPES.EXPERIMENT, user, '');
            decideReasons.push.apply(decideReasons, decisionifUserIsInAudience.reasons);
            if (!decisionifUserIsInAudience.result) {
                this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_NOT_IN_EXPERIMENT, MODULE_NAME$8, userId, experimentKey);
                decideReasons.push([
                    LOG_MESSAGES.USER_NOT_IN_EXPERIMENT,
                    MODULE_NAME$8,
                    userId,
                    experimentKey,
                ]);
                return {
                    result: null,
                    reasons: decideReasons,
                };
            }
            var bucketerParams = this.buildBucketerParams(configObj, experiment, bucketingId, userId);
            var decisionVariation = bucket(bucketerParams);
            decideReasons.push.apply(decideReasons, decisionVariation.reasons);
            var variationId = decisionVariation.result;
            if (variationId) {
                variation = configObj.variationIdMap[variationId];
            }
            if (!variation) {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_HAS_NO_VARIATION, MODULE_NAME$8, userId, experimentKey);
                decideReasons.push([
                    LOG_MESSAGES.USER_HAS_NO_VARIATION,
                    MODULE_NAME$8,
                    userId,
                    experimentKey,
                ]);
                return {
                    result: null,
                    reasons: decideReasons,
                };
            }
            this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_HAS_VARIATION, MODULE_NAME$8, userId, variation.key, experimentKey);
            decideReasons.push([
                LOG_MESSAGES.USER_HAS_VARIATION,
                MODULE_NAME$8,
                userId,
                variation.key,
                experimentKey,
            ]);
            // persist bucketing if decide options do not include shouldIgnoreUPS
            if (!shouldIgnoreUPS) {
                this.saveUserProfile(experiment, variation, userId, experimentBucketMap);
            }
            return {
                result: variation.key,
                reasons: decideReasons,
            };
        };
        /**
         * Merges attributes from attributes[STICKY_BUCKETING_KEY] and userProfileService
         * @param  {string}               userId
         * @param  {UserAttributes}       attributes
         * @return {ExperimentBucketMap}  finalized copy of experiment_bucket_map
         */
        DecisionService.prototype.resolveExperimentBucketMap = function (userId, attributes) {
            attributes = attributes || {};
            var userProfile = this.getUserProfile(userId) || {};
            var attributeExperimentBucketMap = attributes[CONTROL_ATTRIBUTES.STICKY_BUCKETING_KEY];
            return fns.assign({}, userProfile.experiment_bucket_map, attributeExperimentBucketMap);
        };
        /**
         * Checks whether the experiment is running
         * @param  {ProjectConfig}  configObj     The parsed project configuration object
         * @param  {string}         experimentKey Key of experiment being validated
         * @return {boolean}        True if experiment is running
         */
        DecisionService.prototype.checkIfExperimentIsActive = function (configObj, experimentKey) {
            return isActive(configObj, experimentKey);
        };
        /**
         * Checks if user is whitelisted into any variation and return that variation if so
         * @param  {Experiment}                                 experiment
         * @param  {string}                                     userId
         * @return {DecisionResponse<Variation|null>}           DecisionResponse containing the forced variation if it exists
         *                                                      or user ID and the decide reasons.
         */
        DecisionService.prototype.getWhitelistedVariation = function (experiment, userId) {
            var decideReasons = [];
            if (experiment.forcedVariations && experiment.forcedVariations.hasOwnProperty(userId)) {
                var forcedVariationKey = experiment.forcedVariations[userId];
                if (experiment.variationKeyMap.hasOwnProperty(forcedVariationKey)) {
                    this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_FORCED_IN_VARIATION, MODULE_NAME$8, userId, forcedVariationKey);
                    decideReasons.push([
                        LOG_MESSAGES.USER_FORCED_IN_VARIATION,
                        MODULE_NAME$8,
                        userId,
                        forcedVariationKey,
                    ]);
                    return {
                        result: experiment.variationKeyMap[forcedVariationKey],
                        reasons: decideReasons,
                    };
                }
                else {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.FORCED_BUCKETING_FAILED, MODULE_NAME$8, forcedVariationKey, userId);
                    decideReasons.push([
                        LOG_MESSAGES.FORCED_BUCKETING_FAILED,
                        MODULE_NAME$8,
                        forcedVariationKey,
                        userId,
                    ]);
                    return {
                        result: null,
                        reasons: decideReasons,
                    };
                }
            }
            return {
                result: null,
                reasons: decideReasons,
            };
        };
        /**
         * Checks whether the user is included in experiment audience
         * @param  {ProjectConfig}                configObj            The parsed project configuration object
         * @param  {string}                       experimentKey        Key of experiment being validated
         * @param  {string}                       evaluationAttribute  String representing experiment key or rule
         * @param  {string}                       userId               ID of user
         * @param  {UserAttributes}               attributes           Optional parameter for user's attributes
         * @param  {string}                       loggingKey           String representing experiment key or rollout rule. To be used in log messages only.
         * @return {DecisionResponse<boolean>}    DecisionResponse     DecisionResponse containing result true if user meets audience conditions and
         *                                                             the decide reasons.
         */
        DecisionService.prototype.checkIfUserIsInAudience = function (configObj, experiment, evaluationAttribute, user, loggingKey) {
            var decideReasons = [];
            var experimentAudienceConditions = getExperimentAudienceConditions(configObj, experiment.id);
            var audiencesById = getAudiencesById(configObj);
            this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.EVALUATING_AUDIENCES_COMBINED, MODULE_NAME$8, evaluationAttribute, loggingKey || experiment.key, JSON.stringify(experimentAudienceConditions));
            decideReasons.push([
                LOG_MESSAGES.EVALUATING_AUDIENCES_COMBINED,
                MODULE_NAME$8,
                evaluationAttribute,
                loggingKey || experiment.key,
                JSON.stringify(experimentAudienceConditions),
            ]);
            var result = this.audienceEvaluator.evaluate(experimentAudienceConditions, audiencesById, user);
            this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED, MODULE_NAME$8, evaluationAttribute, loggingKey || experiment.key, result.toString().toUpperCase());
            decideReasons.push([
                LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
                MODULE_NAME$8,
                evaluationAttribute,
                loggingKey || experiment.key,
                result.toString().toUpperCase(),
            ]);
            return {
                result: result,
                reasons: decideReasons,
            };
        };
        /**
         * Given an experiment key and user ID, returns params used in bucketer call
         * @param  {ProjectConfig}         configObj     The parsed project configuration object
         * @param  {string}                experimentKey Experiment key used for bucketer
         * @param  {string}                bucketingId   ID to bucket user into
         * @param  {string}                userId        ID of user to be bucketed
         * @return {BucketerParams}
         */
        DecisionService.prototype.buildBucketerParams = function (configObj, experiment, bucketingId, userId) {
            return {
                bucketingId: bucketingId,
                experimentId: experiment.id,
                experimentKey: experiment.key,
                experimentIdMap: configObj.experimentIdMap,
                experimentKeyMap: configObj.experimentKeyMap,
                groupIdMap: configObj.groupIdMap,
                logger: this.logger,
                trafficAllocationConfig: getTrafficAllocation(configObj, experiment.id),
                userId: userId,
                variationIdMap: configObj.variationIdMap,
            };
        };
        /**
         * Pull the stored variation out of the experimentBucketMap for an experiment/userId
         * @param  {ProjectConfig}        configObj            The parsed project configuration object
         * @param  {Experiment}           experiment
         * @param  {string}               userId
         * @param  {ExperimentBucketMap}  experimentBucketMap  mapping experiment => { variation_id: <variationId> }
         * @return {Variation|null}       the stored variation or null if the user profile does not have one for the given experiment
         */
        DecisionService.prototype.getStoredVariation = function (configObj, experiment, userId, experimentBucketMap) {
            if (experimentBucketMap.hasOwnProperty(experiment.id)) {
                var decision = experimentBucketMap[experiment.id];
                var variationId = decision.variation_id;
                if (configObj.variationIdMap.hasOwnProperty(variationId)) {
                    return configObj.variationIdMap[decision.variation_id];
                }
                else {
                    this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.SAVED_VARIATION_NOT_FOUND, MODULE_NAME$8, userId, variationId, experiment.key);
                }
            }
            return null;
        };
        /**
         * Get the user profile with the given user ID
         * @param  {string} userId
         * @return {UserProfile|null} the stored user profile or null if one isn't found
         */
        DecisionService.prototype.getUserProfile = function (userId) {
            var userProfile = {
                user_id: userId,
                experiment_bucket_map: {},
            };
            if (!this.userProfileService) {
                return userProfile;
            }
            try {
                return this.userProfileService.lookup(userId);
            }
            catch (ex) {
                this.logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.USER_PROFILE_LOOKUP_ERROR, MODULE_NAME$8, userId, ex.message);
            }
            return null;
        };
        /**
         * Saves the bucketing decision to the user profile
         * @param {Experiment}          experiment
         * @param {Variation}           variation
         * @param {string}              userId
         * @param {ExperimentBucketMap} experimentBucketMap
         */
        DecisionService.prototype.saveUserProfile = function (experiment, variation, userId, experimentBucketMap) {
            if (!this.userProfileService) {
                return;
            }
            try {
                experimentBucketMap[experiment.id] = {
                    variation_id: variation.id
                };
                this.userProfileService.save({
                    user_id: userId,
                    experiment_bucket_map: experimentBucketMap,
                });
                this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.SAVED_VARIATION, MODULE_NAME$8, variation.key, experiment.key, userId);
            }
            catch (ex) {
                this.logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.USER_PROFILE_SAVE_ERROR, MODULE_NAME$8, userId, ex.message);
            }
        };
        /**
         * Given a feature, user ID, and attributes, returns a decision response containing
         * an object representing a decision and decide reasons. If the user was bucketed into
         * a variation for the given feature and attributes, the decision object will have variation and
         * experiment properties (both objects), as well as a decisionSource property.
         * decisionSource indicates whether the decision was due to a rollout or an
         * experiment.
         * @param   {ProjectConfig}               configObj         The parsed project configuration object
         * @param   {FeatureFlag}                 feature           A feature flag object from project configuration
         * @param   {OptimizelyUserContext}       user              A user context
         * @param   {[key: string]: boolean}      options           Map of decide options
         * @return  {DecisionResponse}            DecisionResponse  DecisionResponse containing an object with experiment, variation, and decisionSource
         *                                                          properties and decide reasons. If the user was not bucketed into a variation, the variation
         *                                                          property in decision object is null.
         */
        DecisionService.prototype.getVariationForFeature = function (configObj, feature, user, options) {
            if (options === void 0) { options = {}; }
            var decideReasons = [];
            var decisionVariation = this.getVariationForFeatureExperiment(configObj, feature, user, options);
            decideReasons.push.apply(decideReasons, decisionVariation.reasons);
            var experimentDecision = decisionVariation.result;
            if (experimentDecision.variation !== null) {
                return {
                    result: experimentDecision,
                    reasons: decideReasons,
                };
            }
            var decisionRolloutVariation = this.getVariationForRollout(configObj, feature, user);
            decideReasons.push.apply(decideReasons, decisionRolloutVariation.reasons);
            var rolloutDecision = decisionRolloutVariation.result;
            var userId = user.getUserId();
            if (rolloutDecision.variation) {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_IN_ROLLOUT, MODULE_NAME$8, userId, feature.key);
                decideReasons.push([LOG_MESSAGES.USER_IN_ROLLOUT, MODULE_NAME$8, userId, feature.key]);
                return {
                    result: rolloutDecision,
                    reasons: decideReasons,
                };
            }
            this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_NOT_IN_ROLLOUT, MODULE_NAME$8, userId, feature.key);
            decideReasons.push([LOG_MESSAGES.USER_NOT_IN_ROLLOUT, MODULE_NAME$8, userId, feature.key]);
            return {
                result: rolloutDecision,
                reasons: decideReasons,
            };
        };
        DecisionService.prototype.getVariationForFeatureExperiment = function (configObj, feature, user, options) {
            if (options === void 0) { options = {}; }
            var decideReasons = [];
            var variationKey = null;
            var decisionVariation;
            var index;
            var variationForFeatureExperiment;
            // Check if the feature flag is under an experiment and the the user is bucketed into one of these experiments
            if (feature.experimentIds.length > 0) {
                // Evaluate each experiment ID and return the first bucketed experiment variation
                for (index = 0; index < feature.experimentIds.length; index++) {
                    var experiment = getExperimentFromId(configObj, feature.experimentIds[index], this.logger);
                    if (experiment) {
                        decisionVariation = this.getVariationFromExperimentRule(configObj, feature.key, experiment, user, options);
                        decideReasons.push.apply(decideReasons, decisionVariation.reasons);
                        variationKey = decisionVariation.result;
                        if (variationKey) {
                            var variation = null;
                            variation = experiment.variationKeyMap[variationKey];
                            if (!variation) {
                                variation = getFlagVariationByKey(configObj, feature.key, variationKey);
                            }
                            variationForFeatureExperiment = {
                                experiment: experiment,
                                variation: variation,
                                decisionSource: DECISION_SOURCES.FEATURE_TEST,
                            };
                            return {
                                result: variationForFeatureExperiment,
                                reasons: decideReasons,
                            };
                        }
                    }
                }
            }
            else {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.FEATURE_HAS_NO_EXPERIMENTS, MODULE_NAME$8, feature.key);
                decideReasons.push([LOG_MESSAGES.FEATURE_HAS_NO_EXPERIMENTS, MODULE_NAME$8, feature.key]);
            }
            variationForFeatureExperiment = {
                experiment: null,
                variation: null,
                decisionSource: DECISION_SOURCES.FEATURE_TEST,
            };
            return {
                result: variationForFeatureExperiment,
                reasons: decideReasons,
            };
        };
        DecisionService.prototype.getVariationForRollout = function (configObj, feature, user) {
            var decideReasons = [];
            var decisionObj;
            if (!feature.rolloutId) {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.NO_ROLLOUT_EXISTS, MODULE_NAME$8, feature.key);
                decideReasons.push([LOG_MESSAGES.NO_ROLLOUT_EXISTS, MODULE_NAME$8, feature.key]);
                decisionObj = {
                    experiment: null,
                    variation: null,
                    decisionSource: DECISION_SOURCES.ROLLOUT,
                };
                return {
                    result: decisionObj,
                    reasons: decideReasons,
                };
            }
            var rollout = configObj.rolloutIdMap[feature.rolloutId];
            if (!rollout) {
                this.logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.INVALID_ROLLOUT_ID, MODULE_NAME$8, feature.rolloutId, feature.key);
                decideReasons.push([ERROR_MESSAGES.INVALID_ROLLOUT_ID, MODULE_NAME$8, feature.rolloutId, feature.key]);
                decisionObj = {
                    experiment: null,
                    variation: null,
                    decisionSource: DECISION_SOURCES.ROLLOUT,
                };
                return {
                    result: decisionObj,
                    reasons: decideReasons,
                };
            }
            var rolloutRules = rollout.experiments;
            if (rolloutRules.length === 0) {
                this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.ROLLOUT_HAS_NO_EXPERIMENTS, MODULE_NAME$8, feature.rolloutId);
                decideReasons.push([LOG_MESSAGES.ROLLOUT_HAS_NO_EXPERIMENTS, MODULE_NAME$8, feature.rolloutId]);
                decisionObj = {
                    experiment: null,
                    variation: null,
                    decisionSource: DECISION_SOURCES.ROLLOUT,
                };
                return {
                    result: decisionObj,
                    reasons: decideReasons,
                };
            }
            var decisionVariation;
            var skipToEveryoneElse;
            var variation;
            var rolloutRule;
            var index = 0;
            while (index < rolloutRules.length) {
                decisionVariation = this.getVariationFromDeliveryRule(configObj, feature.key, rolloutRules, index, user);
                decideReasons.push.apply(decideReasons, decisionVariation.reasons);
                variation = decisionVariation.result;
                skipToEveryoneElse = decisionVariation.skipToEveryoneElse;
                if (variation) {
                    rolloutRule = configObj.experimentIdMap[rolloutRules[index].id];
                    decisionObj = {
                        experiment: rolloutRule,
                        variation: variation,
                        decisionSource: DECISION_SOURCES.ROLLOUT
                    };
                    return {
                        result: decisionObj,
                        reasons: decideReasons,
                    };
                }
                // the last rule is special for "Everyone Else"
                index = skipToEveryoneElse ? (rolloutRules.length - 1) : (index + 1);
            }
            decisionObj = {
                experiment: null,
                variation: null,
                decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            return {
                result: decisionObj,
                reasons: decideReasons,
            };
        };
        /**
         * Get bucketing Id from user attributes.
         * @param   {string}          userId
         * @param   {UserAttributes}  attributes
         * @returns {string}          Bucketing Id if it is a string type in attributes, user Id otherwise.
         */
        DecisionService.prototype.getBucketingId = function (userId, attributes) {
            var bucketingId = userId;
            // If the bucketing ID key is defined in attributes, than use that in place of the userID for the murmur hash key
            if (attributes != null &&
                typeof attributes === 'object' &&
                attributes.hasOwnProperty(CONTROL_ATTRIBUTES.BUCKETING_ID)) {
                if (typeof attributes[CONTROL_ATTRIBUTES.BUCKETING_ID] === 'string') {
                    bucketingId = attributes[CONTROL_ATTRIBUTES.BUCKETING_ID];
                    this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.VALID_BUCKETING_ID, MODULE_NAME$8, bucketingId);
                }
                else {
                    this.logger.log(LOG_LEVEL.WARNING, LOG_MESSAGES.BUCKETING_ID_NOT_STRING, MODULE_NAME$8);
                }
            }
            return bucketingId;
        };
        /**
         * Finds a validated forced decision for specific flagKey and optional ruleKey.
         * @param     {ProjectConfig}         config               A projectConfig.
         * @param     {OptimizelyUserContext} user                 A Optimizely User Context.
         * @param     {string}                flagKey              A flagKey.
         * @param     {ruleKey}               ruleKey              A ruleKey (optional).
         * @return    {DecisionResponse<Variation|null>}  DecisionResponse object containing valid variation object and decide reasons.
         */
        DecisionService.prototype.findValidatedForcedDecision = function (config, user, flagKey, ruleKey) {
            var decideReasons = [];
            var forcedDecision = user.getForcedDecision({ flagKey: flagKey, ruleKey: ruleKey });
            var variation = null;
            var variationKey;
            var userId = user.getUserId();
            if (config && forcedDecision) {
                variationKey = forcedDecision.variationKey;
                variation = getFlagVariationByKey(config, flagKey, variationKey);
                if (variation) {
                    if (ruleKey) {
                        this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED, variationKey, flagKey, ruleKey, userId);
                        decideReasons.push([
                            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED,
                            variationKey,
                            flagKey,
                            ruleKey,
                            userId
                        ]);
                    }
                    else {
                        this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED, variationKey, flagKey, userId);
                        decideReasons.push([
                            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED,
                            variationKey,
                            flagKey,
                            userId
                        ]);
                    }
                }
                else {
                    if (ruleKey) {
                        this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID, flagKey, ruleKey, userId);
                        decideReasons.push([
                            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID,
                            flagKey,
                            ruleKey,
                            userId
                        ]);
                    }
                    else {
                        this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID, flagKey, userId);
                        decideReasons.push([
                            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID,
                            flagKey,
                            userId
                        ]);
                    }
                }
            }
            return {
                result: variation,
                reasons: decideReasons,
            };
        };
        /**
         * Removes forced variation for given userId and experimentKey
         * @param  {string} userId         String representing the user id
         * @param  {string} experimentId   Number representing the experiment id
         * @param  {string} experimentKey  Key representing the experiment id
         * @throws If the user id is not valid or not in the forced variation map
         */
        DecisionService.prototype.removeForcedVariation = function (userId, experimentId, experimentKey) {
            if (!userId) {
                throw new Error(sprintf(ERROR_MESSAGES.INVALID_USER_ID, MODULE_NAME$8));
            }
            if (this.forcedVariationMap.hasOwnProperty(userId)) {
                delete this.forcedVariationMap[userId][experimentId];
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.VARIATION_REMOVED_FOR_USER, MODULE_NAME$8, experimentKey, userId);
            }
            else {
                throw new Error(sprintf(ERROR_MESSAGES.USER_NOT_IN_FORCED_VARIATION, MODULE_NAME$8, userId));
            }
        };
        /**
         * Sets forced variation for given userId and experimentKey
         * @param  {string} userId        String representing the user id
         * @param  {string} experimentId  Number representing the experiment id
         * @param  {number} variationId   Number representing the variation id
         * @throws If the user id is not valid
         */
        DecisionService.prototype.setInForcedVariationMap = function (userId, experimentId, variationId) {
            if (this.forcedVariationMap.hasOwnProperty(userId)) {
                this.forcedVariationMap[userId][experimentId] = variationId;
            }
            else {
                this.forcedVariationMap[userId] = {};
                this.forcedVariationMap[userId][experimentId] = variationId;
            }
            this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION, MODULE_NAME$8, variationId, experimentId, userId);
        };
        /**
         * Gets the forced variation key for the given user and experiment.
         * @param  {ProjectConfig}                  configObj         Object representing project configuration
         * @param  {string}                         experimentKey     Key for experiment.
         * @param  {string}                         userId            The user Id.
         * @return {DecisionResponse<string|null>}                    DecisionResponse containing variation which the given user and experiment
         *                                                            should be forced into and the decide reasons.
         */
        DecisionService.prototype.getForcedVariation = function (configObj, experimentKey, userId) {
            var decideReasons = [];
            var experimentToVariationMap = this.forcedVariationMap[userId];
            if (!experimentToVariationMap) {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, MODULE_NAME$8, userId);
                return {
                    result: null,
                    reasons: decideReasons,
                };
            }
            var experimentId;
            try {
                var experiment = getExperimentFromKey(configObj, experimentKey);
                if (experiment.hasOwnProperty('id')) {
                    experimentId = experiment['id'];
                }
                else {
                    // catching improperly formatted experiments
                    this.logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.IMPROPERLY_FORMATTED_EXPERIMENT, MODULE_NAME$8, experimentKey);
                    decideReasons.push([
                        ERROR_MESSAGES.IMPROPERLY_FORMATTED_EXPERIMENT,
                        MODULE_NAME$8,
                        experimentKey,
                    ]);
                    return {
                        result: null,
                        reasons: decideReasons,
                    };
                }
            }
            catch (ex) {
                // catching experiment not in datafile
                this.logger.log(LOG_LEVEL.ERROR, ex.message);
                decideReasons.push(ex.message);
                return {
                    result: null,
                    reasons: decideReasons,
                };
            }
            var variationId = experimentToVariationMap[experimentId];
            if (!variationId) {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT, MODULE_NAME$8, experimentKey, userId);
                return {
                    result: null,
                    reasons: decideReasons,
                };
            }
            var variationKey = getVariationKeyFromId(configObj, variationId);
            if (variationKey) {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_HAS_FORCED_VARIATION, MODULE_NAME$8, variationKey, experimentKey, userId);
                decideReasons.push([
                    LOG_MESSAGES.USER_HAS_FORCED_VARIATION,
                    MODULE_NAME$8,
                    variationKey,
                    experimentKey,
                    userId,
                ]);
            }
            else {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT, MODULE_NAME$8, experimentKey, userId);
            }
            return {
                result: variationKey,
                reasons: decideReasons,
            };
        };
        /**
         * Sets the forced variation for a user in a given experiment
         * @param  {ProjectConfig}  configObj      Object representing project configuration
         * @param  {string}         experimentKey  Key for experiment.
         * @param  {string}         userId         The user Id.
         * @param  {string|null}    variationKey   Key for variation. If null, then clear the existing experiment-to-variation mapping
         * @return {boolean}     A boolean value that indicates if the set completed successfully.
         */
        DecisionService.prototype.setForcedVariation = function (configObj, experimentKey, userId, variationKey) {
            if (variationKey != null && !validate$1(variationKey)) {
                this.logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.INVALID_VARIATION_KEY, MODULE_NAME$8);
                return false;
            }
            var experimentId;
            try {
                var experiment = getExperimentFromKey(configObj, experimentKey);
                if (experiment.hasOwnProperty('id')) {
                    experimentId = experiment['id'];
                }
                else {
                    // catching improperly formatted experiments
                    this.logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.IMPROPERLY_FORMATTED_EXPERIMENT, MODULE_NAME$8, experimentKey);
                    return false;
                }
            }
            catch (ex) {
                // catching experiment not in datafile
                this.logger.log(LOG_LEVEL.ERROR, ex.message);
                return false;
            }
            if (variationKey == null) {
                try {
                    this.removeForcedVariation(userId, experimentId, experimentKey);
                    return true;
                }
                catch (ex) {
                    this.logger.log(LOG_LEVEL.ERROR, ex.message);
                    return false;
                }
            }
            var variationId = getVariationIdFromExperimentAndVariationKey(configObj, experimentKey, variationKey);
            if (!variationId) {
                this.logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.NO_VARIATION_FOR_EXPERIMENT_KEY, MODULE_NAME$8, variationKey, experimentKey);
                return false;
            }
            try {
                this.setInForcedVariationMap(userId, experimentId, variationId);
                return true;
            }
            catch (ex) {
                this.logger.log(LOG_LEVEL.ERROR, ex.message);
                return false;
            }
        };
        DecisionService.prototype.getVariationFromExperimentRule = function (configObj, flagKey, rule, user, options) {
            if (options === void 0) { options = {}; }
            var decideReasons = [];
            // check forced decision first
            var forcedDecisionResponse = this.findValidatedForcedDecision(configObj, user, flagKey, rule.key);
            decideReasons.push.apply(decideReasons, forcedDecisionResponse.reasons);
            var forcedVariation = forcedDecisionResponse.result;
            if (forcedVariation) {
                return {
                    result: forcedVariation.key,
                    reasons: decideReasons,
                };
            }
            var decisionVariation = this.getVariation(configObj, rule, user, options);
            decideReasons.push.apply(decideReasons, decisionVariation.reasons);
            var variationKey = decisionVariation.result;
            return {
                result: variationKey,
                reasons: decideReasons,
            };
        };
        DecisionService.prototype.getVariationFromDeliveryRule = function (configObj, flagKey, rules, ruleIndex, user) {
            var decideReasons = [];
            var skipToEveryoneElse = false;
            // check forced decision first
            var rule = rules[ruleIndex];
            var forcedDecisionResponse = this.findValidatedForcedDecision(configObj, user, flagKey, rule.key);
            decideReasons.push.apply(decideReasons, forcedDecisionResponse.reasons);
            var forcedVariation = forcedDecisionResponse.result;
            if (forcedVariation) {
                return {
                    result: forcedVariation,
                    reasons: decideReasons,
                    skipToEveryoneElse: skipToEveryoneElse,
                };
            }
            var userId = user.getUserId();
            var attributes = user.getAttributes();
            var bucketingId = this.getBucketingId(userId, attributes);
            var everyoneElse = ruleIndex === rules.length - 1;
            var loggingKey = everyoneElse ? "Everyone Else" : ruleIndex + 1;
            var bucketedVariation = null;
            var bucketerVariationId;
            var bucketerParams;
            var decisionVariation;
            var decisionifUserIsInAudience = this.checkIfUserIsInAudience(configObj, rule, AUDIENCE_EVALUATION_TYPES.RULE, user, loggingKey);
            decideReasons.push.apply(decideReasons, decisionifUserIsInAudience.reasons);
            if (decisionifUserIsInAudience.result) {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_MEETS_CONDITIONS_FOR_TARGETING_RULE, MODULE_NAME$8, userId, loggingKey);
                decideReasons.push([
                    LOG_MESSAGES.USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
                    MODULE_NAME$8,
                    userId,
                    loggingKey
                ]);
                bucketerParams = this.buildBucketerParams(configObj, rule, bucketingId, userId);
                decisionVariation = bucket(bucketerParams);
                decideReasons.push.apply(decideReasons, decisionVariation.reasons);
                bucketerVariationId = decisionVariation.result;
                if (bucketerVariationId) {
                    bucketedVariation = getVariationFromId(configObj, bucketerVariationId);
                }
                if (bucketedVariation) {
                    this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_BUCKETED_INTO_TARGETING_RULE, MODULE_NAME$8, userId, loggingKey);
                    decideReasons.push([
                        LOG_MESSAGES.USER_BUCKETED_INTO_TARGETING_RULE,
                        MODULE_NAME$8,
                        userId,
                        loggingKey
                    ]);
                }
                else if (!everyoneElse) {
                    // skip this logging for EveryoneElse since this has a message not for EveryoneElse
                    this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_NOT_BUCKETED_INTO_TARGETING_RULE, MODULE_NAME$8, userId, loggingKey);
                    decideReasons.push([
                        LOG_MESSAGES.USER_NOT_BUCKETED_INTO_TARGETING_RULE,
                        MODULE_NAME$8,
                        userId,
                        loggingKey
                    ]);
                    // skip the rest of rollout rules to the everyone-else rule if audience matches but not bucketed
                    skipToEveryoneElse = true;
                }
            }
            else {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE, MODULE_NAME$8, userId, loggingKey);
                decideReasons.push([
                    LOG_MESSAGES.USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE,
                    MODULE_NAME$8,
                    userId,
                    loggingKey
                ]);
            }
            return {
                result: bucketedVariation,
                reasons: decideReasons,
                skipToEveryoneElse: skipToEveryoneElse,
            };
        };
        return DecisionService;
    }());
    /**
     * Creates an instance of the DecisionService.
     * @param  {DecisionServiceOptions}     options       Configuration options
     * @return {Object}                     An instance of the DecisionService
     */
    function createDecisionService(options) {
        return new DecisionService(options);
    }

    /**
     * Provides utility method for parsing event tag values
     */
    var MODULE_NAME$9 = 'EVENT_TAG_UTILS';
    var REVENUE_EVENT_METRIC_NAME = "revenue" /* RESERVED_EVENT_KEYWORDS.REVENUE */;
    var VALUE_EVENT_METRIC_NAME = "value" /* RESERVED_EVENT_KEYWORDS.VALUE */;
    /**
     * Grab the revenue value from the event tags. "revenue" is a reserved keyword.
     * @param {EventTags} eventTags
     * @param {LoggerFacade} logger
     * @return {number|null}
     */
    function getRevenueValue(eventTags, logger) {
        if (eventTags.hasOwnProperty(REVENUE_EVENT_METRIC_NAME)) {
            var rawValue = eventTags[REVENUE_EVENT_METRIC_NAME];
            var parsedRevenueValue = void 0;
            if (typeof rawValue === 'string') {
                parsedRevenueValue = parseInt(rawValue);
                if (isNaN(parsedRevenueValue)) {
                    logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.FAILED_TO_PARSE_REVENUE, MODULE_NAME$9, rawValue);
                    return null;
                }
                logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.PARSED_REVENUE_VALUE, MODULE_NAME$9, parsedRevenueValue);
                return parsedRevenueValue;
            }
            if (typeof rawValue === 'number') {
                parsedRevenueValue = rawValue;
                logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.PARSED_REVENUE_VALUE, MODULE_NAME$9, parsedRevenueValue);
                return parsedRevenueValue;
            }
            return null;
        }
        return null;
    }
    /**
     * Grab the event value from the event tags. "value" is a reserved keyword.
     * @param {EventTags} eventTags
     * @param {LoggerFacade} logger
     * @return {number|null}
     */
    function getEventValue(eventTags, logger) {
        if (eventTags.hasOwnProperty(VALUE_EVENT_METRIC_NAME)) {
            var rawValue = eventTags[VALUE_EVENT_METRIC_NAME];
            var parsedEventValue = void 0;
            if (typeof rawValue === 'string') {
                parsedEventValue = parseFloat(rawValue);
                if (isNaN(parsedEventValue)) {
                    logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.FAILED_TO_PARSE_VALUE, MODULE_NAME$9, rawValue);
                    return null;
                }
                logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.PARSED_NUMERIC_VALUE, MODULE_NAME$9, parsedEventValue);
                return parsedEventValue;
            }
            if (typeof rawValue === 'number') {
                parsedEventValue = rawValue;
                logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.PARSED_NUMERIC_VALUE, MODULE_NAME$9, parsedEventValue);
                return parsedEventValue;
            }
            return null;
        }
        return null;
    }

    /**
     * Copyright 2016, 2018-2020, 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var MODULE_NAME$a = 'ATTRIBUTES_VALIDATOR';
    /**
     * Validates user's provided attributes
     * @param  {unknown}  attributes
     * @return {boolean}  true if the attributes are valid
     * @throws If the attributes are not valid
     */
    function validate$2(attributes) {
        if (typeof attributes === 'object' && !Array.isArray(attributes) && attributes !== null) {
            Object.keys(attributes).forEach(function (key) {
                if (typeof attributes[key] === 'undefined') {
                    throw new Error(sprintf(ERROR_MESSAGES.UNDEFINED_ATTRIBUTE, MODULE_NAME$a, key));
                }
            });
            return true;
        }
        else {
            throw new Error(sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, MODULE_NAME$a));
        }
    }
    /**
     * Validates user's provided attribute
     * @param  {unknown}  attributeKey
     * @param  {unknown}  attributeValue
     * @return {boolean}  true if the attribute is valid
     */
    function isAttributeValid(attributeKey, attributeValue) {
        return (typeof attributeKey === 'string' &&
            (typeof attributeValue === 'string' ||
                typeof attributeValue === 'boolean' ||
                (fns.isNumber(attributeValue) && fns.isSafeInteger(attributeValue))));
    }

    var ACTIVATE_EVENT_KEY$1 = 'campaign_activated';
    var CUSTOM_ATTRIBUTE_FEATURE_TYPE$1 = 'custom';
    var ENDPOINT = 'https://logx.optimizely.com/v1/events';
    var HTTP_VERB = 'POST';
    /**
     * Get params which are used same in both conversion and impression events
     * @param  {ImpressionOptions|ConversionEventOptions} options    Object containing values needed to build impression/conversion event
     * @return {CommonEventParams}                                   Common params with properties that are used in both conversion and impression events
     */
    function getCommonEventParams(_a) {
        var attributes = _a.attributes, userId = _a.userId, clientEngine = _a.clientEngine, clientVersion = _a.clientVersion, configObj = _a.configObj, logger = _a.logger;
        var anonymize_ip = configObj.anonymizeIP ? configObj.anonymizeIP : false;
        var botFiltering = configObj.botFiltering;
        var visitor = {
            snapshots: [],
            visitor_id: userId,
            attributes: [],
        };
        var commonParams = {
            account_id: configObj.accountId,
            project_id: configObj.projectId,
            visitors: [visitor],
            revision: configObj.revision,
            client_name: clientEngine,
            client_version: clientVersion,
            anonymize_ip: anonymize_ip,
            enrich_decisions: true,
        };
        if (attributes) {
            // Omit attribute values that are not supported by the log endpoint.
            Object.keys(attributes || {}).forEach(function (attributeKey) {
                var attributeValue = attributes[attributeKey];
                if (isAttributeValid(attributeKey, attributeValue)) {
                    var attributeId = getAttributeId(configObj, attributeKey, logger);
                    if (attributeId) {
                        commonParams.visitors[0].attributes.push({
                            entity_id: attributeId,
                            key: attributeKey,
                            type: CUSTOM_ATTRIBUTE_FEATURE_TYPE$1,
                            value: attributes[attributeKey],
                        });
                    }
                }
            });
        }
        if (typeof botFiltering === 'boolean') {
            commonParams.visitors[0].attributes.push({
                entity_id: CONTROL_ATTRIBUTES.BOT_FILTERING,
                key: CONTROL_ATTRIBUTES.BOT_FILTERING,
                type: CUSTOM_ATTRIBUTE_FEATURE_TYPE$1,
                value: botFiltering,
            });
        }
        return commonParams;
    }
    /**
     * Creates object of params specific to impression events
     * @param  {ProjectConfig}       configObj    Object representing project configuration
     * @param  {string|null}         experimentId ID of experiment for which impression needs to be recorded
     * @param  {string|null}         variationId  ID for variation which would be presented to user
     * @param  {string}              ruleKey      Key of experiment for which impression needs to be recorded
     * @param  {string}              ruleType     Type for the decision source
     * @param  {string}              flagKey      Key for a feature flag
     * @param  {boolean}             enabled      Boolean representing if feature is enabled
     * @return {Snapshot}                         Impression event params
     */
    function getImpressionEventParams(configObj, experimentId, variationId, ruleKey, ruleType, flagKey, enabled) {
        var campaignId = experimentId ? getLayerId(configObj, experimentId) : null;
        var variationKey = variationId ? getVariationKeyFromId(configObj, variationId) : null;
        variationKey = variationKey || '';
        var impressionEventParams = {
            decisions: [
                {
                    campaign_id: campaignId,
                    experiment_id: experimentId,
                    variation_id: variationId,
                    metadata: {
                        flag_key: flagKey,
                        rule_key: ruleKey,
                        rule_type: ruleType,
                        variation_key: variationKey,
                        enabled: enabled,
                    }
                },
            ],
            events: [
                {
                    entity_id: campaignId,
                    timestamp: fns.currentTimestamp(),
                    key: ACTIVATE_EVENT_KEY$1,
                    uuid: fns.uuid(),
                },
            ],
        };
        return impressionEventParams;
    }
    /**
     * Creates object of params specific to conversion events
     * @param  {ProjectConfig} configObj                 Object representing project configuration
     * @param  {string}        eventKey                  Event key representing the event which needs to be recorded
     * @param  {LoggerFacade}  logger                    Logger object
     * @param  {EventTags}     eventTags                 Values associated with the event.
     * @return {Snapshot}                                Conversion event params
     */
    function getVisitorSnapshot(configObj, eventKey, logger, eventTags) {
        var snapshot = {
            events: [],
        };
        var eventDict = {
            entity_id: getEventId(configObj, eventKey),
            timestamp: fns.currentTimestamp(),
            uuid: fns.uuid(),
            key: eventKey,
        };
        if (eventTags) {
            var revenue = getRevenueValue(eventTags, logger);
            if (revenue !== null) {
                eventDict["revenue" /* RESERVED_EVENT_KEYWORDS.REVENUE */] = revenue;
            }
            var eventValue = getEventValue(eventTags, logger);
            if (eventValue !== null) {
                eventDict["value" /* RESERVED_EVENT_KEYWORDS.VALUE */] = eventValue;
            }
            eventDict['tags'] = eventTags;
        }
        snapshot.events.push(eventDict);
        return snapshot;
    }
    /**
     * Create impression event params to be sent to the logging endpoint
     * @param  {ImpressionOptions}    options    Object containing values needed to build impression event
     * @return {EventLoggingEndpoint}            Params to be used in impression event logging endpoint call
     */
    function getImpressionEvent(options) {
        var commonParams = getCommonEventParams(options);
        var impressionEventParams = getImpressionEventParams(options.configObj, options.experimentId, options.variationId, options.ruleKey, options.ruleType, options.flagKey, options.enabled);
        commonParams.visitors[0].snapshots.push(impressionEventParams);
        var impressionEvent = {
            httpVerb: HTTP_VERB,
            url: ENDPOINT,
            params: commonParams,
        };
        return impressionEvent;
    }
    /**
     * Create conversion event params to be sent to the logging endpoint
     * @param  {ConversionEventOptions}  options   Object containing values needed to build conversion event
     * @return {EventLoggingEndpoint}              Params to be used in conversion event logging endpoint call
     */
    function getConversionEvent(options) {
        var commonParams = getCommonEventParams(options);
        var snapshot = getVisitorSnapshot(options.configObj, options.eventKey, options.logger, options.eventTags);
        commonParams.visitors[0].snapshots = [snapshot];
        var conversionEvent = {
            httpVerb: HTTP_VERB,
            url: ENDPOINT,
            params: commonParams,
        };
        return conversionEvent;
    }

    /**
     * Copyright 2020, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Get experiment key from the provided decision object
     * @param   {DecisionObj} decisionObj       Object representing decision
     * @returns {string}                        Experiment key or empty string if experiment is null
     */
    function getExperimentKey(decisionObj) {
        var _a, _b;
        return (_b = (_a = decisionObj.experiment) === null || _a === void 0 ? void 0 : _a.key) !== null && _b !== void 0 ? _b : '';
    }
    /**
     * Get variation key from the provided decision object
     * @param   {DecisionObj} decisionObj       Object representing decision
     * @returns {string}                        Variation key or empty string if variation is null
     */
    function getVariationKey(decisionObj) {
        var _a, _b;
        return (_b = (_a = decisionObj.variation) === null || _a === void 0 ? void 0 : _a.key) !== null && _b !== void 0 ? _b : '';
    }
    /**
     * Get featureEnabled from variation in the provided decision object
     * @param   {DecisionObj} decisionObj       Object representing decision
     * @returns {boolean}                       featureEnabled boolean or false if variation is null
     */
    function getFeatureEnabledFromVariation(decisionObj) {
        var _a, _b;
        return (_b = (_a = decisionObj.variation) === null || _a === void 0 ? void 0 : _a.featureEnabled) !== null && _b !== void 0 ? _b : false;
    }
    /**
     * Get experiment id from the provided decision object
     * @param   {DecisionObj} decisionObj       Object representing decision
     * @returns {string}                        Experiment id or null if experiment is null
     */
    function getExperimentId(decisionObj) {
        var _a, _b;
        return (_b = (_a = decisionObj.experiment) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
    }
    /**
     * Get variation id from the provided decision object
     * @param   {DecisionObj} decisionObj       Object representing decision
     * @returns {string}                        Variation id or null if variation is null
     */
    function getVariationId(decisionObj) {
        var _a, _b;
        return (_b = (_a = decisionObj.variation) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
    }

    /**
     * Copyright 2019-2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var logger$a = getLogger('EVENT_BUILDER');
    /**
     * Creates an ImpressionEvent object from decision data
     * @param  {ImpressionConfig}  config
     * @return {ImpressionEvent}   an ImpressionEvent object
     */
    var buildImpressionEvent = function (_a) {
        var configObj = _a.configObj, decisionObj = _a.decisionObj, userId = _a.userId, flagKey = _a.flagKey, enabled = _a.enabled, userAttributes = _a.userAttributes, clientEngine = _a.clientEngine, clientVersion = _a.clientVersion;
        var ruleType = decisionObj.decisionSource;
        var experimentKey = getExperimentKey(decisionObj);
        var experimentId = getExperimentId(decisionObj);
        var variationKey = getVariationKey(decisionObj);
        var variationId = getVariationId(decisionObj);
        var layerId = experimentId !== null ? getLayerId(configObj, experimentId) : null;
        return {
            type: 'impression',
            timestamp: fns.currentTimestamp(),
            uuid: fns.uuid(),
            user: {
                id: userId,
                attributes: buildVisitorAttributes(configObj, userAttributes),
            },
            context: {
                accountId: configObj.accountId,
                projectId: configObj.projectId,
                revision: configObj.revision,
                clientName: clientEngine,
                clientVersion: clientVersion,
                anonymizeIP: configObj.anonymizeIP || false,
                botFiltering: configObj.botFiltering,
            },
            layer: {
                id: layerId,
            },
            experiment: {
                id: experimentId,
                key: experimentKey,
            },
            variation: {
                id: variationId,
                key: variationKey,
            },
            ruleKey: experimentKey,
            flagKey: flagKey,
            ruleType: ruleType,
            enabled: enabled,
        };
    };
    /**
     * Creates a ConversionEvent object from track
     * @param  {ConversionConfig} config
     * @return {ConversionEvent}  a ConversionEvent object
     */
    var buildConversionEvent = function (_a) {
        var configObj = _a.configObj, userId = _a.userId, userAttributes = _a.userAttributes, clientEngine = _a.clientEngine, clientVersion = _a.clientVersion, eventKey = _a.eventKey, eventTags = _a.eventTags;
        var eventId = getEventId(configObj, eventKey);
        var revenue = eventTags ? getRevenueValue(eventTags, logger$a) : null;
        var eventValue = eventTags ? getEventValue(eventTags, logger$a) : null;
        return {
            type: 'conversion',
            timestamp: fns.currentTimestamp(),
            uuid: fns.uuid(),
            user: {
                id: userId,
                attributes: buildVisitorAttributes(configObj, userAttributes),
            },
            context: {
                accountId: configObj.accountId,
                projectId: configObj.projectId,
                revision: configObj.revision,
                clientName: clientEngine,
                clientVersion: clientVersion,
                anonymizeIP: configObj.anonymizeIP || false,
                botFiltering: configObj.botFiltering,
            },
            event: {
                id: eventId,
                key: eventKey,
            },
            revenue: revenue,
            value: eventValue,
            tags: eventTags,
        };
    };
    function buildVisitorAttributes(configObj, attributes) {
        var builtAttributes = [];
        // Omit attribute values that are not supported by the log endpoint.
        if (attributes) {
            Object.keys(attributes || {}).forEach(function (attributeKey) {
                var attributeValue = attributes[attributeKey];
                if (isAttributeValid(attributeKey, attributeValue)) {
                    var attributeId = getAttributeId(configObj, attributeKey, logger$a);
                    if (attributeId) {
                        builtAttributes.push({
                            entityId: attributeId,
                            key: attributeKey,
                            value: attributes[attributeKey],
                        });
                    }
                }
            });
        }
        return builtAttributes;
    }

    /**
     * Copyright 2017, 2020, 2022 Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var MODULE_NAME$b = 'EVENT_TAGS_VALIDATOR';
    /**
     * Validates user's provided event tags
     * @param  {unknown}  eventTags
     * @return {boolean} true if event tags are valid
     * @throws If event tags are not valid
     */
    function validate$3(eventTags) {
        if (typeof eventTags === 'object' && !Array.isArray(eventTags) && eventTags !== null) {
            return true;
        }
        else {
            throw new Error(sprintf(ERROR_MESSAGES.INVALID_EVENT_TAGS, MODULE_NAME$b));
        }
    }

    /****************************************************************************
     * Copyright 2017, 2020, 2022, Optimizely, Inc. and contributors                  *
     *                                                                          *
     * Licensed under the Apache License, Version 2.0 (the "License");          *
     * you may not use this file except in compliance with the License.         *
     * You may obtain a copy of the License at                                  *
     *                                                                          *
     *    http://www.apache.org/licenses/LICENSE-2.0                            *
     *                                                                          *
     * Unless required by applicable law or agreed to in writing, software      *
     * distributed under the License is distributed on an "AS IS" BASIS,        *
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
     * See the License for the specific language governing permissions and      *
     * limitations under the License.                                           *
     ***************************************************************************/
    var MODULE_NAME$c = 'USER_PROFILE_SERVICE_VALIDATOR';
    /**
     * Validates user's provided user profile service instance
     * @param  {unknown}  userProfileServiceInstance
     * @return {boolean} true if the instance is valid
     * @throws If the instance is not valid
     */
    function validate$4(userProfileServiceInstance) {
        if (typeof userProfileServiceInstance === 'object' && userProfileServiceInstance !== null) {
            if (typeof userProfileServiceInstance['lookup'] !== 'function') {
                throw new Error(sprintf(ERROR_MESSAGES.INVALID_USER_PROFILE_SERVICE, MODULE_NAME$c, "Missing function 'lookup'"));
            }
            else if (typeof userProfileServiceInstance['save'] !== 'function') {
                throw new Error(sprintf(ERROR_MESSAGES.INVALID_USER_PROFILE_SERVICE, MODULE_NAME$c, "Missing function 'save'"));
            }
            return true;
        }
        throw new Error(sprintf(ERROR_MESSAGES.INVALID_USER_PROFILE_SERVICE, MODULE_NAME$c));
    }

    /**
     * Copyright 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * https://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var EVENT_SENDING_FAILURE_MESSAGE = 'ODP event send failed';
    /**
     * Concrete implementation for accessing the ODP REST API
     */
    var RestApiManager = /** @class */ (function () {
        /**
         * Creates instance to access Optimizely Data Platform (ODP) REST API
         * @param logger Collect and record events/errors for this GraphQL implementation
         * @param timeout Milliseconds to wait for a response
         * @param requestHandler Desired request handler for testing
         */
        function RestApiManager(logger, timeout, requestHandler) {
            this.logger = logger;
            this.timeout = timeout !== null && timeout !== void 0 ? timeout : REQUEST_TIMEOUT_MS;
            this.requestHandler = requestHandler !== null && requestHandler !== void 0 ? requestHandler : RequestHandlerFactory.createHandler(this.logger);
        }
        /**
         * Service for sending ODP events to REST API
         * @param apiKey ODP public key
         * @param apiHost Host of ODP endpoint
         * @param events ODP events to send
         * @returns Retry is true - if network or server error (5xx), otherwise false
         */
        RestApiManager.prototype.sendEvents = function (apiKey, apiHost, events) {
            var _a;
            return __awaiter(this, void 0, void 0, function () {
                var shouldRetry, endpoint, data, method, headers, statusCode, request, response, err_1, message;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            console.log("Sending Events:", events);
                            shouldRetry = false;
                            if (!apiKey || !apiHost) {
                                console.log(LogLevel.ERROR, "".concat(EVENT_SENDING_FAILURE_MESSAGE, " (Parameters apiKey or apiHost invalid)"));
                                return [2 /*return*/, shouldRetry];
                            }
                            if (events.length === 0) {
                                console.log(LogLevel.ERROR, "".concat(EVENT_SENDING_FAILURE_MESSAGE, " (no events)"));
                                return [2 /*return*/, shouldRetry];
                            }
                            endpoint = "".concat(apiHost, "/v3/events");
                            data = JSON.stringify(events);
                            method = 'POST';
                            headers = {
                                'Content-Type': 'application/json',
                                'x-api-key': apiKey,
                            };
                            statusCode = 0;
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            request = this.requestHandler.makeRequest(endpoint, headers, method, data);
                            return [4 /*yield*/, request.responsePromise];
                        case 2:
                            response = _b.sent();
                            statusCode = (_a = response.statusCode) !== null && _a !== void 0 ? _a : statusCode;
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _b.sent();
                            message = 'network error';
                            if (err_1 instanceof Error) {
                                message = err_1.message;
                            }
                            console.log(LogLevel.ERROR, "".concat(EVENT_SENDING_FAILURE_MESSAGE, " (").concat(message, ")"));
                            shouldRetry = true;
                            return [3 /*break*/, 4];
                        case 4:
                            if (statusCode === 0) {
                                console.log(LogLevel.ERROR, "".concat(EVENT_SENDING_FAILURE_MESSAGE, " (network error)"));
                                shouldRetry = true;
                            }
                            if (statusCode >= 400) {
                                console.log(LogLevel.ERROR, "".concat(EVENT_SENDING_FAILURE_MESSAGE, " (").concat(statusCode, ")"));
                            }
                            if (statusCode >= 500) {
                                shouldRetry = true;
                            }
                            return [2 /*return*/, shouldRetry];
                    }
                });
            });
        };
        return RestApiManager;
    }());

    var MODULE_NAME$d = 'OPTIMIZELY';
    var DEFAULT_ONREADY_TIMEOUT = 30000;
    var Optimizely = /** @class */ (function () {
        function Optimizely(config) {
            var _this = this;
            var _a;
            var clientEngine = config.clientEngine;
            if (!clientEngine) {
                config.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.INVALID_CLIENT_ENGINE, MODULE_NAME$d, clientEngine);
                clientEngine = NODE_CLIENT_ENGINE;
            }
            this.clientEngine = clientEngine;
            this.clientVersion = config.clientVersion || NODE_CLIENT_VERSION;
            this.errorHandler = config.errorHandler;
            this.isOptimizelyConfigValid = config.isValidInstance;
            this.logger = config.logger;
            var decideOptionsArray = (_a = config.defaultDecideOptions) !== null && _a !== void 0 ? _a : [];
            if (!Array.isArray(decideOptionsArray)) {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.INVALID_DEFAULT_DECIDE_OPTIONS, MODULE_NAME$d);
                decideOptionsArray = [];
            }
            var defaultDecideOptions = {};
            decideOptionsArray.forEach(function (option) {
                // Filter out all provided default decide options that are not in OptimizelyDecideOption[]
                if (OptimizelyDecideOption[option]) {
                    defaultDecideOptions[option] = true;
                }
                else {
                    _this.logger.log(LOG_LEVEL.WARNING, LOG_MESSAGES.UNRECOGNIZED_DECIDE_OPTION, MODULE_NAME$d, option);
                }
            });
            this.defaultDecideOptions = defaultDecideOptions;
            this.projectConfigManager = createProjectConfigManager({
                datafile: config.datafile,
                jsonSchemaValidator: config.jsonSchemaValidator,
                sdkKey: config.sdkKey,
                datafileManager: config.datafileManager
            });
            this.disposeOnUpdate = this.projectConfigManager.onUpdate(function (configObj) {
                _this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.UPDATED_OPTIMIZELY_CONFIG, MODULE_NAME$d, configObj.revision, configObj.projectId);
                _this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE);
            });
            var projectConfigManagerReadyPromise = this.projectConfigManager.onReady();
            var userProfileService = null;
            if (config.userProfileService) {
                try {
                    if (validate$4(config.userProfileService)) {
                        userProfileService = config.userProfileService;
                        this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.VALID_USER_PROFILE_SERVICE, MODULE_NAME$d);
                    }
                }
                catch (ex) {
                    this.logger.log(LOG_LEVEL.WARNING, ex.message);
                }
            }
            this.decisionService = createDecisionService({
                userProfileService: userProfileService,
                logger: this.logger,
                UNSTABLE_conditionEvaluators: config.UNSTABLE_conditionEvaluators,
            });
            this.notificationCenter = config.notificationCenter;
            this.eventProcessor = config.eventProcessor;
            var eventProcessorStartedPromise = this.eventProcessor.start();
            this.readyPromise = Promise.all([projectConfigManagerReadyPromise, eventProcessorStartedPromise]).then(function (promiseResults) {
                // Only return status from project config promise because event processor promise does not return any status.
                return promiseResults[0];
            });
            this.readyTimeouts = {};
            this.nextReadyTimeoutId = 0;
        }
        /**
         * Returns a truthy value if this instance currently has a valid project config
         * object, and the initial configuration object that was passed into the
         * constructor was also valid.
         * @return {boolean}
         */
        Optimizely.prototype.isValidInstance = function () {
            return this.isOptimizelyConfigValid && !!this.projectConfigManager.getConfig();
        };
        /**
         * Buckets visitor and sends impression event to Optimizely.
         * @param  {string}             experimentKey
         * @param  {string}             userId
         * @param  {UserAttributes}     attributes
         * @return {string|null}        variation key
         */
        Optimizely.prototype.activate = function (experimentKey, userId, attributes) {
            try {
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'activate');
                    return null;
                }
                if (!this.validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
                    return this.notActivatingExperiment(experimentKey, userId);
                }
                var configObj = this.projectConfigManager.getConfig();
                if (!configObj) {
                    return null;
                }
                try {
                    var variationKey = this.getVariation(experimentKey, userId, attributes);
                    if (variationKey === null) {
                        return this.notActivatingExperiment(experimentKey, userId);
                    }
                    // If experiment is not set to 'Running' status, log accordingly and return variation key
                    if (!isRunning(configObj, experimentKey)) {
                        this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.SHOULD_NOT_DISPATCH_ACTIVATE, MODULE_NAME$d, experimentKey);
                        return variationKey;
                    }
                    var experiment = getExperimentFromKey(configObj, experimentKey);
                    var variation = experiment.variationKeyMap[variationKey];
                    var decisionObj = {
                        experiment: experiment,
                        variation: variation,
                        decisionSource: DECISION_SOURCES.EXPERIMENT
                    };
                    this.sendImpressionEvent(decisionObj, '', userId, true, attributes);
                    return variationKey;
                }
                catch (ex) {
                    this.logger.log(LOG_LEVEL.ERROR, ex.message);
                    this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.NOT_ACTIVATING_USER, MODULE_NAME$d, userId, experimentKey);
                    this.errorHandler.handleError(ex);
                    return null;
                }
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return null;
            }
        };
        /**
         * Create an impression event and call the event dispatcher's dispatch method to
         * send this event to Optimizely. Then use the notification center to trigger
         * any notification listeners for the ACTIVATE notification type.
         * @param {DecisionObj}    decisionObj    Decision Object
         * @param {string}         flagKey        Key for a feature flag
         * @param {string}         userId         ID of user to whom the variation was shown
         * @param {UserAttributes} attributes     Optional user attributes
         * @param {boolean}        enabled        Boolean representing if feature is enabled
         */
        Optimizely.prototype.sendImpressionEvent = function (decisionObj, flagKey, userId, enabled, attributes) {
            var configObj = this.projectConfigManager.getConfig();
            if (!configObj) {
                return;
            }
            var impressionEvent = buildImpressionEvent({
                decisionObj: decisionObj,
                flagKey: flagKey,
                enabled: enabled,
                userId: userId,
                userAttributes: attributes,
                clientEngine: this.clientEngine,
                clientVersion: this.clientVersion,
                configObj: configObj,
            });
            // TODO is it okay to not pass a projectConfig as second argument
            this.eventProcessor.process(impressionEvent);
            this.emitNotificationCenterActivate(decisionObj, flagKey, userId, enabled, attributes);
        };
        /**
         * Emit the ACTIVATE notification on the notificationCenter
         * @param  {DecisionObj}    decisionObj    Decision object
         * @param  {string}         flagKey        Key for a feature flag
         * @param  {string}         userId         ID of user to whom the variation was shown
         * @param  {boolean}        enabled        Boolean representing if feature is enabled
         * @param  {UserAttributes} attributes     Optional user attributes
         */
        Optimizely.prototype.emitNotificationCenterActivate = function (decisionObj, flagKey, userId, enabled, attributes) {
            var configObj = this.projectConfigManager.getConfig();
            if (!configObj) {
                return;
            }
            var ruleType = decisionObj.decisionSource;
            var experimentKey = getExperimentKey(decisionObj);
            var experimentId = getExperimentId(decisionObj);
            var variationKey = getVariationKey(decisionObj);
            var variationId = getVariationId(decisionObj);
            var experiment;
            if (experimentId !== null && variationKey !== '') {
                experiment = configObj.experimentIdMap[experimentId];
            }
            var impressionEventOptions = {
                attributes: attributes,
                clientEngine: this.clientEngine,
                clientVersion: this.clientVersion,
                configObj: configObj,
                experimentId: experimentId,
                ruleKey: experimentKey,
                flagKey: flagKey,
                ruleType: ruleType,
                userId: userId,
                enabled: enabled,
                variationId: variationId,
                logger: this.logger,
            };
            var impressionEvent = getImpressionEvent(impressionEventOptions);
            var variation;
            if (experiment && experiment.variationKeyMap && variationKey !== '') {
                variation = experiment.variationKeyMap[variationKey];
            }
            this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {
                experiment: experiment,
                userId: userId,
                attributes: attributes,
                variation: variation,
                logEvent: impressionEvent,
            });
        };
        /**
         * Sends conversion event to Optimizely.
         * @param  {string}         eventKey
         * @param  {string}         userId
         * @param  {UserAttributes} attributes
         * @param  {EventTags}      eventTags Values associated with the event.
         */
        Optimizely.prototype.track = function (eventKey, userId, attributes, eventTags) {
            try {
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'track');
                    return;
                }
                if (!this.validateInputs({ user_id: userId, event_key: eventKey }, attributes, eventTags)) {
                    return;
                }
                var configObj = this.projectConfigManager.getConfig();
                if (!configObj) {
                    return;
                }
                if (!eventWithKeyExists(configObj, eventKey)) {
                    this.logger.log(LOG_LEVEL.WARNING, LOG_MESSAGES.EVENT_KEY_NOT_FOUND, MODULE_NAME$d, eventKey);
                    this.logger.log(LOG_LEVEL.WARNING, LOG_MESSAGES.NOT_TRACKING_USER, MODULE_NAME$d, userId);
                    return;
                }
                // remove null values from eventTags
                eventTags = this.filterEmptyValues(eventTags);
                var conversionEvent = buildConversionEvent({
                    eventKey: eventKey,
                    eventTags: eventTags,
                    userId: userId,
                    userAttributes: attributes,
                    clientEngine: this.clientEngine,
                    clientVersion: this.clientVersion,
                    configObj: configObj,
                });
                this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.TRACK_EVENT, MODULE_NAME$d, eventKey, userId);
                // TODO is it okay to not pass a projectConfig as second argument
                this.eventProcessor.process(conversionEvent);
                this.emitNotificationCenterTrack(eventKey, userId, attributes, eventTags);
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.NOT_TRACKING_USER, MODULE_NAME$d, userId);
            }
        };
        /**
         * Send TRACK event to notificationCenter
         * @param  {string}         eventKey
         * @param  {string}         userId
         * @param  {UserAttributes} attributes
         * @param  {EventTags}      eventTags Values associated with the event.
         */
        Optimizely.prototype.emitNotificationCenterTrack = function (eventKey, userId, attributes, eventTags) {
            try {
                var configObj = this.projectConfigManager.getConfig();
                if (!configObj) {
                    return;
                }
                var conversionEventOptions = {
                    attributes: attributes,
                    clientEngine: this.clientEngine,
                    clientVersion: this.clientVersion,
                    configObj: configObj,
                    eventKey: eventKey,
                    eventTags: eventTags,
                    logger: this.logger,
                    userId: userId,
                };
                var conversionEvent = getConversionEvent(conversionEventOptions);
                this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.TRACK, {
                    eventKey: eventKey,
                    userId: userId,
                    attributes: attributes,
                    eventTags: eventTags,
                    logEvent: conversionEvent,
                });
            }
            catch (ex) {
                this.logger.log(LOG_LEVEL.ERROR, ex.message);
                this.errorHandler.handleError(ex);
            }
        };
        /**
         * Gets variation where visitor will be bucketed.
         * @param  {string}              experimentKey
         * @param  {string}              userId
         * @param  {UserAttributes}      attributes
         * @return {string|null}         variation key
         */
        Optimizely.prototype.getVariation = function (experimentKey, userId, attributes) {
            try {
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'getVariation');
                    return null;
                }
                try {
                    if (!this.validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
                        return null;
                    }
                    var configObj = this.projectConfigManager.getConfig();
                    if (!configObj) {
                        return null;
                    }
                    var experiment = configObj.experimentKeyMap[experimentKey];
                    if (!experiment) {
                        this.logger.log(LOG_LEVEL.DEBUG, ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME$d, experimentKey);
                        return null;
                    }
                    var variationKey = this.decisionService.getVariation(configObj, experiment, this.createUserContext(userId, attributes)).result;
                    var decisionNotificationType = isFeatureExperiment(configObj, experiment.id)
                        ? DECISION_NOTIFICATION_TYPES.FEATURE_TEST
                        : DECISION_NOTIFICATION_TYPES.AB_TEST;
                    this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
                        type: decisionNotificationType,
                        userId: userId,
                        attributes: attributes || {},
                        decisionInfo: {
                            experimentKey: experimentKey,
                            variationKey: variationKey,
                        },
                    });
                    return variationKey;
                }
                catch (ex) {
                    this.logger.log(LOG_LEVEL.ERROR, ex.message);
                    this.errorHandler.handleError(ex);
                    return null;
                }
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return null;
            }
        };
        /**
         * Force a user into a variation for a given experiment.
         * @param  {string}      experimentKey
         * @param  {string}      userId
         * @param  {string|null} variationKey   user will be forced into. If null,
         *                                      then clear the existing experiment-to-variation mapping.
         * @return {boolean}                    A boolean value that indicates if the set completed successfully.
         */
        Optimizely.prototype.setForcedVariation = function (experimentKey, userId, variationKey) {
            if (!this.validateInputs({ experiment_key: experimentKey, user_id: userId })) {
                return false;
            }
            var configObj = this.projectConfigManager.getConfig();
            if (!configObj) {
                return false;
            }
            try {
                return this.decisionService.setForcedVariation(configObj, experimentKey, userId, variationKey);
            }
            catch (ex) {
                this.logger.log(LOG_LEVEL.ERROR, ex.message);
                this.errorHandler.handleError(ex);
                return false;
            }
        };
        /**
         * Gets the forced variation for a given user and experiment.
         * @param  {string}      experimentKey
         * @param  {string}      userId
         * @return {string|null} The forced variation key.
         */
        Optimizely.prototype.getForcedVariation = function (experimentKey, userId) {
            if (!this.validateInputs({ experiment_key: experimentKey, user_id: userId })) {
                return null;
            }
            var configObj = this.projectConfigManager.getConfig();
            if (!configObj) {
                return null;
            }
            try {
                return this.decisionService.getForcedVariation(configObj, experimentKey, userId).result;
            }
            catch (ex) {
                this.logger.log(LOG_LEVEL.ERROR, ex.message);
                this.errorHandler.handleError(ex);
                return null;
            }
        };
        /**
         * Validate string inputs, user attributes and event tags.
         * @param  {StringInputs}  stringInputs   Map of string keys and associated values
         * @param  {unknown}       userAttributes Optional parameter for user's attributes
         * @param  {unknown}       eventTags      Optional parameter for event tags
         * @return {boolean}                      True if inputs are valid
         *
         */
        Optimizely.prototype.validateInputs = function (stringInputs, userAttributes, eventTags) {
            try {
                // if (stringInputs.hasOwnProperty('user_id')) {
                //   const userId = stringInputs['user_id'];
                //   if (typeof userId !== 'string' || userId === null || userId === 'undefined') {
                //     throw new Error(sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, MODULE_NAME, 'user_id'));
                //   }
                //   delete stringInputs['user_id'];
                // }
                Object.keys(stringInputs).forEach(function (key) {
                    if (!validate$1(stringInputs[key])) {
                        throw new Error(sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, MODULE_NAME$d, key));
                    }
                });
                if (userAttributes) {
                    validate$2(userAttributes);
                }
                if (eventTags) {
                    validate$3(eventTags);
                }
                return true;
            }
            catch (ex) {
                this.logger.log(LOG_LEVEL.ERROR, ex.message);
                this.errorHandler.handleError(ex);
                return false;
            }
        };
        /**
         * Shows failed activation log message and returns null when user is not activated in experiment
         * @param  {string} experimentKey
         * @param  {string} userId
         * @return {null}
         */
        Optimizely.prototype.notActivatingExperiment = function (experimentKey, userId) {
            this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.NOT_ACTIVATING_USER, MODULE_NAME$d, userId, experimentKey);
            return null;
        };
        /**
         * Filters out attributes/eventTags with null or undefined values
         * @param   {EventTags | undefined} map
         * @returns {EventTags | undefined}
         */
        Optimizely.prototype.filterEmptyValues = function (map) {
            for (var key in map) {
                if (map.hasOwnProperty(key) && (map[key] === null || map[key] === undefined)) {
                    delete map[key];
                }
            }
            return map;
        };
        /**
         * Returns true if the feature is enabled for the given user.
         * @param  {string}         featureKey   Key of feature which will be checked
         * @param  {string}         userId       ID of user which will be checked
         * @param  {UserAttributes} attributes   Optional user attributes
         * @return {boolean}                     true if the feature is enabled for the user, false otherwise
         */
        Optimizely.prototype.isFeatureEnabled = function (featureKey, userId, attributes) {
            try {
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'isFeatureEnabled');
                    return false;
                }
                if (!this.validateInputs({ feature_key: featureKey, user_id: userId }, attributes)) {
                    return false;
                }
                var configObj = this.projectConfigManager.getConfig();
                if (!configObj) {
                    return false;
                }
                var feature = getFeatureFromKey(configObj, featureKey, this.logger);
                if (!feature) {
                    return false;
                }
                var sourceInfo = {};
                var user = this.createUserContext(userId, attributes);
                var decisionObj = this.decisionService.getVariationForFeature(configObj, feature, user).result;
                var decisionSource = decisionObj.decisionSource;
                var experimentKey = getExperimentKey(decisionObj);
                var variationKey = getVariationKey(decisionObj);
                var featureEnabled = getFeatureEnabledFromVariation(decisionObj);
                if (decisionSource === DECISION_SOURCES.FEATURE_TEST) {
                    sourceInfo = {
                        experimentKey: experimentKey,
                        variationKey: variationKey,
                    };
                }
                if (decisionSource === DECISION_SOURCES.FEATURE_TEST ||
                    decisionSource === DECISION_SOURCES.ROLLOUT && getSendFlagDecisionsValue(configObj)) {
                    this.sendImpressionEvent(decisionObj, feature.key, userId, featureEnabled, attributes);
                }
                if (featureEnabled === true) {
                    this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.FEATURE_ENABLED_FOR_USER, MODULE_NAME$d, featureKey, userId);
                }
                else {
                    this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.FEATURE_NOT_ENABLED_FOR_USER, MODULE_NAME$d, featureKey, userId);
                    featureEnabled = false;
                }
                var featureInfo = {
                    featureKey: featureKey,
                    featureEnabled: featureEnabled,
                    source: decisionObj.decisionSource,
                    sourceInfo: sourceInfo,
                };
                this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE,
                    userId: userId,
                    attributes: attributes || {},
                    decisionInfo: featureInfo,
                });
                return featureEnabled;
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return false;
            }
        };
        /**
         * Returns an Array containing the keys of all features in the project that are
         * enabled for the given user.
         * @param  {string}         userId
         * @param  {UserAttributes} attributes
         * @return {string[]}       Array of feature keys (strings)
         */
        Optimizely.prototype.getEnabledFeatures = function (userId, attributes) {
            var _this = this;
            try {
                var enabledFeatures_1 = [];
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'getEnabledFeatures');
                    return enabledFeatures_1;
                }
                if (!this.validateInputs({ user_id: userId })) {
                    return enabledFeatures_1;
                }
                var configObj = this.projectConfigManager.getConfig();
                if (!configObj) {
                    return enabledFeatures_1;
                }
                objectValues(configObj.featureKeyMap).forEach(function (feature) {
                    if (_this.isFeatureEnabled(feature.key, userId, attributes)) {
                        enabledFeatures_1.push(feature.key);
                    }
                });
                return enabledFeatures_1;
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return [];
            }
        };
        /**
         * Returns dynamically-typed value of the variable attached to the given
         * feature flag. Returns null if the feature key or variable key is invalid.
         *
         * @param  {string}          featureKey           Key of the feature whose variable's
         *                                                value is being accessed
         * @param  {string}          variableKey          Key of the variable whose value is
         *                                                being accessed
         * @param  {string}          userId               ID for the user
         * @param  {UserAttributes}  attributes           Optional user attributes
         * @return {unknown}                              Value of the variable cast to the appropriate
         *                                                type, or null if the feature key is invalid or
         *                                                the variable key is invalid
         */
        Optimizely.prototype.getFeatureVariable = function (featureKey, variableKey, userId, attributes) {
            try {
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'getFeatureVariable');
                    return null;
                }
                return this.getFeatureVariableForType(featureKey, variableKey, null, userId, attributes);
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return null;
            }
        };
        /**
         * Helper method to get the value for a variable of a certain type attached to a
         * feature flag. Returns null if the feature key is invalid, the variable key is
         * invalid, the given variable type does not match the variable's actual type,
         * or the variable value cannot be cast to the required type. If the given variable
         * type is null, the value of the variable cast to the appropriate type is returned.
         *
         * @param   {string}         featureKey           Key of the feature whose variable's value is
         *                                                being accessed
         * @param   {string}         variableKey          Key of the variable whose value is being
         *                                                accessed
         * @param   {string|null}    variableType         Type of the variable whose value is being
         *                                                accessed (must be one of FEATURE_VARIABLE_TYPES
         *                                                in lib/utils/enums/index.js), or null to return the
         *                                                value of the variable cast to the appropriate type
         * @param   {string}         userId               ID for the user
         * @param   {UserAttributes} attributes           Optional user attributes
         * @return  {unknown}                             Value of the variable cast to the appropriate
         *                                                type, or null if the feature key is invalid, thevariable
         *                                                key is invalid, or there is a mismatch with the type of
         *                                                the variable
         */
        Optimizely.prototype.getFeatureVariableForType = function (featureKey, variableKey, variableType, userId, attributes) {
            if (!this.validateInputs({ feature_key: featureKey, variable_key: variableKey, user_id: userId }, attributes)) {
                return null;
            }
            var configObj = this.projectConfigManager.getConfig();
            if (!configObj) {
                return null;
            }
            var featureFlag = getFeatureFromKey(configObj, featureKey, this.logger);
            if (!featureFlag) {
                return null;
            }
            var variable = getVariableForFeature(configObj, featureKey, variableKey, this.logger);
            if (!variable) {
                return null;
            }
            if (variableType && variable.type !== variableType) {
                this.logger.log(LOG_LEVEL.WARNING, LOG_MESSAGES.VARIABLE_REQUESTED_WITH_WRONG_TYPE, MODULE_NAME$d, variableType, variable.type);
                return null;
            }
            var user = this.createUserContext(userId, attributes);
            var decisionObj = this.decisionService.getVariationForFeature(configObj, featureFlag, user).result;
            var featureEnabled = getFeatureEnabledFromVariation(decisionObj);
            var variableValue = this.getFeatureVariableValueFromVariation(featureKey, featureEnabled, decisionObj.variation, variable, userId);
            var sourceInfo = {};
            if (decisionObj.decisionSource === DECISION_SOURCES.FEATURE_TEST &&
                decisionObj.experiment !== null &&
                decisionObj.variation !== null) {
                sourceInfo = {
                    experimentKey: decisionObj.experiment.key,
                    variationKey: decisionObj.variation.key,
                };
            }
            this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
                type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                userId: userId,
                attributes: attributes || {},
                decisionInfo: {
                    featureKey: featureKey,
                    featureEnabled: featureEnabled,
                    source: decisionObj.decisionSource,
                    variableKey: variableKey,
                    variableValue: variableValue,
                    variableType: variable.type,
                    sourceInfo: sourceInfo,
                },
            });
            return variableValue;
        };
        /**
         * Helper method to get the non type-casted value for a variable attached to a
         * feature flag. Returns appropriate variable value depending on whether there
         * was a matching variation, feature was enabled or not or varible was part of the
         * available variation or not. Also logs the appropriate message explaining how it
         * evaluated the value of the variable.
         *
         * @param  {string}          featureKey           Key of the feature whose variable's value is
         *                                                being accessed
         * @param  {boolean}         featureEnabled       Boolean indicating if feature is enabled or not
         * @param  {Variation}       variation            variation returned by decision service
         * @param  {FeatureVariable} variable             varible whose value is being evaluated
         * @param  {string}          userId               ID for the user
         * @return {unknown}                              Value of the variable or null if the
         *                                                config Obj is null
         */
        Optimizely.prototype.getFeatureVariableValueFromVariation = function (featureKey, featureEnabled, variation, variable, userId) {
            var configObj = this.projectConfigManager.getConfig();
            if (!configObj) {
                return null;
            }
            var variableValue = variable.defaultValue;
            if (variation !== null) {
                var value = getVariableValueForVariation(configObj, variable, variation, this.logger);
                if (value !== null) {
                    if (featureEnabled) {
                        variableValue = value;
                        this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_RECEIVED_VARIABLE_VALUE, MODULE_NAME$d, variableValue, variable.key, featureKey);
                    }
                    else {
                        this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE, MODULE_NAME$d, featureKey, userId, variableValue);
                    }
                }
                else {
                    this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE, MODULE_NAME$d, variable.key, variation.key);
                }
            }
            else {
                this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.USER_RECEIVED_DEFAULT_VARIABLE_VALUE, MODULE_NAME$d, userId, variable.key, featureKey);
            }
            return getTypeCastValue(variableValue, variable.type, this.logger);
        };
        /**
         * Returns value for the given boolean variable attached to the given feature
         * flag.
         * @param  {string}         featureKey   Key of the feature whose variable's value is
         *                                       being accessed
         * @param  {string}         variableKey  Key of the variable whose value is being
         *                                       accessed
         * @param  {string}         userId       ID for the user
         * @param  {UserAttributes} attributes   Optional user attributes
         * @return {boolean|null}                Boolean value of the variable, or null if the
         *                                       feature key is invalid, the variable key is invalid,
         *                                       or there is a mismatch with the type of the variable.
         */
        Optimizely.prototype.getFeatureVariableBoolean = function (featureKey, variableKey, userId, attributes) {
            try {
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'getFeatureVariableBoolean');
                    return null;
                }
                return this.getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.BOOLEAN, userId, attributes);
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return null;
            }
        };
        /**
         * Returns value for the given double variable attached to the given feature
         * flag.
         * @param  {string} featureKey           Key of the feature whose variable's value is
         *                                       being accessed
         * @param  {string} variableKey          Key of the variable whose value is being
         *                                       accessed
         * @param  {string} userId               ID for the user
         * @param  {UserAttributes} attributes   Optional user attributes
         * @return {number|null}                 Number value of the variable, or null if the
         *                                       feature key is invalid, the variable key is
         *                                       invalid, or there is a mismatch with the type
         *                                       of the variable
         */
        Optimizely.prototype.getFeatureVariableDouble = function (featureKey, variableKey, userId, attributes) {
            try {
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'getFeatureVariableDouble');
                    return null;
                }
                return this.getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.DOUBLE, userId, attributes);
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return null;
            }
        };
        /**
         * Returns value for the given integer variable attached to the given feature
         * flag.
         * @param  {string}         featureKey   Key of the feature whose variable's value is
         *                                       being accessed
         * @param  {string}         variableKey  Key of the variable whose value is being
         *                                       accessed
         * @param  {string}         userId       ID for the user
         * @param  {UserAttributes} attributes   Optional user attributes
         * @return {number|null}                 Number value of the variable, or null if the
         *                                       feature key is invalid, the variable key is
         *                                       invalid, or there is a mismatch with the type
         *                                       of the variable
         */
        Optimizely.prototype.getFeatureVariableInteger = function (featureKey, variableKey, userId, attributes) {
            try {
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'getFeatureVariableInteger');
                    return null;
                }
                return this.getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.INTEGER, userId, attributes);
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return null;
            }
        };
        /**
         * Returns value for the given string variable attached to the given feature
         * flag.
         * @param  {string}         featureKey   Key of the feature whose variable's value is
         *                                       being accessed
         * @param  {string}         variableKey  Key of the variable whose value is being
         *                                       accessed
         * @param  {string}         userId       ID for the user
         * @param  {UserAttributes} attributes   Optional user attributes
         * @return {string|null}                 String value of the variable, or null if the
         *                                       feature key is invalid, the variable key is
         *                                       invalid, or there is a mismatch with the type
         *                                       of the variable
         */
        Optimizely.prototype.getFeatureVariableString = function (featureKey, variableKey, userId, attributes) {
            try {
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'getFeatureVariableString');
                    return null;
                }
                return this.getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.STRING, userId, attributes);
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return null;
            }
        };
        /**
         * Returns value for the given json variable attached to the given feature
         * flag.
         * @param  {string}         featureKey   Key of the feature whose variable's value is
         *                                       being accessed
         * @param  {string}         variableKey  Key of the variable whose value is being
         *                                       accessed
         * @param  {string}         userId       ID for the user
         * @param  {UserAttributes} attributes   Optional user attributes
         * @return {unknown}                     Object value of the variable, or null if the
         *                                       feature key is invalid, the variable key is
         *                                       invalid, or there is a mismatch with the type
         *                                       of the variable
         */
        Optimizely.prototype.getFeatureVariableJSON = function (featureKey, variableKey, userId, attributes) {
            try {
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'getFeatureVariableJSON');
                    return null;
                }
                return this.getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.JSON, userId, attributes);
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return null;
            }
        };
        /**
         * Returns values for all the variables attached to the given feature
         * flag.
         * @param  {string}         featureKey   Key of the feature whose variables are being
         *                                       accessed
         * @param  {string}         userId       ID for the user
         * @param  {UserAttributes} attributes   Optional user attributes
         * @return {object|null}                 Object containing all the variables, or null if the
         *                                       feature key is invalid
         */
        Optimizely.prototype.getAllFeatureVariables = function (featureKey, userId, attributes) {
            var _this = this;
            try {
                if (!this.isValidInstance()) {
                    this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'getAllFeatureVariables');
                    return null;
                }
                if (!this.validateInputs({ feature_key: featureKey, user_id: userId }, attributes)) {
                    return null;
                }
                var configObj = this.projectConfigManager.getConfig();
                if (!configObj) {
                    return null;
                }
                var featureFlag = getFeatureFromKey(configObj, featureKey, this.logger);
                if (!featureFlag) {
                    return null;
                }
                var user = this.createUserContext(userId, attributes);
                var decisionObj_1 = this.decisionService.getVariationForFeature(configObj, featureFlag, user).result;
                var featureEnabled_1 = getFeatureEnabledFromVariation(decisionObj_1);
                var allVariables_1 = {};
                featureFlag.variables.forEach(function (variable) {
                    allVariables_1[variable.key] = _this.getFeatureVariableValueFromVariation(featureKey, featureEnabled_1, decisionObj_1.variation, variable, userId);
                });
                var sourceInfo = {};
                if (decisionObj_1.decisionSource === DECISION_SOURCES.FEATURE_TEST &&
                    decisionObj_1.experiment !== null &&
                    decisionObj_1.variation !== null) {
                    sourceInfo = {
                        experimentKey: decisionObj_1.experiment.key,
                        variationKey: decisionObj_1.variation.key,
                    };
                }
                this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
                    type: DECISION_NOTIFICATION_TYPES.ALL_FEATURE_VARIABLES,
                    userId: userId,
                    attributes: attributes || {},
                    decisionInfo: {
                        featureKey: featureKey,
                        featureEnabled: featureEnabled_1,
                        source: decisionObj_1.decisionSource,
                        variableValues: allVariables_1,
                        sourceInfo: sourceInfo,
                    },
                });
                return allVariables_1;
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return null;
            }
        };
        /**
         * Returns OptimizelyConfig object containing experiments and features data
         * @return {OptimizelyConfig|null}
         *
         * OptimizelyConfig Object Schema
         * {
         *   'experimentsMap': {
         *     'my-fist-experiment': {
         *       'id': '111111',
         *       'key': 'my-fist-experiment'
         *       'variationsMap': {
         *         'variation_1': {
         *           'id': '121212',
         *           'key': 'variation_1',
         *           'variablesMap': {
         *             'age': {
         *               'id': '222222',
         *               'key': 'age',
         *               'type': 'integer',
         *               'value': '0',
         *             }
         *           }
         *         }
         *       }
         *     }
         *   },
         *   'featuresMap': {
         *     'awesome-feature': {
         *       'id': '333333',
         *       'key': 'awesome-feature',
         *       'experimentsMap': Object,
         *       'variationsMap': Object,
         *     }
         *   }
         * }
         */
        Optimizely.prototype.getOptimizelyConfig = function () {
            try {
                var configObj = this.projectConfigManager.getConfig();
                if (!configObj) {
                    return null;
                }
                return this.projectConfigManager.getOptimizelyConfig();
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return null;
            }
        };
        /**
         * Stop background processes belonging to this instance, including:
         *
         * - Active datafile requests
         * - Pending datafile requests
         * - Pending event queue flushes
         *
         * In-flight datafile requests will be aborted. Any events waiting to be sent
         * as part of a batched event request will be immediately flushed to the event
         * dispatcher.
         *
         * Returns a Promise that fulfills after all in-flight event dispatcher requests
         * (including any final request resulting from flushing the queue as described
         * above) are complete. If there are no in-flight event dispatcher requests and
         * no queued events waiting to be sent, returns an immediately-fulfilled Promise.
         *
         * Returned Promises are fulfilled with result objects containing these
         * properties:
         *    - success (boolean): true if the event dispatcher signaled completion of
         *                         all in-flight and final requests, or if there were no
         *                         queued events and no in-flight requests. false if an
         *                         unexpected error was encountered during the close
         *                         process.
         *    - reason (string=):  If success is false, this is a string property with
         *                         an explanatory message.
         *
         * NOTE: After close is called, this instance is no longer usable - any events
         * generated will no longer be sent to the event dispatcher.
         *
         * @return {Promise}
         */
        Optimizely.prototype.close = function () {
            var _this = this;
            try {
                var eventProcessorStoppedPromise = this.eventProcessor.stop();
                if (this.disposeOnUpdate) {
                    this.disposeOnUpdate();
                    this.disposeOnUpdate = null;
                }
                if (this.projectConfigManager) {
                    this.projectConfigManager.stop();
                }
                Object.keys(this.readyTimeouts).forEach(function (readyTimeoutId) {
                    var readyTimeoutRecord = _this.readyTimeouts[readyTimeoutId];
                    clearTimeout(readyTimeoutRecord.readyTimeout);
                    readyTimeoutRecord.onClose();
                });
                this.readyTimeouts = {};
                return eventProcessorStoppedPromise.then(function () {
                    return {
                        success: true,
                    };
                }, function (err) {
                    return {
                        success: false,
                        reason: String(err),
                    };
                });
            }
            catch (err) {
                this.logger.log(LOG_LEVEL.ERROR, err.message);
                this.errorHandler.handleError(err);
                return Promise.resolve({
                    success: false,
                    reason: String(err),
                });
            }
        };
        /**
         * Returns a Promise that fulfills when this instance is ready to use (meaning
         * it has a valid datafile), or has failed to become ready within a period of
         * time (configurable by the timeout property of the options argument), or when
         * this instance is closed via the close method.
         *
         * If a valid datafile was provided in the constructor, the returned Promise is
         * immediately fulfilled. If an sdkKey was provided, a manager will be used to
         * fetch  a datafile, and the returned promise will fulfill if that fetch
         * succeeds or fails before the timeout. The default timeout is 30 seconds,
         * which will be used if no timeout is provided in the argument options object.
         *
         * The returned Promise is fulfilled with a result object containing these
         * properties:
         *    - success (boolean): True if this instance is ready to use with a valid
         *                         datafile, or false if this instance failed to become
         *                         ready or was closed prior to becoming ready.
         *    - reason (string=):  If success is false, this is a string property with
         *                         an explanatory message. Failure could be due to
         *                         expiration of the timeout, network errors,
         *                         unsuccessful responses, datafile parse errors,
         *                         datafile validation errors, or the instance being
         *                         closed
         * @param  {Object=}          options
         * @param  {number|undefined} options.timeout
         * @return {Promise}
         */
        Optimizely.prototype.onReady = function (options) {
            var _this = this;
            var timeoutValue;
            if (typeof options === 'object' && options !== null) {
                if (options.timeout !== undefined) {
                    timeoutValue = options.timeout;
                }
            }
            if (!fns.isSafeInteger(timeoutValue)) {
                timeoutValue = DEFAULT_ONREADY_TIMEOUT;
            }
            var resolveTimeoutPromise;
            var timeoutPromise = new Promise(function (resolve) {
                resolveTimeoutPromise = resolve;
            });
            var timeoutId = this.nextReadyTimeoutId;
            this.nextReadyTimeoutId++;
            var onReadyTimeout = (function () {
                delete _this.readyTimeouts[timeoutId];
                resolveTimeoutPromise({
                    success: false,
                    reason: sprintf('onReady timeout expired after %s ms', timeoutValue),
                });
            });
            var readyTimeout = setTimeout(onReadyTimeout, timeoutValue);
            var onClose = function () {
                resolveTimeoutPromise({
                    success: false,
                    reason: 'Instance closed',
                });
            };
            this.readyTimeouts[timeoutId] = {
                readyTimeout: readyTimeout,
                onClose: onClose,
            };
            this.readyPromise.then(function () {
                clearTimeout(readyTimeout);
                delete _this.readyTimeouts[timeoutId];
                resolveTimeoutPromise({
                    success: true,
                });
            });
            return Promise.race([this.readyPromise, timeoutPromise]);
        };
        //============ decide ============//
        /**
         * Creates a context of the user for which decision APIs will be called.
         *
         * A user context will be created successfully even when the SDK is not fully configured yet, so no
         * this.isValidInstance() check is performed here.
         *
         * @param  {string}          userId      The user ID to be used for bucketing.
         * @param  {UserAttributes}  attributes  Optional user attributes.
         * @return {OptimizelyUserContext|null}  An OptimizelyUserContext associated with this OptimizelyClient or
         *                                       null if provided inputs are invalid
         */
        Optimizely.prototype.createUserContext = function (userId, attributes) {
            // if (!this.validateInputs({ user_id: userId }, attributes)) {
            //   return null;
            // }
            return new OptimizelyUserContext({
                optimizely: this,
                userId: userId,
                attributes: attributes
            });
        };
        Optimizely.prototype.sendOdpEvents = function (events) {
            return __awaiter(this, void 0, void 0, function () {
                var apiManager;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            apiManager = new RestApiManager({
                                log: function (level, message) {
                                    console.log(level, message);
                                }
                            });
                            console.log('Sending ODP Event with following params:');
                            console.log('- Key: ', this.odpInformation.key);
                            console.log('- Host: ', this.odpInformation.key);
                            console.log('- Events: ', events);
                            return [4 /*yield*/, apiManager.sendEvents(this.odpInformation.key, this.odpInformation.host, events)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, true];
                        case 2:
                            _a.sent();
                            console.error('Unable to send ODP Event');
                            return [2 /*return*/, false];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        Optimizely.prototype.decide = function (user, key, options) {
            var _this = this;
            var _a, _b, _c, _d;
            if (options === void 0) { options = []; }
            var userId = user.getUserId();
            var attributes = user.getAttributes();
            var configObj = this.projectConfigManager.getConfig();
            var reasons = [];
            var decisionObj;
            if (!this.isValidInstance() || !configObj) {
                this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'decide');
                return newErrorDecision(key, user, [DECISION_MESSAGES.SDK_NOT_READY]);
            }
            var feature = configObj.featureKeyMap[key];
            if (!feature) {
                this.logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.FEATURE_NOT_IN_DATAFILE, MODULE_NAME$d, key);
                return newErrorDecision(key, user, [sprintf(DECISION_MESSAGES.FLAG_KEY_INVALID, key)]);
            }
            var allDecideOptions = this.getAllDecideOptions(options);
            var forcedDecisionResponse = this.decisionService.findValidatedForcedDecision(configObj, user, key);
            reasons.push.apply(reasons, forcedDecisionResponse.reasons);
            var variation = forcedDecisionResponse.result;
            if (variation) {
                decisionObj = {
                    experiment: null,
                    variation: variation,
                    decisionSource: DECISION_SOURCES.FEATURE_TEST
                };
            }
            else {
                var decisionVariation = this.decisionService.getVariationForFeature(configObj, feature, user, allDecideOptions);
                reasons.push.apply(reasons, decisionVariation.reasons);
                decisionObj = decisionVariation.result;
            }
            var decisionSource = decisionObj.decisionSource;
            var experimentKey = (_b = (_a = decisionObj.experiment) === null || _a === void 0 ? void 0 : _a.key) !== null && _b !== void 0 ? _b : null;
            var variationKey = (_d = (_c = decisionObj.variation) === null || _c === void 0 ? void 0 : _c.key) !== null && _d !== void 0 ? _d : null;
            var flagEnabled = getFeatureEnabledFromVariation(decisionObj);
            if (flagEnabled === true) {
                this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.FEATURE_ENABLED_FOR_USER, MODULE_NAME$d, key, userId);
            }
            else {
                this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.FEATURE_NOT_ENABLED_FOR_USER, MODULE_NAME$d, key, userId);
            }
            var variablesMap = {};
            var decisionEventDispatched = false;
            if (!allDecideOptions[OptimizelyDecideOption.EXCLUDE_VARIABLES]) {
                feature.variables.forEach(function (variable) {
                    variablesMap[variable.key] =
                        _this.getFeatureVariableValueFromVariation(key, flagEnabled, decisionObj.variation, variable, userId);
                });
            }
            if (!allDecideOptions[OptimizelyDecideOption.DISABLE_DECISION_EVENT] && (decisionSource === DECISION_SOURCES.FEATURE_TEST ||
                decisionSource === DECISION_SOURCES.ROLLOUT && getSendFlagDecisionsValue(configObj))) {
                this.sendImpressionEvent(decisionObj, key, userId, flagEnabled, attributes);
                decisionEventDispatched = true;
            }
            var shouldIncludeReasons = allDecideOptions[OptimizelyDecideOption.INCLUDE_REASONS];
            var reportedReasons = [];
            if (shouldIncludeReasons) {
                reportedReasons = reasons.map(function (reason) { return sprintf.apply(void 0, __spreadArray([reason[0]], reason.slice(1), false)); });
            }
            var featureInfo = {
                flagKey: key,
                enabled: flagEnabled,
                variationKey: variationKey,
                ruleKey: experimentKey,
                variables: variablesMap,
                reasons: reportedReasons,
                decisionEventDispatched: decisionEventDispatched,
            };
            this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
                type: DECISION_NOTIFICATION_TYPES.FLAG,
                userId: userId,
                attributes: attributes,
                decisionInfo: featureInfo,
            });
            return {
                variationKey: variationKey,
                enabled: flagEnabled,
                variables: variablesMap,
                ruleKey: experimentKey,
                flagKey: key,
                userContext: user,
                reasons: reportedReasons,
            };
        };
        /**
         * Get all decide options.
         * @param  {OptimizelyDecideOption[]}          options   decide options
         * @return {[key: string]: boolean}             Map of all provided decide options including default decide options
         */
        Optimizely.prototype.getAllDecideOptions = function (options) {
            var _this = this;
            var allDecideOptions = __assign({}, this.defaultDecideOptions);
            if (!Array.isArray(options)) {
                this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.INVALID_DECIDE_OPTIONS, MODULE_NAME$d);
            }
            else {
                options.forEach(function (option) {
                    // Filter out all provided decide options that are not in OptimizelyDecideOption[]
                    if (OptimizelyDecideOption[option]) {
                        allDecideOptions[option] = true;
                    }
                    else {
                        _this.logger.log(LOG_LEVEL.WARNING, LOG_MESSAGES.UNRECOGNIZED_DECIDE_OPTION, MODULE_NAME$d, option);
                    }
                });
            }
            return allDecideOptions;
        };
        /**
         * Returns an object of decision results for multiple flag keys and a user context.
         * If the SDK finds an error for a key, the response will include a decision for the key showing reasons for the error.
         * The SDK will always return an object of decisions. When it cannot process requests, it will return an empty object after logging the errors.
         * @param     {OptimizelyUserContext}      user        A user context associated with this OptimizelyClient
         * @param     {string[]}                   keys        An array of flag keys for which decisions will be made.
         * @param     {OptimizelyDecideOption[]}  options     An array of options for decision-making.
         * @return    {[key: string]: OptimizelyDecision}      An object of decision results mapped by flag keys.
         */
        Optimizely.prototype.decideForKeys = function (user, keys, options) {
            var _this = this;
            if (options === void 0) { options = []; }
            var decisionMap = {};
            if (!this.isValidInstance()) {
                this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'decideForKeys');
                return decisionMap;
            }
            if (keys.length === 0) {
                return decisionMap;
            }
            var allDecideOptions = this.getAllDecideOptions(options);
            keys.forEach(function (key) {
                var optimizelyDecision = _this.decide(user, key, options);
                if (!allDecideOptions[OptimizelyDecideOption.ENABLED_FLAGS_ONLY] || optimizelyDecision.enabled) {
                    decisionMap[key] = optimizelyDecision;
                }
            });
            return decisionMap;
        };
        /**
         * Returns an object of decision results for all active flag keys.
         * @param     {OptimizelyUserContext}      user        A user context associated with this OptimizelyClient
         * @param     {OptimizelyDecideOption[]}  options     An array of options for decision-making.
         * @return    {[key: string]: OptimizelyDecision}      An object of all decision results mapped by flag keys.
         */
        Optimizely.prototype.decideAll = function (user, options) {
            if (options === void 0) { options = []; }
            var configObj = this.projectConfigManager.getConfig();
            var decisionMap = {};
            if (!this.isValidInstance() || !configObj) {
                this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME$d, 'decideAll');
                return decisionMap;
            }
            var allFlagKeys = Object.keys(configObj.featureKeyMap);
            return this.decideForKeys(user, allFlagKeys, options);
        };
        Object.defineProperty(Optimizely.prototype, "odpInformation", {
            get: function () {
                var _a, _b, _c;
                return {
                    host: ((_a = this.projectConfigManager.getConfig()) === null || _a === void 0 ? void 0 : _a.hostForOdp) || 'https://api.zaius.com/v3/graphql',
                    key: ((_b = this.projectConfigManager.getConfig()) === null || _b === void 0 ? void 0 : _b.publicKeyForOdp) || 'W4WzcEs-ABgXorzY7h1LCQ',
                    segments: ((_c = this.projectConfigManager.getConfig()) === null || _c === void 0 ? void 0 : _c.allSegments) || []
                };
            },
            enumerable: false,
            configurable: true
        });
        return Optimizely;
    }());

    /**
     * Copyright 2019-2020, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Return true if the argument is a valid event batch size, false otherwise
     * @param {unknown}   eventBatchSize
     * @returns {boolean}
     */
    var validateEventBatchSize = function (eventBatchSize) {
        if (typeof eventBatchSize === 'number' && fns.isSafeInteger(eventBatchSize)) {
            return eventBatchSize >= 1;
        }
        return false;
    };
    /**
     * Return true if the argument is a valid event flush interval, false otherwise
     * @param {unknown}   eventFlushInterval
     * @returns {boolean}
     */
    var validateEventFlushInterval = function (eventFlushInterval) {
        if (typeof eventFlushInterval === 'number' && fns.isSafeInteger(eventFlushInterval)) {
            return eventFlushInterval > 0;
        }
        return false;
    };
    var eventProcessorConfigValidator = {
        validateEventBatchSize: validateEventBatchSize,
        validateEventFlushInterval: validateEventFlushInterval,
    };

    var MODULE_NAME$e = 'NOTIFICATION_CENTER';
    /**
     * NotificationCenter allows registration and triggering of callback functions using
     * notification event types defined in NOTIFICATION_TYPES of utils/enums/index.js:
     * - ACTIVATE: An impression event will be sent to Optimizely.
     * - TRACK a conversion event will be sent to Optimizely
     */
    var NotificationCenter = /** @class */ (function () {
        /**
         * @constructor
         * @param   {NotificationCenterOptions}  options
         * @param   {LogHandler}                 options.logger       An instance of a logger to log messages with
         * @param   {ErrorHandler}               options.errorHandler An instance of errorHandler to handle any unexpected error
         */
        function NotificationCenter(options) {
            var _this = this;
            this.logger = options.logger;
            this.errorHandler = options.errorHandler;
            this.notificationListeners = {};
            objectValues(NOTIFICATION_TYPES).forEach(function (notificationTypeEnum) {
                _this.notificationListeners[notificationTypeEnum] = [];
            });
            this.listenerId = 1;
        }
        /**
         * Add a notification callback to the notification center
         * @param   {string}                   notificationType     One of the values from NOTIFICATION_TYPES in utils/enums/index.js
         * @param   {NotificationListener<T>}  callback             Function that will be called when the event is triggered
         * @returns {number}                   If the callback was successfully added, returns a listener ID which can be used
         * to remove the callback by calling removeNotificationListener. The ID is a number greater than 0.
         * If there was an error and the listener was not added, addNotificationListener returns -1. This
         * can happen if the first argument is not a valid notification type, or if the same callback
         * function was already added as a listener by a prior call to this function.
         */
        NotificationCenter.prototype.addNotificationListener = function (notificationType, callback) {
            try {
                var notificationTypeValues = objectValues(NOTIFICATION_TYPES);
                var isNotificationTypeValid = notificationTypeValues.indexOf(notificationType) > -1;
                if (!isNotificationTypeValid) {
                    return -1;
                }
                if (!this.notificationListeners[notificationType]) {
                    this.notificationListeners[notificationType] = [];
                }
                var callbackAlreadyAdded_1 = false;
                (this.notificationListeners[notificationType] || []).forEach(function (listenerEntry) {
                    if (listenerEntry.callback === callback) {
                        callbackAlreadyAdded_1 = true;
                        return;
                    }
                });
                if (callbackAlreadyAdded_1) {
                    return -1;
                }
                this.notificationListeners[notificationType].push({
                    id: this.listenerId,
                    callback: callback,
                });
                var returnId = this.listenerId;
                this.listenerId += 1;
                return returnId;
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
                return -1;
            }
        };
        /**
         * Remove a previously added notification callback
         * @param   {number}                 listenerId ID of listener to be removed
         * @returns {boolean}                Returns true if the listener was found and removed, and false
         * otherwise.
         */
        NotificationCenter.prototype.removeNotificationListener = function (listenerId) {
            var _this = this;
            try {
                var indexToRemove_1;
                var typeToRemove_1;
                Object.keys(this.notificationListeners).some(function (notificationType) {
                    var listenersForType = _this.notificationListeners[notificationType];
                    (listenersForType || []).every(function (listenerEntry, i) {
                        if (listenerEntry.id === listenerId) {
                            indexToRemove_1 = i;
                            typeToRemove_1 = notificationType;
                            return false;
                        }
                        return true;
                    });
                    if (indexToRemove_1 !== undefined && typeToRemove_1 !== undefined) {
                        return true;
                    }
                    return false;
                });
                if (indexToRemove_1 !== undefined && typeToRemove_1 !== undefined) {
                    this.notificationListeners[typeToRemove_1].splice(indexToRemove_1, 1);
                    return true;
                }
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
            }
            return false;
        };
        /**
         * Removes all previously added notification listeners, for all notification types
         */
        NotificationCenter.prototype.clearAllNotificationListeners = function () {
            var _this = this;
            try {
                objectValues(NOTIFICATION_TYPES).forEach(function (notificationTypeEnum) {
                    _this.notificationListeners[notificationTypeEnum] = [];
                });
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
            }
        };
        /**
         * Remove all previously added notification listeners for the argument type
         * @param   {NOTIFICATION_TYPES}    notificationType One of NOTIFICATION_TYPES
         */
        NotificationCenter.prototype.clearNotificationListeners = function (notificationType) {
            try {
                this.notificationListeners[notificationType] = [];
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
            }
        };
        /**
         * Fires notifications for the argument type. All registered callbacks for this type will be
         * called. The notificationData object will be passed on to callbacks called.
         * @param {string} notificationType One of NOTIFICATION_TYPES
         * @param {Object} notificationData Will be passed to callbacks called
         */
        NotificationCenter.prototype.sendNotifications = function (notificationType, notificationData) {
            var _this = this;
            try {
                (this.notificationListeners[notificationType] || []).forEach(function (listenerEntry) {
                    var callback = listenerEntry.callback;
                    try {
                        callback(notificationData);
                    }
                    catch (ex) {
                        _this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.NOTIFICATION_LISTENER_EXCEPTION, MODULE_NAME$e, notificationType, ex.message);
                    }
                });
            }
            catch (e) {
                this.logger.log(LOG_LEVEL.ERROR, e.message);
                this.errorHandler.handleError(e);
            }
        };
        return NotificationCenter;
    }());
    /**
     * Create an instance of NotificationCenter
     * @param   {NotificationCenterOptions}   options
     * @returns {NotificationCenter}          An instance of NotificationCenter
     */
    function createNotificationCenter(options) {
        return new NotificationCenter(options);
    }

    /**
     * Copyright 2020, 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function createEventProcessor() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return new (LogTierV1EventProcessor.bind.apply(LogTierV1EventProcessor, __spreadArray([void 0], args, false)))();
    }
    var eventProcessor = { createEventProcessor: createEventProcessor, LocalStoragePendingEventsDispatcher: LocalStoragePendingEventsDispatcher };

    function createHttpPollingDatafileManager(sdkKey, logger, 
    // TODO[OASIS-6649]: Don't use object type
    // eslint-disable-next-line  @typescript-eslint/ban-types
    datafile, datafileOptions) {
        var datafileManagerConfig = { sdkKey: sdkKey };
        if (datafileOptions === undefined || (typeof datafileOptions === 'object' && datafileOptions !== null)) {
            fns.assign(datafileManagerConfig, datafileOptions);
        }
        if (datafile) {
            var _a = tryCreatingProjectConfig({
                datafile: datafile,
                jsonSchemaValidator: undefined,
                logger: logger,
            }), configObj = _a.configObj, error = _a.error;
            if (error) {
                logger.error(error);
            }
            if (configObj) {
                datafileManagerConfig.datafile = toDatafile(configObj);
            }
        }
        return new HttpPollingDatafileManager(datafileManagerConfig);
    }

    /**
     * Copyright 2022, Optimizely
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * https://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Determine the running or execution context for JavaScript
     * Note: React Native is considered a browser context
     */
    var ExecutionContext = /** @class */ (function () {
        function ExecutionContext() {
        }
        Object.defineProperty(ExecutionContext, "Current", {
            /**
             * Gets the current running context
             * @constructor
             */
            get: function () {
                return this._currentContext;
            },
            /**
             * Sets the current running context ideally from package initialization
             * @param newValue The new execution context
             * @constructor
             */
            set: function (newValue) {
                this._currentContext = newValue;
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Holds the current value of the execution context
         * @private
         */
        ExecutionContext._currentContext = EXECUTION_CONTEXT_TYPE.NOT_DEFINED;
        return ExecutionContext;
    }());

    var logger$b = getLogger();
    logHelper.setLogHandler(createLogger());
    logHelper.setLogLevel(LogLevel.INFO);
    var MODULE_NAME$f = 'INDEX_BROWSER';
    var DEFAULT_EVENT_BATCH_SIZE = 10;
    var DEFAULT_EVENT_FLUSH_INTERVAL = 1000; // Unit is ms, default is 1s
    var DEFAULT_EVENT_MAX_QUEUE_SIZE = 10000;
    var hasRetriedEvents = false;
    ExecutionContext.Current = EXECUTION_CONTEXT_TYPE.BROWSER;
    /**
     * Creates an instance of the Optimizely class
     * @param  {Config} config
     * @return {Client|null} the Optimizely client object
     *                           null on error
     */
    var createInstance = function (config) {
        logger$b.info('ODP Demo');
        try {
            // TODO warn about setting per instance errorHandler / logger / logLevel
            var isValidInstance = false;
            if (config.errorHandler) {
                setErrorHandler(config.errorHandler);
            }
            if (config.logger) {
                logHelper.setLogHandler(config.logger);
                // respect the logger's shouldLog functionality
                logHelper.setLogLevel(LogLevel.NOTSET);
            }
            if (config.logLevel !== undefined) {
                logHelper.setLogLevel(config.logLevel);
            }
            try {
                configValidator.validate(config);
                isValidInstance = true;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (ex) {
                logger$b.error(ex);
            }
            var eventDispatcher = void 0;
            // prettier-ignore
            if (config.eventDispatcher == null) { // eslint-disable-line eqeqeq
                // only wrap the event dispatcher with pending events retry if the user didnt override
                eventDispatcher = new LocalStoragePendingEventsDispatcher({
                    eventDispatcher: defaultEventDispatcher,
                });
                if (!hasRetriedEvents) {
                    eventDispatcher.sendPendingEvents();
                    hasRetriedEvents = true;
                }
            }
            else {
                eventDispatcher = config.eventDispatcher;
            }
            var eventBatchSize = config.eventBatchSize;
            var eventFlushInterval = config.eventFlushInterval;
            if (!eventProcessorConfigValidator.validateEventBatchSize(config.eventBatchSize)) {
                logger$b.warn('Invalid eventBatchSize %s, defaulting to %s', config.eventBatchSize, DEFAULT_EVENT_BATCH_SIZE);
                eventBatchSize = DEFAULT_EVENT_BATCH_SIZE;
            }
            if (!eventProcessorConfigValidator.validateEventFlushInterval(config.eventFlushInterval)) {
                logger$b.warn('Invalid eventFlushInterval %s, defaulting to %s', config.eventFlushInterval, DEFAULT_EVENT_FLUSH_INTERVAL);
                eventFlushInterval = DEFAULT_EVENT_FLUSH_INTERVAL;
            }
            var errorHandler = getErrorHandler();
            var notificationCenter = createNotificationCenter({ logger: logger$b, errorHandler: errorHandler });
            var eventProcessorConfig = {
                dispatcher: eventDispatcher,
                flushInterval: eventFlushInterval,
                batchSize: eventBatchSize,
                maxQueueSize: config.eventMaxQueueSize || DEFAULT_EVENT_MAX_QUEUE_SIZE,
                notificationCenter: notificationCenter,
            };
            var optimizelyOptions = __assign(__assign({ clientEngine: JAVASCRIPT_CLIENT_ENGINE }, config), { eventProcessor: eventProcessor.createEventProcessor(eventProcessorConfig), logger: logger$b, errorHandler: errorHandler, datafileManager: config.sdkKey ? createHttpPollingDatafileManager(config.sdkKey, logger$b, config.datafile, config.datafileOptions) : undefined, notificationCenter: notificationCenter, isValidInstance: isValidInstance });
            var optimizely_1 = new Optimizely(optimizelyOptions);
            try {
                if (typeof window.addEventListener === 'function') {
                    var unloadEvent = 'onpagehide' in window ? 'pagehide' : 'unload';
                    window.addEventListener(unloadEvent, function () {
                        optimizely_1.close();
                    }, false);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (e) {
                logger$b.error(LOG_MESSAGES.UNABLE_TO_ATTACH_UNLOAD, MODULE_NAME$f, e.message);
            }
            return optimizely_1;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (e) {
            logger$b.error(e);
            return null;
        }
    };

    const OPTIMIZELY_SDK_KEY = "3DHbmsE3z3y3Fb1qmexbA";
    odpReady().then(() => {
        console.log("window.zaius is ready");
        /**
         * Initialize the Flags SDK
         * Doing this after odpReady() resolves ensures that the ODP client
         * is also initialized for any code that depends on both flags and
         * ODP
         */
        const optimizelyClient = createInstance({
            sdkKey: OPTIMIZELY_SDK_KEY
        });
        window.optimizelyClient = optimizelyClient;
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

})();
