const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const mongodb = require("mongodb");
const nodemailer = require("nodemailer")
const jwt = require("jsonwebtoken")
const fs = require('fs');
const mongoClient = mongodb.MongoClient;
const {
    EncodeToken
} = require("../services/jwt");
require("dotenv").config();

const url = "mongodb+srv://satyaprasadbehara:Fdwe6cYnwFMERYMC@cluster0.efor9.mongodb.net/CustomerRelationshipManagement?retryWrites=true&w=majority";

router.use(bodyParser.json());

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "mockmail4me@gmail.com",
        pass: "dnvoerscnkohtwew",
    },
});

router.route("/").get(async (req, res) => {
    fs.readFile('./views/index.html',function (err, html) {
        if (err) {
            throw err; 
        }       
        res.writeHeader(200, {"Content-Type": "text/html"});  
        res.write(html);  
        res.end();             
    })
})
//endpoint for account verification
router.route("/auth/:token").get(async (req, res) => {
    const token = req.params.token;
    try {
        let decoded = jwt.verify(token, "abigsecret");
        if (decoded) {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            let db = client.db("CustomerRelationshipManagement"); //db name
            let user = db.collection("users"); //collection name
            user.findOneAndUpdate({
                    email: decoded.email,
                }, {
                    $set: {
                        verified: "something went wrong",
                    },
                },
                (err, result) => {
                    if (err) {
                        return res.json({
                            error: err,
                        });
                    }
                    if (result) {
                        return res.json({
                            message: "Account verification successful...",
                        });
                    }
                }
            );
        } else {
            return res.json({
                error: 'unauthorized request'
            })
        }
    } catch (err) {
        console.log(err);
        return res.json({
            error: "something went wrong",
        });
    }
});

//Endpoint for password reset request
router.route("/forgotPassword").get(async (req, res) => {
    const {
        email
    } = req.body; //email from client
    let errors = [];
    if (!email) {
        errors.push("email field is required !!");
    }
    if (errors.length === 0) {
        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }); //connect to db
            let db = client.db("CustomerRelationshipManagement"); //db name
            let user = db.collection("users"); //collection name
            user.findOne({
                    //find if the email exist in the collection
                    email: email,
                },
                (err, users) => {
                    if (users == null) {
                        return res.json({
                            message: "No registered user found with " + email,
                        }); //! if not found send this status
                    } else {
                        //if found
                        let emailToken = EncodeToken(email);
                        user.findOneAndUpdate({
                            email: email,
                        }, {
                            $set: {
                                verified: false,
                                confirmed: false,
                            },
                        });
                        let Tokenurl = `https://crm-backend-satya.herokuapp.com/passwordauth/${emailToken}`;
                        let name = `${email.split("@")[0]}`;
                        //email template for sending token
                        var mailOptions = {
                            from: '"Customer Relationship Management 🤝" <noreply@crm.com>',
                            to: `${email}`,
                            subject: "Password Reset Link",
                            html: `Hello ${name} ,<br> Here's your password reset link: <a style="color:green" href="${Tokenurl}">Click Here To Reset</a> Link expires in 10 minutes...`,
                        };

                        //Send the mail
                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                return res.json({
                                    message: error,
                                });
                            } else {
                                return res.json({
                                    message: "Check your mail and Confirm Identity for resetting password...",
                                }); //* if mail sent send this msg
                            }
                        });
                    }
                    if (err) {
                        return res.json({
                            message: err,
                        }); //! if found any error send this status
                    }
                }
            );
        } catch (err) {
            console.error(err);
            return res.json({
                error: "something went wrong..",
            });
        }
    } else {
        return res.json({
            error: errors,
        });
    }
});

//for password reset auth
router.route("/passwordauth/:token").get(async (req, res) => {
    const token = req.params.token;
    jwt.verify(token, "abigsecret", async (err, decoded) => {
        if (decoded) {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            let db = client.db("CustomerRelationshipManagement"); //db name
            let user = db.collection("users"); //collection name
            user.findOneAndUpdate({
                    email: decoded.email,
                }, {
                    $set: {
                        confirmed: true,
                        verified: false,
                    },
                },
                (err, result) => {
                    if (err) {
                        return res.json({
                            message: err,
                        });
                    }
                    if (result) {
                        return res.json({
                            message: "Your account is authorized to Password Reset, please go to /newPassword endpoint and reset your password..",
                        });
                    }
                }
            );
        }
        if (err) {
            return res.json({
                message: err,
            }); //if the token expired send this status
        }
    });
});

//Endpoint fot setting new password
router.route("/newPassword").post(async (req, res) => {
    let errors = [];
    const {
        email,
        newpassword
    } = req.body; //email & newpassword from client
    if (!email) {
        errors.push(`email field is required !!`);
    }
    if (!newpassword) {
        errors.push(`newpassword field is required !!`);
    }
    if (errors.length === 0) {
        let client = await mongoClient.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }); //connect to db
        let db = client.db("CustomerRelationshipManagement"); //db name
        let user = db.collection("users"); //collection name
        user.findOne({
                email: email,
            },
            async (err, User) => {
                if (User == null) {
                    return res.json({
                        error: "No User found with " + email + " !!",
                    }); //! if not found send this status
                } else {
                    let token = User.confirmed; //find if the token exists in the collection
                    if (token == true) {
                        try {
                            let saltRounds = await bcrypt.genSalt(10);
                            let hashedPwd = await bcrypt.hash(newpassword, saltRounds)
                            //hash the new password
                            user.findOneAndUpdate({
                                email: email,
                            }, {
                                $set: {
                                    password: hashedPwd, //and set the new hashed password in the db
                                    confirmed: false,
                                    verified: true,
                                },
                            });
                            return res.json({
                                message: "Password reset Successful",
                            }); //*if done send this status
                        } catch (err) {
                            return res.json({
                                error: err,
                            }); //! if any error send this status
                        }
                    }else{
                        return res.json({
                            error: 'unauthorized request'
                        });
                    }
                }
            }
        );
    } else {
        return res.json({
            error: errors,
        });
    }
});

module.exports = router;
