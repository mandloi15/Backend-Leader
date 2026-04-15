const express = require("express")
const { authMiddleware } = require("../middleware/auth.middleware")
const accountController = require("../controllers/account.controller")


const router = express.Router()



/**
 * - POST /api/accounts/
 * - Create a new account
 * - Protected Route
*/
router.post("/", authMiddleware, accountController.createAccountController)

/**
 * - GET /api/accounts/
 * - Get all accounts of the logged-in user
 * - protected Route
 */
router.get("/", authMiddleware, accountController.getUserAccountsController)


module.exports = router