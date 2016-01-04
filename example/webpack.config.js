var path    = require('path');
var webpack = require('webpack');

module.exports = {
  resolveLoader: {
    root:   path.join(__dirname, 'node_modules'),
    parent: path.join(__dirname, '..', 'node_modules')
  },
  entry: [
    'webpack-hot-middleware/client',
    './index.jsx',
  ],
  output: {
    path:       __dirname,
    publicPath: '/',
    filename:   'bundle.js'
  },
  watchOptions: {
    poll: 300
  },
  module: {
    loaders: [
      {
        test:   /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test:    /\.jsx?$/,
        loader:  'babel-loader',
        exclude: /(node_modules)/,
        query:   {
          presets: ['es2015'],
          plugins: [['transform-react-jsx', {
            pragma: 'element'
          }]]
        }
      }
    ]
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
  ]
};