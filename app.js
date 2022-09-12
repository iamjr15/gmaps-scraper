const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');
const logger = require('morgan');
const rfs = require('rotating-file-stream');

const Queue = require('bull');
const {createBullBoard} = require('@bull-board/api');
const {BullAdapter} = require('@bull-board/api/bullAdapter');
const {ExpressAdapter} = require('@bull-board/express');

const someQueue = new Queue('someQueueName', {
    redis: {port: 6379, host: '127.0.0.1'},
}); // if you have a special connection to redis.
const someOtherQueue = new Queue('someOtherQueueName');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const {addQueue, removeQueue, setQueues, replaceQueues} = createBullBoard({
    queues: [new BullAdapter(someQueue), new BullAdapter(someOtherQueue)],
    serverAdapter: serverAdapter,
});

require('dotenv').config();

const app = express();

// body-parser middleware
// app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// cors middleware
app.use(cors());

// Views
const googleSearchApi = require('./routes/googleSearchApi');
const googleMapsScraperApi = require('./routes/googleMapsApi');
const domainSearchApi = require('./routes/domainSearchApi');
const testRoutes = require('./routes/testRoute');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// ================ Morgan Logger Setup ================
if (process.env.PRODUCTION === 'true' || process.env.STAGING === 'true') {
    // app.use(logger('combined', {immediate: false}));
    const rotatingStream = rfs.createStream('access.log', {
        interval: '1d',
        compress: 'gzip',
        maxFiles: 20,
        path: path.join(__dirname, 'logs'),
    });
    app.use(logger(
        ':method - :status - ":url" - IP: :remote-addr (:user-agent) - :date[web]',
        {stream: rotatingStream},
    ));
} else {
    app.use(logger('dev', {immediate: false}));
}

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ===================== URLS OVER HERE =====================
app.use('/test', testRoutes);
app.use('/api/v1/googlesearch', googleSearchApi);
app.use('/api/v1/gmapscraper', googleMapsScraperApi);
app.use('/api/v1/domainsearch', domainSearchApi);
app.use('/admin/queues', serverAdapter.getRouter());

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
