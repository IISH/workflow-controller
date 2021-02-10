/**
 * iaa
 *
 * Description
 * Authenticate and authorize a user session.
 * Requests from localhost and other hostnames without a dot are always authorized.
 *
 * @param app express
 * @param passport Authenticator
 * @param web configuration
 */

module.exports = function (app, passport, web) {

    var env = process.env.NODE_ENV;

    app.all('*/*', function (req, res, next) {
        if (env === 'development' || req.hostname.indexOf('.') === -1) { // E.g. localhost
            req.user = {fullname: 'n.a.'};
            next();
        } else {
            switch (req.path) {
                case '/denied': // 403 not authorized. See the config users key
                case '/failed': // 401 unknown
                case '/login': // 401 login
                case '/ping': // 200
                case '/openid-connect-login':
                    next();
                    break;
                default:
                    if (req.isAuthenticated()) {
                        if (isAuthorized(req.user)) {
                            next();
                        } else {
                            res.redirect('/denied');
                        }
                    } else {
                        const accesstoken = web.accesstoken;
                        if (accesstoken === req.params.accesstoken) {
                            req.user = {authorized: true, fullname: 'api user'};
                            next();
                        } else {
                            let authorization = req.headers.authorization;
                            if (authorization) {
                                let split = authorization.split(' ', 2); // expect "Bearer [accesstoken]"
                                if (accesstoken === split[1]) {
                                    req.user = {authorized: true, fullname: 'api user'};
                                    next()
                                }
                            } else {
                                res.redirect('/login');
                            }
                        }
                    }
            }
        }
    });

    function isAuthorized(user) {
        return (user) ? user.authorized : false;
    }

    app.get('/login',
        passport.authenticate('oidc')
    );

    app.get('/openid-connect-login', passport.authenticate('oidc', {
        successRedirect: '/',
        failureRedirect: '/failed'
    }));

    app.get('/logout', function (req, res) {
        req.logout();
        res.render('logout', {title: 'Logout', theme: web.theme});
    });

    app.get('/failed', function (req, res) {
        req.logout();
        res.status = 401;
        res.render('logout', {title: 'Unknown user or password', theme: web.theme});
    });

    app.get('/denied', function (req, res) {
        let sub = req.user.sub;
        req.logout();
        res.status = 403;
        res.render('logout', {title: 'Access denied. Insufficient permissions', theme: web.theme, sub: sub});
    });

};
