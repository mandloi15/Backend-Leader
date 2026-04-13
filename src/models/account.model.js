const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [ true, "User reference is required"],
        index: true
    },
    status:{
        enum:{
            values: ["ACTIVE","FROZEN","CLOSED"],
            message: "Status must be either ACTIVE, FROZEN or CLOSED"
        }
    },
    currency:{
        type:String,
        required: [ true, "Currency is required"],
        default: "INR"
    }
}, {
    timestamps: true
})

const accountModel = mongoose.model("Account", accountSchema)
