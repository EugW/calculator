const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const pkg = require('./package.json');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = (env, argv) => {
    return {
        entry: {
            'app': path.resolve(__dirname, 'src/js/app.js'),
            'db': path.resolve(__dirname, 'src/js/db.js'),
            'ui': path.resolve(__dirname, 'src/js/ui.js'),
            'cli': path.resolve(__dirname, 'src/js/cli.js'),
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'js/[name].js',
            chunkFilename: 'js/[id]_[chunkhash].js',
            clean: true,
        },
        // Persistent cache: restarts and watch rebuilds reuse module results
        // (lives in node_modules/.cache, never committed).
        cache: {
            type: 'filesystem',
            buildDependencies: {
                config: [__filename],
            },
        },
        plugins: [
            new webpack.DefinePlugin({
                __VERSION__: JSON.stringify(pkg.version),
                __DEVEL__: JSON.stringify(argv.mode === 'development'),
            }),
            new MiniCssExtractPlugin({
                filename: 'css/[name].css',
            }),
            new HtmlWebpackPlugin({
                filename: 'index.html',
                scriptLoading: 'blocking',
                hash: true,
                inject: false,
                title: 'Genshin Impact Calculator',
                template: 'src/index.ejs',
                templateParameters: {
                    'version': pkg.version,
                },
                    excludeChunks: ['cli'],
            }),
            new CopyPlugin({
                patterns: [
                    {from: path.resolve(__dirname, 'src/images/stonks.jpg'), to: "images/share.jpg"},
                    {from: path.resolve(__dirname, 'src/images/favicon.png'), to: "images/favicon.png"},
                    {from: path.resolve(__dirname, 'src/images/help/'), to: "images/help/"},
                    {from: path.resolve(__dirname, 'src/help/'), to: "help/"},
                    {from: path.resolve(__dirname, 'src/js/lang/'), to: "js/lang/"},
                    {from: path.resolve(__dirname, 'src/robots.txt'), to: "robots.txt"},
                    {from: path.resolve(__dirname, 'src/sitemap.xml'), to: "sitemap.xml"},
                ],
            }),
        ],
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader'
                    ]
                },
                {
                    test: /\.(ttf|woff2?)$/,
                    include: /fonts/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'fonts/[name][ext]'
                    }
                },
                {
                    test: /\.(png|svg|jpe?g|gif|webp)$/,
                    include: /images/,
                    type: 'asset/resource',
                    generator: {
                        filename: (pathData) => {
                            return pathData.filename.replace(/^src\/images\//, 'images/').replace(/\\/g, '/');
                        }
                    }
                },
                {
                    test: /\.m?jsx?$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            assumptions: {
                                iterableIsArray: true,
                            },
                            presets: [
                                '@babel/preset-react',
                            ],
                        },
                    },
                },
            ],
        },
        resolve: {
            extensions: ['', '.js', '.jsx'],
        },
        optimization: {
            minimizer: [
                new CssMinimizerPlugin(),
                new TerserPlugin({
                    test: /\.js(\?.*)?$/i,
                }),
            ],
        },
        devtool: argv.mode === 'development' ? 'eval-source-map' : false,
        // Memory serve for development (`npm run serve`): the bundle comes
        // from memory with live reload; dist/ on disk covers copied assets
        // (images/help/lang) from the last full build.
        devServer: {
            static: {
                directory: path.join(__dirname, 'dist'),
            },
            port: 3000,
            liveReload: true,
            hot: false,
            client: {
                overlay: true,
            },
        },
    };
};
