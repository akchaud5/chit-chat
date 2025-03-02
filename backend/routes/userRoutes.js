const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
  updatePublicKey,
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").get(protect, allUsers);
router.route("/").post(registerUser);
router.post("/login", authUser);
router.route("/publickey/:userId").put(protect, updatePublicKey);

module.exports = router;
