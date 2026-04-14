const express = require("express")
const cookieParser = require("cookie-parser")


const app = express()

app.use(express.json())
app.use(cookieParser())

/**
 * - Routes required
 */
const authRoutes = require("./routes/auth.routes")
const accountRoutes = require("./routes/account.routes")

/**
 *  - Use Routes
 */

app.use("/api/auth", authRoutes)
app.use("/api/accounts", accountRoutes)

module.exports = app