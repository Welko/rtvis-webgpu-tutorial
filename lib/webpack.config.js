const path = require('path');

module.exports = {
    entry: './generate-mipmap.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        library: {
            name: "MIPMAP",
            type: "window",
        },
    },
    mode: 'production'
};