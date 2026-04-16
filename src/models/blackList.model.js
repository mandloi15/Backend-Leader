const mongoose = require("mongoose")
const { create } = require("./transaction.model")



const tokenBlacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [ true, "Token is required to blacklist it"],
        unique: [true, "Token is already blacklisted"]
    }
},{
    timestamps: true
})

tokenBlacklistSchema.index({ createdAt: 1}, {
    expireAfterSeconds: 60 * 60 * 24 * 3 // 3 days
})

const tokenBlacklistModel = mongoose.model("tokenBlacklist", tokenBlacklistSchema)

module.exports = tokenBlacklistModel