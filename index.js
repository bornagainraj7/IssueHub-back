const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const http = require('http');
const appConfig = require('./config/appConfig');
const logger = require('tracer').colorConsole();
const routeLoggerMiddleware = require('./app/middlewares/routeLogger.js');
const globalErrorMiddleware = require('./app/middlewares/appErrorHandler');
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const morgan = require('morgan');


app.use(morgan('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(routeLoggerMiddleware.logIp);
app.use(globalErrorMiddleware.globalErrorHandler);

app.use("/images", express.static(__dirname + "/images"));




const modelsPath = './app/models';
const controllersPath = './app/controllers';
const libsPath = './app/libs';
const middlewaresPath = './app/middlewares';
const routesPath = './app/routes';

app.all('*',(req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-requested-With, Content-Type, Accept, authToken, authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  next();
});

//Bootstrap models
fs.readdirSync(modelsPath).forEach(function (file) {
  if (~file.indexOf('.js')) require(modelsPath + '/' + file)
});
// end Bootstrap models

// Bootstrap route
fs.readdirSync(routesPath).forEach(function (file) {
  if (~file.indexOf('.js')) {
    let route = require(routesPath + '/' + file);
    route.setRouter(app);
  }
});
// end bootstrap route


// calling global 404 handler after route

app.use(globalErrorMiddleware.globalNotFoundHandler);

// end global 404 handler

/**
 * Create HTTP server.
 */

const server = http.createServer(app);
// start listening to http server
// console.log(appConfig);
server.listen(appConfig.port);
server.on('error', onError);
server.on('listening', onListening);

// end server listening code
const socket = require('./app/libs/socketLib');
const socketServer = socket.setServer(server);

// end socketio connection handler

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    logger.error(error.code + ' ' +error);
    throw error;
  }


  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(error.code + ' ' + error);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(error.code + ' ' + error);
      process.exit(1);
      break;
    default:
      logger.error(error.code + ' ' + error);
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  ('Listening on ' + bind);
  // logger.info('server listening on port' + addr.port, 'serverOnListeningHandler', 10);
  
  let db = mongoose.connect(appConfig.db.uri, { useMongoClient: true });
  // after using useMongoClient: true you'll get as useCreateIndex, useNewUrlParser not supported 
  // let db = mongoose.connect(appConfig.db.uri, { useCreateIndex: true, useNewUrlParser: true });
}

process.on('unhandledRejection', (reason, p) => {
  logger.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});


/**
 * database connection settings
 */
mongoose.connection.on('error', function (err) {
  logger.error('database connection error');
  logger.error(err);
  // process.exit(1);
}); // end mongoose connection error

mongoose.connection.on('open', function (err) {
  if (err) {
    logger.error('database error');
    logger.error(err);
  } else {
    logger.info("database connection open success");
    // logger.info("database connection open", 'database connection open handler', 10);
  }
  //process.exit(1)
}); // enr mongoose connection open handler



module.exports = app;
