const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")

/** 
* - user register controller
* - POST /api/auth/register
*/ 

async function userRegisterController(req,res) {

    const {email, name, password} = req.body

    const isExists = await userModel .findOne({
        email: email
    })

    if (isExists) {
        return res.status(422).json({
            message: "Email already exists",
            status: "error"
        })
    }

    const user = await userModel.create({
        email,
        name,
        password
    })

    const token = jwt.sign({userId:user._id}, process.env.JWT_SECRET, {expiresIn: "1h"})

        res.cookie("token", token)

        res.status(201).json({
            user:{
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        })


}

module.exports = {
    userRegisterController
}