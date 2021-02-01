const express = require("express");
const app = express.Router();
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const {
    EncodeToken
} = require("../services/jwt");
require("dotenv").config();

app.use(cookieParser());
app.use(bodyParser.json());

router.route("/register").post(async (req, res) => {
    const cookies = req.cookies
    console.log(cookies)
    const {
        fname,
        lname,
        userType,
        email,
        password
    } = req.body; //email & password from client
    let errors = []
    if (!fname) {
        errors.push('fname field is required !!')
    }
    if (!lname) {
        errors.push('lname field is required !!')
    }
    if (!password) {
        errors.push('password field is required !!')
    }
    if (userType !== 'admin' && userType !== 'employee' && userType !== 'manager') {
        (!userType) ? errors.push('userType field is required !!'): errors.push(userType + ' is not a valid user type !!')
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
            (err, result) => {
                //find if the email is already exist in the collection
                if (err) {
                    console.log(err)
                    return res.json({
                        error: "something went wrong",
                    });
                }
                if (result == null) {
                    let saltRounds = await bcrypt.genSalt(10);
                    let hashedPwd = await bcrypt.hash(password, saltRounds)
                    user.insertOne({
                            fname: fname,
                            lname: lname,
                            email: email,
                            password: hashedPwd,
                            userType: userType,
                            verified: false,
                            confirmed: false
                        },
                        (err, result) => {
                            if (err) console.log(err)
                            if (result) {
                                let emailToken = encodeToken(email)
                                let Tokenurl = `http://localhost:3000/auth/${emailToken}`;
                                let name = fname + " " + lname;
                                transporter.sendMail({
                                        from: '"Customer Relationship Management 🤝" <noreply@crm.com>',
                                        to: `${email}`,
                                        subject: "Account Confirmation Link",
                                        html: `Hello ${name} , Here's your Account verification link: <br> <a style="color:green" href="${Tokenurl}">Click Here To Confirm</a> <br> Link expires in an hour...`,
                                    },
                                    (error, info) => {
                                        console.log(info)
                                        if (error) {
                                            console.log(error);
                                        } else {
                                            return res.json({
                                                message: "Registration successful...A mail sent to " + email + " for user confirmation..."
                                            }); //* if mail sent send this msg
                                        }
                                    });
                            }
                        }
                    );
                } else {
                    return res.json({
                        message: "email already exists!!",
                    });
                }
            }
        );
    } else {
        return res.json({
            error: errors
        });
    }
});

//endpoint for account verification
router.route("/auth/:token").get((req, res) => {
    const token = req.params.token
    try {
        jwt.verify(token, 'abigsecret', async function (err, decoded){
            if (decoded) {
                let client = await mongoClient.connect(url, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                });
                let db = client.db("CustomerRelationshipManagement"); //db name
                let user = db.collection("users"); //collection name
                user.findOneAndUpdate({
                    email: decoded.email
                }, {
                    $set: {
                        verified: true
                    }
                }, (err, result) => {
                    if (err) {
                        return res.json({
                            error: err
                        });
                    }
                    if (result) {
                        return res.json({
                            message: 'Account verification successful...'
                        });
                    }
                });
            }
            if (err) {
                return res.json({
                    error: "Link has expired"
                }); //if the token expired send this status
            }
        });
        client.close()
    }
    catch (err) {
        console.log(err)
        return res.json({
            error: "something went wrong"
        })
    }
});

//Endpoint for password reset request
router.route("/forgotPassword").get(async (req, res) => {
    const {
        email
    } = req.body; //email from client
    let errors = []
    if (!email) {
        errors.push("email field is required !!")
    }
    if (errors.length === 0) {
       
        try{
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
                        let emailToken = encodeToken(email);
                        user.findOneAndUpdate({
                            email: email,
                        }, {
                            $set: {
                                verified: false,
                                confirmed: false
                            },
                        });
                        let Tokenurl = `http://localhost:3000/passwordauth/${emailToken}`;
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
        }
        catch (err) {
            console.error(err)
            return res.json({error: 'something went wrong..'});
        }
    } 
     else {
        return res.json({
            error: errors
        });
    }
    
});

//for password reset auth
router.route("/passwordauth/:token").get( (req, res) => {
    const token = req.params.token
    jwt.verify(token, 'abigsecret', async (err, decoded) => {
        if (decoded) {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            let db = client.db("CustomerRelationshipManagement"); //db name
            let user = db.collection("users"); //collection name
            user.findOneAndUpdate({
                email: decoded.email
            }, {
                $set: {
                    confirmed: true,
                    verified: false
                }
            }, (err, result) => {
                if (err) {
                    return res.json({
                        message: err
                    });
                }
                if (result) {
                    return res.json({
                        message: 'Your account is authorized to Password Reset, please go to /NewPassword endpoint and reset your password..'
                    })
                }
            });
        }
        if (err) {
            return res.json({
                message: err
            }); //if the token expired send this status
        }
    });
});

//Endpoint fot setting new password
router.route("/NewPassword").post( async (req, res) => {
    let errors = []
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
            (err, User) => {
                if (User == null) {
                    return res.json({
                        error: "No User found with " + email + " !!",
                    }); //! if not found send this status
                } else {
                    let token = User.confirmed; //find if the token exists in the collection
                    if (token == true) {
                        try {
                            bcrypt.hash(newpassword, saltRounds, function (err, hash) {
                                //hash the new password
                                user.findOneAndUpdate({
                                    email: email,
                                }, {
                                    $set: {
                                        password: hash, //and set the new hashed password in the db
                                        confirmed: false,
                                        verified: true
                                    },
                                });
                            });
                            return res.json({
                                message: "Password reset Successful",
                            }); //*if done send this status
                        } catch (err) {
                            return res.json({
                                error: err
                            }); //! if any error send this status
                        }
                    }
                }
            }
        );
    } else {
        return res.json({
            error: errors
        });
    }
    db.close();
});

module.exports = router;
