const path = require('path');

module.exports = {
    entry: './src/belfiore-connector-embedded.js',
    mode: 'production',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'belfiore-connector-embedded.min.js',
        library: 'belfiore',
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    externals: {
        '@marketto/belfiore-connector': {
            commonjs: 'BelfioreConnector',
            commonjs2: 'BelfioreConnector',
            amd: 'BelfioreConnector',
            var: 'BelfioreConnector'
        },
        moment: {
            commonjs: 'moment',
            commonjs2: 'moment',
            amd: 'moment',
            var: 'moment'
        }
    }
};