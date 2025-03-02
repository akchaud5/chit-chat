const express = require("express");
const { 
  createCall, 
  updateCallStatus, 
  getCallHistory, 
  getChatCallHistory
} = require("../controllers/callControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, createCall);
router.route("/status").put(protect, updateCallStatus);
router.route("/history").get(protect, getCallHistory);
router.route("/chat/:chatId").get(protect, getChatCallHistory);

module.exports = router;