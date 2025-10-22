var express = require("express");
var csrf = require("csurf");
var methodOverride = require("method-override");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var favicon = require("serve-favicon");
var compress = require("compression");
var session = require("express-session");
// Pass the session to the connect mongodb module
// allowing it to inherit from session.Store
var mongoStore = require("connect-mongodb-session")(session);
var flash = require("connect-flash");
var winston = require("winston");
var helpers = require("view-helpers");
var pkg = require("../package.json");
var mongoose = require('mongoose');
var fs = require('fs');
var passport = require('passport');

var env = process.env.NODE_ENV || "development";
var config = require("./config")[env];

/**
 * Connect to mongodb database
 */
mongoose.connect(config.db).then(
  () => {
    console.log("Database sucessfully connected");
  },
  (error) => {
    console.log("Database could not be connected: " + error);
  }
);

/**
 * Load mongodb models
 */
var models_path = __dirname + '/../app/models'
fs.readdirSync(models_path).forEach(function (file) {
  if (~file.indexOf('.js')) require(models_path + '/' + file)
});

var indexRouter = require("./routes/index");
var authRouter = require("./routes/auth");

var app = express();

app.set("showStackError", true);

//view engine setup
app.set("views", config.root + "/app/views");
app.set("view engine", "jade");

// should be placed before express.static
app.use(
  compress({
    filter: function (req, res) {
      return /json|text|javascript|css/.test(res.getHeader("Content-Type"));
    },
    level: 9,
  })
);

// Logging
// Use winston on production
var log;
if (env !== "development") {
    const winston_logger = winston.createLogger({
    level: 'info', // This can be 'info', 'warn' or 'error'
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ level, message, timestamp }) => {
        return `[${timestamp}] ${level}: ${message}`;
      })
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'app.log' })
    ],
  });
  log = {
    skip: function (req, res) {
      return req.url.match(/\.(css|js|png|jpg|ico|svg|woff|ttf)$/);
    },
    stream: {
      write: message => winston_logger.info(message.trim())
    },
  };
} else {
  log = "dev";
}
// Don't log during tests
if (env !== "test") app.use(logger(log));

// bodyParser should be above methodOverride
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// cookieParser should be above session
app.use(cookieParser());

app.use(favicon(config.root + '/public/favicon.ico', {
  maxAge: '1y' // Cache for 1 year
}));

app.use(express.static(config.root + "/public"));
//app.use(express.static(config.root + '/versions'))
app.use("/vocommons", express.static(config.root + "/vocommons"));

// expose package.json to views
app.use(function (req, res, next) {
  res.locals.pkg = pkg;
  next();
});

app.use(methodOverride());
// override with POST having ?_method=
app.use(methodOverride('_method'));
// override with POST having <input type="hidden" name="_method" value=> method
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    var method = req.body._method
    delete req.body._method
    return method
  }
}));

// express/mongo session storage
app.use(
  session({
    secret: pkg.name,
    store: new mongoStore({
      url: config.db,
      collection: "sessions",
    }),
  })
);
/*
// adds CSRF support
if (process.env.NODE_ENV !== "test") {
  //app.use(express.csrf())
  var conditionalCSRF = function (req, res, next) {
    if (req.path != "/dataset/lov/sparql") {
      //don't check the csrf if sent to sparql as it is not supported by yasgui
      csrf(req, res, next);
    } else {
      next();
    }
  };

  app.use(conditionalCSRF);

  // This could be moved to view-helpers :-)
  app.use(function (req, res, next) {
    if (typeof req.csrfToken == "function") {
      //small hack to work in the case of sparql access using yasgui
      res.locals.csrf_token = req.csrfToken();
    }
    next();
  });
}*/
if (env !== "test") {
  //app.use(express.csrf())
  var conditionalCSRF = function (req, res, next) {
    if (req.path != "/dataset/lov/sparql") {
      //don't check the csrf if sent to sparql as it is not supported by yasgui
      app.use(csrf());
      next();
    } else {
      next();
    }
  }

  app.use(conditionalCSRF);

  // This could be moved to view-helpers :-)
  app.use(function (req, res, next) {
    if (typeof req.csrfToken == "function") {
      //small hack to work in the case of sparql access using yasgui
      res.locals.csrf_token = req.csrfToken();
    }
    next();
  });
}
/*
app.use(csrf());

app.use(function (req, res, next) {
  if (typeof req.csrfToken == "function") {
    //small hack to work in the case of sparql access using yasgui
    res.locals.csrf_token = req.csrfToken();
  }
  next();
});

app.use((req, res, next) => {
  res.locals.isAuthenticated = req?.session?.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});
*/
// use passport session
app.use(passport.initialize());
app.use(passport.session());

//allow cross domain CORS
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// connect flash for flash messages - should be declared after sessions
app.use(flash());

// should be declared after session and flash
app.use(helpers(pkg.name));

app.enable("trust proxy");

// routes should be at the last
app.use("/", indexRouter);
app.use("/", authRouter);

// assume "not found" in the error msgs
// is a 404. this is somewhat silly, but
// valid, you can do whatever you like, set
// properties, use instanceof etc.
app.use(function (err, req, res, next) {
  // treat as 404
  if (
    err.message &&
    (~err.message.indexOf("not found") ||
      ~err.message.indexOf("Cast to ObjectId failed"))
  ) {
    return next();
  }

  // log it
  // send emails if you want
  console.error(err);

  // error page
  res.status(500).render("500", { error: err.stack });
});

// assume 404 since no middleware responded
app.use(function (req, res, next) {
  res.status(404).render("404", {
    url: req.originalUrl,
    error: "Not found",
  });
});

// development env config
app.locals.pretty = true;

module.exports = app;
