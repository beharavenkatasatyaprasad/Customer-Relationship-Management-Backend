const express = require("express");
const app = express(); //initialize express
const bcrypt = require("bcryptjs"); //library to hash passwords
const bodyParser = require("body-parser"); //body parsing middleware
const cookieParser = require("cookie-parser"); //to parse cookies
const nodemailer = require("nodemailer"); //Send e-mails
const mongodb = require("mongodb"); //MongoDB driver
const {
    EncodeToken
} = require("./services/jwt")
const jwt = require("jsonwebtoken")
const mongoClient = mongodb.MongoClient;
require('dotenv').config()
let saltRounds = 10;

app.use(cookieParser());
app.use(bodyParser.json());

const url = "mongodb+srv://satyaprasadbehara:Fdwe6cYnwFMERYMC@cluster0.efor9.mongodb.net/CustomerRelationshipManagement?retryWrites=true&w=majority";

mongoClient.connect(
    url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
    function (err, db) {
        if (err) throw err;
        console.log("Database Connected!");
        db.close();
    }
);

//credentials for mail transport
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "mockmail4me@gmail.com",
        pass: "dnvoerscnkohtwew",
    },
});

//index Endpoint for server
app.get("/", (req, res) => {
    res.send("Hello From Server");
});

app.post("/register", async (req, res) => {
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
                    return res.json({
                        message: "something went wrong",
                    });
                }
                if (result == null) {
                    bcrypt.hash(password, saltRounds, function (err, hash) {
                        //hash the client password
                        if (err) {
                            return res.json({
                                message: "something went wrong",
                            });
                        }
                        user.insertOne({
                                fname: fname,
                                lname: lname,
                                email: email,
                                password: hash,
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
                                    //email template for sending token
                                    var mailOptions = {
                                        from: '"Customer Relationship Management 🤝" <noreply@crm.com>',
                                        to: `${email}`,
                                        subject: "Account Confirmation Link",
                                        html: `Hello ${name} , Here's your Account verification link: <br> <a style="color:green" href="${Tokenurl}">Click Here To Confirm</a> <br> Link expires in an hour...`,
                                    };
                                    transporter.sendMail(mailOptions, function (error, info) {
                                        if (error) {
                                            console.log(error);
                                        } else {
                                            return res.json({
                                                message: "Registration successful...please Check your mail and Confirm Identity...",
                                            }); //* if mail sent send this msg
                                        }
                                    });
                                }
                            }
                        );
                    });
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
app.get("/auth/:token", (req, res) => {
    const token = req.params.token
    jwt.verify(token, 'abigsecret', async function (err, decoded) {
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
                    verified: true //and set the new hashed password in the db
                }
            }, (err, result) => {
                if (err) {
                    return res.json({
                        message: err
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
                message: err
            }); //if the token expired send this status
        }
    });
});

//Endpoint for get credential verification and login
app.post("/login", async (req, res) => {
    const {
        email,
        password
    } = req.body;
    let errors = []
    if (!email) {
        errors.push('email field is required !!')
    }
    if (!password) {
        errors.push('password field is required !!')
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
                if (err) {
                    return res.json({
                        message: "something went wrong",
                    });
                }
                if (User == null) {
                    return res.json({
                        message: "No registered user found with " + email,
                    });
                } else {
                    let usertype = User.userType;
                    let name = User.fname + " " + User.lname;
                    if (User.verified == true) {
                        bcrypt.compare(password, User.password, function (err, result) {
                            //* if found compare the & check passworded match or not
                            if (err) {
                                return res.json({
                                    message: "Something went wrong..",
                                });
                            }
                            if (result == true) {
                                //if matched
                                let token = EncodeToken(email)

                                res
                                    .cookie("jwt", token, {
                                        maxAge: 1000000,
                                        // httpOnly: true,
                                        // secure: true,
                                    })
                                    .cookie("userType", usertype, {
                                        maxAge: 1000000,
                                        // httpOnly: true,
                                        // secure: true,
                                    })
                                    .cookie("user", email, {
                                        maxAge: 1000000,
                                        // httpOnly: true,
                                        // secure: true,
                                    })
                                    .json({
                                        message: "Hello " + name + " , you are successfully logged in..." //if credentials matched,
                                    });
                            } else {
                                return res.json({
                                    message: "Invalid Credentials..", //if the credentials were not matching
                                });
                            }
                        });
                    } else {
                        return res.json({
                            message: "User Identity not verified..",
                        });
                    }
                }
            }
        );
    } else {
        return res.json({
            error: errors
        });
    }
});

//Endpoint for password reset request
app.post("/ResetPassword", async (req, res) => {
    const {
        email
    } = req.body; //email from client
    let errors = []
    if (!email) {
        errors.push("email field is required !!")
    }
    if (errors.length === 0) {
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
    } else {
        return res.json({
            error: errors
        });
    }
});

//for password reset auth
app.get("/passwordauth/:token", (req, res) => {
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
app.post("/NewPassword", async (req, res) => {
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

let port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`app listening on port ${port}`);
});
