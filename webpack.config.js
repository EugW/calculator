const path = require('path');
const { createHash } = require('node:crypto');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const pkg = require('./package.json');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = (env, argv) => {
    return {
        // One entry per page: a module shared by two entries of the same page
        // would be instantiated once per entry, and its classes and symbols
        // would differ between them (see optimization.splitChunks).
        entry: {
            'app': path.resolve(__dirname, 'src/js/app.js'),
            'cli': path.resolve(__dirname, 'src/js/cli.js'),
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            // The query busts caches of the chunks workers load too; it is
            // not part of the file name on disk.
            filename: 'js/[name].js?[contenthash]',
            chunkFilename: 'js/[id]_[chunkhash].js',
            clean: true,
        },
        // Persistent cache: restarts and watch rebuilds reuse module results
        // (lives in node_modules/.cache, never committed).
        cache: {
            type: 'filesystem',
            // Worktrees can share node_modules through a junction. Keep their asset caches separate.
            name: createHash('sha256').update(__dirname).digest('hex').slice(0, 12) + '-' + argv.mode,
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
                filename: 'css/[name].css?[contenthash]',
            }),
            new HtmlWebpackPlugin({
                filename: 'index.html',
                scriptLoading: 'blocking',
                // File names carry their content hash (see output.filename).
                hash: false,
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
                    exclude: [
                        /(node_modules|bower_components)/,
                        // Generated tables are plain data with no JSX, so
                        // Babel has nothing to transform in them; the talent
                        // table is also over its 500KB limit for styled output.
                        /[\\/]src[\\/]js[\\/]db[\\/]generated[\\/]/,
                    ],
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
            // The page and every worker import the database. Its modules go
            // to one chunk, js/db.js, that each of them loads into its own
            // module graph, so the database is downloaded once.
            splitChunks: {
                cacheGroups: {
                    db: {
                        test: /[\\/]src[\\/]js[\\/]db[\\/]/,
                        name: 'db',
                        chunks: (chunk) => chunk.name !== 'cli',
                        enforce: true,
                    },
                },
            },
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
            // Standalone `npm run serve` (no backend, no nginx): forward
            // same-origin /back/proxy/enka/... to enka.network/api/...
            // like the nginx snippet and backend/index.ts do.
            proxy: [
                {
                    context: ['/back/proxy/enka'],
                    target: 'https://enka.network',
                    changeOrigin: true,
                    pathRewrite: { '^/back/proxy/enka': '/api' },
                    headers: { 'User-Agent': 'GenshinCalc/1.0' },
                },
            ],
        },
    };
};
