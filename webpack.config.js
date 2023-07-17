const path = require('path')
const HappyPack = require('happypack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const loader = {
  css: {
    loader: 'css-loader',
    options: {
      importLoaders: 1,
    },
  },
  cssModule: {
    loader: 'css-loader',
    options: {
      importLoaders: 1,
      sourceMap: true,
      esModule: true,
      modules: {
        localIdentName: '[path][name]__[local]___[hash:base64:5]',
        localIdentContext: path.resolve(__dirname, './src'),
      },
    },
  },
  cssExtract: {
    loader: 'style-loader',
  },
  postcss: {
    loader: 'postcss-loader',
    options: {
      postcssOptions: {
        plugins: ['postcss-preset-env'],
      },
    },
  },
  less: {
    loader: 'less-loader',
    options: {
      javascriptEnabled: true,
    },
  },
  optimization: {
    splitChunks: {
      // chunks: 'all',
      // 拆分最小大小，越大意味着首屏加载资源更多，但是打包出的chunk数少
      minSize: 1024,
      // 最小共享chunk数，越大意味着首屏加载资源更多，但是打包出的chunk数少
      minChunks: 1,
      // 强行拆分阈值，越小拆分越多，首屏并行请求越多
      enforceSizeThreshold: 1024,
      // maxSize: 1024*800
      automaticNameDelimiter: '.',
      // 自行包处理
      // cacheGroups: {
      //   test: {
      //     name: 'vendors',
      //     test({ resource }:any) {
      //       return resource && resource.match(/@umijs/);
      //     },
      //     priority: 10,
      //   },
      // },
    },
  },
};

module.exports = {
  mode: 'development',
  devtool: false,
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, './output'),
    filename: 'static/js/[name].[hash].js',
    chunkFilename: 'static/js/[name].[contenthash].chunk.js',
    libraryTarget: 'umd',
  },
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    antd: 'antd',
    moment: 'moment'
  },
  module: {
    rules: [
      {
        oneOf: [
          {
            test: /\.(js|jsx)$/,
            exclude: /node_modules/,
            include: [path.resolve(__dirname, './src')],
            use: 'happypack/loader?id=babel',
          },
          {
            test: /\.less$/,
            exclude: /antd.*\.less$/,
            use: 'happypack/loader?id=less',
          },
          {
            test: /antd.*\.less$/,
            use: ['style-loader', 'css-loader', loader.less],
          },
          {
            test: /\.scss$/,
            include: [path.resolve('src'), /node_modules\/@didi/],
            use: ['style-loader', 'css-loader', 'sass-loader'],
          },
          {
            test: /\.(svg|eot|ttf|woff|woff2)$/,
            use: [
              {
                loader: 'file-loader',
                options: {
                  name: 'static/assets/[name].[ext]',
                },
              },
            ],
          },
          {
            test: /\.(bmp|gif|png|jpe?g)$/,
            exclude: /node_modules/,
            use: [
              {
                loader: 'url-loader',
                options: {
                  fallback: 'file-loader',
                  limit: 10,
                  outputPath: 'static/assets/',
                  name: '[name].[ext]',
                },
              },
            ],
          },
          {
            test: /favicon\.png$/,
            use: 'file-loader?name=[name].[ext]',
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
    }),
    new HappyPack({
      id: 'babel',
      loaders: ['babel-loader'],
    }),
    new HappyPack({
      id: 'less',
      loaders: ['style-loader', loader.cssModule, loader.less],
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'async',
      cacheGroups: {
        libs: /[\\/]node_modules[\\/]/,
      }
    }
  },
  devServer: {
    writeToDisk: false,
    // All Gzip
    compress: true,
    port: 8000,
    historyApiFallback: true,
    disableHostCheck: true,
    contentBase: path.join(__dirname, './output'),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
}