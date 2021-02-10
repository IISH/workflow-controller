/**
 * app
 *
 * Main app request and response routing
 *
 * @type {Provider}
 */

const nconf = require('nconf');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const createError = require('http-errors');
const dao = require('./model/dao');
const express = require('express');
const logger = require('morgan');
const path = require('path');

const app = express();
app.use(bodyParser.json({ limit: nconf.get('web').body_limit }));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

app.use(session({
    store: (app.get('env') === 'production') ? new MongoStore({ mongooseConnection: dao.connection }) : null,
    secret: nconf.get('web').session_secret,
    resave: false,
    saveUninitialized: false
}));

const passport = require('./iaa')(app, nconf.get('openid'), nconf.get('users'));
require('./routes/iaa')(app, passport, nconf.get('web'));

const indexRouter = require('./routes/index');
app.use('/', indexRouter);
const workflowRouter = require('./routes/workflow');
app.use('/workflow', workflowRouter);

const archiveRouter = require('./routes/archive');
app.use('/archive', archiveRouter);

const pingRouter = require('./routes/ping');
app.use('/ping', pingRouter);

const reportRouter = require('./routes/report');
app.use('/report', reportRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
// app.use(function (err, req, res, next) {
//     // set locals, only providing error in development
//     res.locals.message = err.message;
//     res.locals.error = req.app.get('env') === 'development' ? err : {};
//
//     // render the error page
//     res.status(err.status || 500);
//     res.render('error');
// });

//app.use('/', indexRouter);

module.exports = app;
