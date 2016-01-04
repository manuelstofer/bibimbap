var webpack = require('webpack');
var dev     = require('webpack-dev-middleware');
var hot     = require('webpack-hot-middleware');
var express = require('express');
var path    = require('path');
var config  = require('./webpack.config.js');

var compiler = webpack(config);
var app      = express();

app.use(dev(compiler, {
  publicPath: config.output.publicPath
}));

app.use(hot(compiler));

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

console.log('Compiling...');
app.listen(3000, 'localhost', function(err) {
  if (err) return console.err(err);
});
