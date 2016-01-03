var path = require('path');
module.exports = {
  resolveLoader: {
    root: path.join(__dirname, 'node_modules'),
    parent: path.join(__dirname, '..', 'node_modules')
  },
  entry: path.join(__dirname, 'index.jsx'),
  output: {
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      { test: /\.css$/, loader: "style-loader!css-loader" },
      {
        test: /\.jsx$/,
        loader: 'babel-loader',
        exclude: /(node_modules)/,
        query: {
          presets: ['es2015', 'react']
        }
      }
    ]
  }
};
