// rollup.config.js

export default {
    input: './out-tsc/src/main.js',
    output: {
        file: 'dist/bundle.js',
        format: 'iife'
    }
};