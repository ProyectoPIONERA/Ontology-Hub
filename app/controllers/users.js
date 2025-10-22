/**
 * Module dependencies.
 */

var mongoose = require("mongoose"),
  User = mongoose.model("User"),
  users = require("./users"),
  Agent = mongoose.model("Agent"),
  Vocabulary = mongoose.model("Vocabulary"),
  LogSuggest = mongoose.model("LogSuggest"),
  utils = require("../../lib/utils"),
  _ = require("underscore"),
  async = require("async"),
  ObjectId = mongoose.Types.ObjectId;

var app_name;
var app_name_shorcut;

exports.configureName = function (an, ans) {
  app_name = an;
  app_name_shorcut = ans;
};

var login = function (req, res) {
  if (req.session.returnTo) {
    res.redirect(req.session.returnTo);
    delete req.session.returnTo;
    return;
  }
  res.redirect("/");
};

exports.signin = function (req, res) {
};

/**
 * Auth callback
 */

exports.authCallback = login;

/**
 * Show login form
 */

exports.login = function (req, res) {
  res.render("users/login", {
    title: "Login",
    message: req.flash("error"),
    app_name_shorcut: app_name_shorcut,
    app_name: app_name,
  });
};

/**
 * Show sign up form
 */

exports.signup = function (req, res) {
  res.render("users/signup", {
    title: "Sign up",
    user: new User(),
    app_name_shorcut: app_name_shorcut,
    app_name: app_name,
  });
};

/**
 * Edit a user
 */

exports.edit = function (req, res) {
  res.render("users/edit", {
    user: req.userObj,
    app_name_shorcut: app_name_shorcut,
    app_name: app_name,
  });
};

/**
 * Update user
 */

exports.update = function (req, res) {
  var user = req.userObj;
  user.email = req.body.email;
  if (req.body.password && req.body.password.length > 0) {
    user.password = req.body.password;
  }
  user
    .save()
    .then(() => {
      req.flash("info", "User updated successfully");
      return res.redirect("/edition/lov");
    })
    .catch((err) => {
      res.render("users/edit", {
        user: user,
        errors: err.errors,
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
};

/*exports.reviewBatch = function(req, res){
  var deleteArray=JSON.parse(req.body.deleteArray);
  var activateArray=JSON.parse(req.body.activateArray);
  
  async.each(activateArray, function(id, callback) {
      User.update({_id:id},{$set:{activated:true}}).exec(callback);
  }, function(err, result) {
      if( err ) { return console.log(err); }
      async.each(deleteArray, function(id, cb) {
          User.find({_id:id}).remove().exec(cb);
      }, function(err, result) {
          if( err ) { return console.log(err); }
          res.redirect('/edition/lov/');
      });
  });
}*/

/**
 * Logout
 */

exports.logout = function (req, res) {
  req.logout(function (err) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    res.redirect("/edition/lov/login");
  });
};

/**
 * Session
 */

exports.session = login;

/**
 * Create user
 */

exports.create = function (req, res) {
  Agent.loadFromName(req.body.agentHidden, function (err, agentBinding) {
    if (err) return err;
    if (!agentBinding) return new Error("Agent " + agentHidden + " not found");
    req.body.agent = agentBinding;

    var user = new User(req.body);
    user.provider = "local";
    user
      .save()
      .then(() => {
        res.redirect("/edition/lov/login");
      })
      .catch((err) => {
        return res.render("users/signup", {
          errors: utils.errors(err.errors),
          user: user,
          title: "Sign up",
          app_name_shorcut: app_name_shorcut,
          app_name: app_name,
        });
      });
  });
};

/**
 *  Show profile
 */

exports.show = function (req, res) {
  var user = req.profile;
  res.render("users/show", {
    title: user.name,
    user: user,
    app_name_shorcut: app_name_shorcut,
    app_name: app_name,
  });
};

exports.load = function (req, res, next, id) {
  User.load(id, function (err, user) {
    if (err) return next(err);
    if (!user) return next(new Error("User " + id + " not found"));
    req.userObj = user;
    next();
  });
};

/**
 * Delete a user
 */
exports.destroy = function (req, res) {
  var user = req.userObj;
  User.findOneAndDelete(user)
  .then(() => {
    req.flash("info", "Deleted successfully");
    res.redirect("/edition/lov/users");
  })
  .catch((err) => {
    req.flash("info", err);
    res.redirect("/edition/lov/users");
  });
};

/**
 * List
 */
exports.index = function (req, res) {
  // TODO: add filters like page size, category, status and search feature

  User.list(function (err, users) {
    if (err) return res.render("500");
    res.render("users/index", {
      utils: utils,
      users: users,
      app_name_shorcut: app_name_shorcut,
      app_name: app_name,
    });
  });
};

exports.userChangeCategory = function (req, res) {
  User.findOneAndUpdate(
    { _id: req.body.userId },
    { $set: { category: req.body.category } }
  )
    .then(() => {
      res.redirect("/edition/lov/users");
    })
    .catch((err) => {
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
};

/*exports.index = function(req, res){
console.log(req);
  Vocabulary.listVocabsForReview(function (err, vocabsForReview) {
    LogSuggest.list(function (err, suggests) {
      User.listUsersForReview(function (err, users) {
        res.render('users/index', {
          utils: utils,
          users:users,
          suggests:suggests,
          vocabsForReview:vocabsForReview,
          auth:req.user,
    app_name_shorcut: app_name_shorcut,
    app_name: app_name,
        })
      })
    })
  })
 }*/

/**
 * Find user by id
 */

exports.user = function (req, res, next, id) {
  User.findOne({ _id: id }).exec(function (err, user) {
    if (err) return next(err);
    if (!user) return next(new Error("Failed to load User " + id));
    req.profile = user;
    next();
  });
};
