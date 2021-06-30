/**
 * iaa
 *
 * Description
 * Setup openid connect authenticator
 *
 * @param app express
 * @param openid configuration
 * @param users whitelist
 * @returns {Authenticator}
 */

module.exports = function (app, openid, users) {

    const passport = require('passport');
    const Issuer = require('openid-client').Issuer;
    const Strategy = require('openid-client').Strategy;

// initialize passport here
    app.use(passport.initialize({}));
    app.use(passport.session({}));

// passport has to serialize/deserialize users to the sessions.
//  This is a simple case
    passport.serializeUser((user, done) => {
        done(null, user);
    });
    passport.deserializeUser((user, done) => {
        done(null, user);
    });

// discover the Issuer. returns a Promise
//   you can also set this up manually, see the project documentation
    let discover_issuer = Issuer.discover(openid.oidc_discover_url);

// Create a client, and use it set up a Strategy for passport to use
    Promise.all([discover_issuer])
        .then(([myIssuer]) => {
            console.log('Found Issuer: ', myIssuer);
            const oidc_client = new myIssuer.Client(openid.client_params);
            console.log('Created client: ', oidc_client);

            // create a strategy along with the function that processes the results
            passport.use('oidc', new Strategy({
                client: oidc_client,
                params: openid.strategy
            }, (tokenset, userinfo, done) => {
                // User.findOrCreate(userinfo.sub, userinfo, (err, user) => { done(err, user); });
                // we'll just pass along the userinfo object as a simple 'user' object
                let user = users.find(function (u) {
                    return (u.oidc === userinfo.sub);
                });
                userinfo.fullname = user.fullname || 'anonymous';
                userinfo.authorized = Boolean(user);
                return done(null, userinfo);
            }));
        }) // close off the .then()
        .catch((err) => {
            console.log('Error in OIDC setup', err);
        });

    return passport;
};
