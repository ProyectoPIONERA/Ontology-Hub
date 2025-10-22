var mongoose = require("mongoose"),
  LocalStrategy = require("passport-local"),
  User = mongoose.model("User");

module.exports = function (passport, config) {
  /* Configure password authentication strategy.
 *
 * The `LocalStrategy` authenticates users by verifying a username and password.
 * The strategy parses the username and password from the request and calls the
 * `verify` function.
 *
 * The `verify` function queries the database for the user record and verifies
 * the password by hashing the password supplied by the user and comparing it to
 * the hashed password stored in the database.  If the comparison succeeds, the
 * user is authenticated; otherwise, not.
 */
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password"
      },
      function verify(email, password, cb){
        User.findOne({ email: email }, function (err, user) {
          if (err) {
            return cb(err);
          }
          if (!user) {
            return cb(null, false, { message: "Invalid email or password." });
          }
          if (!user.authenticate(password)) {
            return cb(null, false, { message: "Invalid email or password." });
          }
          if (!user.activated === true) {
            return cb(null, false, { message: "Your user account has not been activated yet." });
          }
          return cb(null, user);
        });
      }
    )
  );

  /* Configure session management.
 *
 * When a login session is established, information about the user will be
 * stored in the session.  This information is supplied by the `serializeUser`
 * function, which is yielding the user ID and username.
 *
 * As the user interacts with the app, subsequent requests will be authenticated
 * by verifying the session.  The same user information that was serialized at
 * session establishment will be restored when the session is authenticated by
 * the `deserializeUser` function.
 *
 * Since every request to the app needs the user ID and username, in order to
 * fetch todo records and render the user element in the navigation bar, that
 * information is stored in the session.
 */
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    User.findOne({ _id: id }, function (err, user) {
      done(err, user);
    });
  });
  
};
