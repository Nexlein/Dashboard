const jwt = require('jsonwebtoken');
const { signAuthToken } = require('./authToken');

// The JWT lives in an httpOnly cookie: page scripts (and so an XSS payload) cannot read it.
const SESSION_COOKIE = 'dashboard_session';

function cookieOptions(req) {
    return {
        httpOnly: true,
        sameSite: 'lax',
        // Follow the request scheme (X-Forwarded-Proto behind nginx): browsers drop Secure
        // cookies received over plain HTTP, which would break login on an HTTP deployment.
        secure: req.secure,
        path: '/',
    };
}

/** Signs a JWT for `user` and stores it in the session cookie until it expires. */
function startSession(req, res, user) {
    const token = signAuthToken(user);
    const { exp } = jwt.decode(token);
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions(req), expires: new Date(exp * 1000) });
}

function endSession(req, res) {
    res.clearCookie(SESSION_COOKIE, cookieOptions(req));
}

module.exports = { SESSION_COOKIE, startSession, endSession };
