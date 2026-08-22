const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth');
const optionalAuth = require('../middlewares/optionalAuth');
const rateLimit = require('../middlewares/rateLimit');

const loginLimiter = rateLimit({ windowMs: 5 * 1000, max: 20 });
const registerLimiter = rateLimit({ windowMs: 60  * 1000, max: 10 });
const googleLimiter = rateLimit({ windowMs: 5 * 1000, max: 20 });

router.post('/login',  loginLimiter, controller.login);
router.post('/register', registerLimiter, controller.register);
router.post('/google', googleLimiter, controller.googleAuth);
router.post('/login',  loginLimiter, controller.login);
router.post('/logout', controller.logout);
router.get('/me', optionalAuth, controller.me);

module.exports = router;
