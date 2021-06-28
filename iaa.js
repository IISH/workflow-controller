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

module.exports = function(app, openid, users) {

    const passport = require('passport');
    const Issuer = require('openid-client').Issuer;
    const Strategy = require('openid-client').Strategy;
    const jose = require('node-jose'); // used to parse the keystore
    const keystore = jose.JWK.asKeyStore(openid.keystore); // https://sometimes-react.medium.com/jwks-and-node-jose-9273f89f9a02

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
// since we need both the Issuer and the keystore, we'll use Promise.all()
    Promise.all([keystore, discover_issuer])
        .then(([_keystore, myIssuer]) => {
            console.log('Found Issuer: ', myIssuer);
            const oidc_client = new myIssuer.Client(openid.client_params, _keystore);
            console.log('Created client: ', oidc_client);
            console.log('Keystore ', _keystore);

            // create a strategy along with the function that processes the results
            passport.use('oidc', new Strategy({client: oidc_client, params: openid.strategy}, (tokenset, userinfo, done) => {
                // User.findOrCreate(userinfo.sub, userinfo, (err, user) => { done(err, user); });
                // we'll just pass along the userinfo object as a simple 'user' object
                let user = users[userinfo.sub];
                userinfo.fullname = user;
                userinfo.authorized = Boolean(user);
                return done(null, userinfo);
            }));
        }) // close off the .then()
        .catch((err) => {console.log('Error in OIDC setup', err);});

    return passport;
};
