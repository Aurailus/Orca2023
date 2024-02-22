const path = require('path');

const ForkTsCheckerPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
    entry: './src/Main.ts',
    module: {
        rules: [
            {
              test: /\.[t|j]sx?$/,
              loader: 'babel-loader',
              options: {
                babelrc: false,
                cacheDirectory: true,
                presets: [
                  [
                    '@babel/preset-typescript',
                    {
                      isTSX: true,
                      allExtensions: true,
                      jsxPragma: 'h',
                    },
                  ],
                ],
                plugins: [['@babel/transform-react-jsx', { pragma: 'h' }]],
              },
            },
            {
              test: /\.(png|svg|jpg|jpeg|gif)$/i,
              type: 'asset/resource',
            },
            {
              test: /\.pcss$/,
              use: [ 'style-loader', 'css-loader', 'postcss-loader' ]
            }
        ],
    },
    resolve: {
        alias: {
            'three': path.resolve('./node_modules/three'),
            'react': 'preact/compat',
            'react-dom': 'preact/compat',
        },
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, './dist/client'),
    },
    plugins: [
        new ForkTsCheckerPlugin({
            typescript: { configFile: path.resolve(__dirname, 'tsconfig.json') }
        })
    ]
};
