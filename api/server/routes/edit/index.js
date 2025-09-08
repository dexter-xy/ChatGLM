const express = require('express');
const chatglm = require('./chatglm');
const gemini = require('./gemini');
const { isEnabled } = require('~/server/utils');
const { EModelEndpoint } = require('librechat-data-provider');
const {
  checkBan,
  uaParser,
  requireJwtAuth,
  messageIpLimiter,
  concurrentLimiter,
  messageUserLimiter,
  validateConvoAccess,
} = require('~/server/middleware');

const { LIMIT_CONCURRENT_MESSAGES, LIMIT_MESSAGE_IP, LIMIT_MESSAGE_USER } = process.env ?? {};

const router = express.Router();

router.use(requireJwtAuth);
router.use(checkBan);
router.use(uaParser);

if (isEnabled(LIMIT_CONCURRENT_MESSAGES)) {
  router.use(concurrentLimiter);
}

if (isEnabled(LIMIT_MESSAGE_IP)) {
  router.use(messageIpLimiter);
}

if (isEnabled(LIMIT_MESSAGE_USER)) {
  router.use(messageUserLimiter);
}

router.use(validateConvoAccess);

// ChatGLM和Gemini路由
router.use('/chatglm', chatglm);
router.use('/gemini', gemini);

module.exports = router;
