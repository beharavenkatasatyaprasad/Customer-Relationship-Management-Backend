const express = require("express");
const app = express(); //initialize express
const bcrypt = require("bcryptjs"); //library to hash passwords
const bodyParser = require("body-parser"); //body parsing middleware
const cookieParser = require("cookie-parser"); //to parse cookies
const nodemailer = require("nodemailer"); //Send e-mails
const cors = require("cors"); //middleware that can be used to enable CORS with various options
const mongodb = require("mongodb"); //MongoDB driver
const mongoClient = mongodb.MongoClient;
require('dotenv').config()
const saltRounds = 10; //cost factor (controls how much time is needed to calculate a single BCrypt hash)

app.use(cookieParser());
app.use(bodyParser.json());

const url = process.env.MONGODB_URL;

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
        user: process.env.GMAILUSER,
        pass: process.env.GMAILPASS,
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
    let client = await mongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }); //connect to db
    let db = client.db("crm"); //db name
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
                        },
                        (err, result) => {
                            if (result) {
                                let emailToken = jwt.sign({
                                        exp: Math.floor(Date.now() / 1000) + 60 * 60,
                                        email: email,
                                    },
                                    process.env.JWT_SECRET
                                );

                                let Tokenurl = `https://crmserver.herokuapp.com/auth/${emailToken}`;
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
                                            message: "Check your mail and Confirm Identity...",
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
});

//Endpoint for resetting password
app.post("/ResetPassword", async (req, res) => {
    const {
        email
    } = req.body; //email from client
    let client = await mongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }); //connect to db
    let db = client.db("crm"); //db name
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
                // let token = uid(5);
                let emailToken = jwt.sign({
                        email: email,
                    },
                    process.env.JWT_SECRET, {
                        expiresIn: "10m",
                    }
                );
                user.findOneAndUpdate({
                    email: email,
                }, {
                    $set: {
                        confirmed: false,
                    },
                });
                let Tokenurl = `https://crmserver.herokuapp.com/auth/${emailToken}`;
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
                            message: "Check your mail and Confirm Identity...",
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
});

//Endpoint for get credential verification and login
app.post("/login", async (req, res) => {
    const {
        email,
        password
    } = req.body;
    let client = await mongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }); //connect to db
    let db = client.db("crm"); //db name
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
                if (User.confirmed == true) {
                    bcrypt.compare(password, User.password, function (err, result) {
                        //* if found compare the & check passworded match or not
                        if (err) {
                            return res.json({
                                message: "Something went wrong..",
                            });
                        }
                        if (result == true) {
                            //if matched
                            let token = jwt.sign({
                                    email: email,
                                },
                                process.env.JWT_SECRET, {
                                    expiresIn: "1h",
                                }
                            ); //*assign a token
                            res
                                .cookie("jwt", token, {
                                    maxAge: 1000000,
                                    httpOnly: true,
                                    secure: true,
                                })
                                .cookie("userType", usertype, {
                                    maxAge: 1000000,
                                    httpOnly: true,
                                    secure: true,
                                })
                                .cookie("user", gmail, {
                                    maxAge: 1000000,
                                    httpOnly: true,
                                    secure: true,
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
                        message: "User Identity not Confirmed..",
                    });
                }
            }
        }
    );
});

//Endpoint to verify the token and senting new password
app.post("/NewPassword", async (req, res) => {
    const {
        password,
        email
    } = req.body; //email & newpassword from client
    let client = await mongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }); //connect to db
    let db = client.db("crm"); //db name
    let user = db.collection("users"); //collection name
    user.findOne({
            email: email,
        },
        (err, User) => {
            if (User == null) {
                return res.json({
                    message: "No User found with " + email + " !!",
                }); //! if not found send this status
            } else {
                let token = User.confirmed; //find if the token exists in the collection
                if (token == true) {
                    try {
                        bcrypt.hash(password, saltRounds, function (err, hash) {
                            //hash the new password
                            user.findOneAndUpdate({
                                email: email,
                            }, {
                                $set: {
                                    password: hash, //and set the new hashed password in the db
                                },
                            });
                        });
                        user.findOneAndUpdate({
                            email: email,
                        }, {
                            $set: {
                                confirmed: false,
                            },
                        });
                        return res.json({
                            message: "Password reset Successful",
                        }); //*if done send this status
                    } catch (e) {
                        return res.json({
                            message: err,
                        }); //! if any error send this status
                    }
                }
            }
        }
    );
});

let port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`app listening on port ${port}`);
});
