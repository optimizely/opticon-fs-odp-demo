// rollup.config.js

import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfills from 'rollup-plugin-polyfill-node';

export default {
    input: './out-tsc/src/main.js',
    output: {
        file: 'dist/bundle.js',
        format: 'iife',
        globals: {
            "@optimizely/optimizely-sdk": "optimizelySdk"
        }
    },
    // plugins: [nodeResolve(), commonjs(), nodePolyfills()]
};