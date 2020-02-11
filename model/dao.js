'use strict';

var nconf = require('nconf');

// https://mongoosejs.com/docs/index.html
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
let datasource = nconf.get('datasource');
mongoose.connect(datasource.protocol + '://' + datasource.host + ':' + datasource.port + '/' + datasource.database);
module.exports = mongoose;
