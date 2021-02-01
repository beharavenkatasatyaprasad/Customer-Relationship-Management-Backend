const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongodb = require("mongodb");
const nodemailer = require("nodemailer")
const mongoClient = mongodb.MongoClient;
const {
    EncodeToken
} = require("../services/jwt");
require("dotenv").config();

router.use(cookieParser());
router.use(bodyParser.json());

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "mockmail4me@gmail.com",
        pass: "dnvoerscnkohtwew",
    },
});

router.route("/login").post(async (req, res) => {
    const {
        email,
        password
    } = req.body;
    let errors = [];
    if (!email) {
        errors.push("email field is required !!");
    }
    if (!password) {
        errors.push("password field is required !!");
    }
    try {
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
                        error: "something went wrong",
                    });
                }
                if (User === null) {
                    errors.push("No registered user found with " + email);
                }
                if (errors.length === 0) {
                    let usertype = User.userType;
                    let name = User.fname + " " + User.lname;
                    if (User.verified == true) {
                        let passwordMatched = bcrypt.compare(
                            password,
                            User.password,
                            result.password
                        );
                        if (passwordMatched == true) {
                            //if matched
                            let token = EncodeToken(email);
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
                                    message: "Hello " + name + " , you are successfully logged in...", //if credentials matched,
                                });
                        } else {
                            return res.json({
                                error: "Invalid Credentials..", //if the credentials were not matching
                            });
                        }
                    } else {
                        return res.json({
                            error: "User Identity not verified..",
                        });
                    }
                } else {
                    return res.json({
                        error: errors,
                    });
                }
            }
        );
        client.close();
    } catch (err) {
        console.log(err);
        return res.json({
            error: "something went wrong",
        });
    }
});

//endpoint for account verification
router.route("/auth/:token").get((req, res) => {
    const token = req.params.token;
    try {
        jwt.verify(token, "abigsecret", async function (err, decoded) {
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
                            verified: true,
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
            }
            if (err) {
                return res.json({
                    error: "Link has expired",
                }); //if the token expired send this status
            }
        });
        client.close();
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
                        let emailToken = encodeToken(email);
                        user.findOneAndUpdate({
                            email: email,
                        }, {
                            $set: {
                                verified: false,
                                confirmed: false,
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
router.route("/passwordauth/:token").get( (req, res) => {
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
                            message: "Your account is authorized to Password Reset, please go to /NewPassword endpoint and reset your password..",
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
                                        verified: true,
                                    },
                                });
                            });
                            return res.json({
                                message: "Password reset Successful",
                            }); //*if done send this status
                        } catch (err) {
                            return res.json({
                                error: err,
                            }); //! if any error send this status
                        }
                    }
                }
            }
        );
    } else {
        return res.json({
            error: errors,
        });
    }
    db.close();
});

// endpoint to create lead
router.route("/createLead").post(async (req, res) => {
    const {
        email,
        status,
        contact,
        company
    } = req.body;
    const {
        lead
    } = req.body;
    let errors = [];
    if (!email) {
        errors.push("email field is required !!");
    }
    if (!lead) {
        errors.push("lead field is required !!");
    }
    if (errors.length === 0) {
        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            let db = client.db("CustomerRelationshipManagement");
            let users = db.collection("users")
            let leads = db.collection("leads");
            let admins =
                users.find({
                    userType: "admin",
                })
                .toArray((err, mailIds) => {
                    if (err) {
                        return "";
                    } else {
                        return mailIds;
                    }
                });
            let managers =
                users.findOne({
                    userType: "manager",
                })
                .toArray((err, user) => {
                    if (err) {
                        return "";
                    } else {
                        return user.email;
                    }
                });
            let sendto = [...admins, ...managers];
            let mails = sendto.length || ["dvsav@xzvkbxc.com"];
            console.log(mails);
            leads.insertOne({
                    createdBy: email,
                    company: company,
                    status: status,
                    contact: contact,
                    createdAt: new Date()
                },
                (err, result) => {
                    if (err) console.log(err);
                    if (result) {
                        let mailOptions = {
                            from: '"Customer Relationship Management 🤝" <noreply@crm.com>',
                            to: `${email}`,
                            subject: "New Lead by" + email,
                            html: `Hello, ,<br /> New lead has been created by` + email,
                        };
                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log(error);
                            } else {
                                return res.json({
                                    message: "Lead successfully created..",
                                }); //* if mail sent send this msg
                            }
                        });
                    }
                }
            );
            client.close();
        } catch (error) {
            console.log(error);
            return res.json({
                error: "something went wrong",
            });
        }
    } else {
        return res.json({
            error: errors,
        });
    }
});

//end point to fetch lead 
router.route("/getLeads").get(async (req, res) => {
    let {
        email
    } = req.body;
    if (!email) {
        return res.json({
            message: "email field is required !!",
        });
    } else {
        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            let db = client.db("CustomerRelationshipManagement");
            let leads = db.collection("leads");
            leads.find({
                    email: email,
                })
                .toArray((err, result) => {
                    if (err) throw err;
                    if (result) {
                        return res.json({
                            result,
                        });
                    }
                });
            client.close();
        } catch (error) {
            console.log(error);
            return res.json({
                error: "something went wrong",
            });
        }
    }
});

// endpoints to update leads
router.route("/updateLead").put(async (req, res) => {
    const {
        email,
        status,
        contact,
        company,
        id
    } = req.body;
    if (!id) {
        errors.push('id field is required !!')
    }
    let errors = []
    if (!email) {
        errors.push('email field is required !!')
    }
    if (!status) {
        errors.push('status field is required !!')
    }
    if (!contact) {
        errors.push('contact field is required !!')
    }
    if (!company) {
        errors.push('contact field is required !!')
    }
    if (errors.length === 0) {

        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            let db = client.db("CustomerRelationshipManagement");
            await db.collection("leads").updateOne({
                _id: objectId(id),
            }, {
                $set: {
                    company: company,
                    status: status,
                    contact: contact,
                    updatedAt: new Date(),
                    Updatedby: email
                },
            }, (err, result) => {
                if (result) {
                    return res.json({
                        message: "lead updated successfully.."
                    });
                } else if (!result.length) {
                    return res.json({
                        message: "no leads were found with " + email,
                    });
                }
            });
            client.close();
        } catch (error) {
            console.log(error);
            return res.json({
                error: 'something went wrong'
            })
        }
    } else {
        return res.json({
            errors: errors
        })
    }
});

// endpoint to create service
router.route("/createService").post(async (req, res) => {
    const {
        email,
        status,
        contact,
        company
    } = req.body;
    let errors = []
    if (!email) {
        errors.push('email field is required !!')
    }
    if (!status) {
        errors.push('status field is required !!')
    }
    if (!contact) {
        errors.push('contact field is required !!')
    }
    if (!company) {
        errors.push('contact field is required !!')
    }
    if (errors.length === 0) {
        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            let db = client.db("CustomerRelationshipManagement");
            let services = db.collection("services");
            let users = db.collection("users")
            let admins =
                users.find({
                    userType: "admin",
                })
                .toArray((err, mailIds) => {
                    if (err) {
                        return "";
                    } else {
                        return mailIds;
                    }
                });
            let managers =
                users.findOne({
                    userType: "manager",
                })
                .toArray((err, user) => {
                    if (err) {
                        return "";
                    } else {
                        return user.email;
                    }
                });
            let sendto = [...admins, ...managers];
            let mails = sendto.length || ["dvsav@xzvkbxc.com"];
            console.log(mails);
            services.insertOne({
                    company: company,
                    createdAt: new Date(),
                    status: status,
                    createdBy: email,
                    contact: contact,
                },
                (err, result) => {
                    if (err) console.log(err);
                    if (result) {
                        let mailOptions = {
                            from: '"Customer Relationship Management 🤝" <noreply@crm.com>',
                            to: `${email}`,
                            subject: "New Service by" + email,
                            html: `Hello,<br /> New Service had been created by` + email,
                        };
                        transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                console.log(error);
                            } else {
                                return res.json({
                                    message: "new service successfully created..",
                                }); //* if mail sent send this msg
                            }
                        });
                    }
                }
            );
            client.close();
        } catch (error) {
            console.log(error);
            return res.json({
                error: 'something went wrong !!'
            })
        }
    } else {
        return res.json({
            errors: errors
        })
    }
});

// endpoint to get services info
router.route("/getServices").get(async (req, res) => {
    let {
        email
    } = req.body
    if (!email) {
        return res.json({
            message: "email field is required !!"
        })
    } else {
        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }); //connect to db
            let db = client.db("CustomerRelationshipManagement");
            await db
                .collection("services")
                .find({
                    email: email
                })
                .toArray(
                    (err, res) => {
                        if (result) {
                            return res.json({
                                services: result
                            });
                        } else {
                            return res.json({
                                message: "no services found"
                            });
                        }
                    });
            client.close();
        } catch (error) {
            console.log(error);
            return res.json({
                error: "something went wrong"
            });
        }
    }
});

// endpoint to update services
router.route("/updateService").put(async (req, res) => {
    const {
        email,
        status,
        contact,
        company,
        id
    } = req.body;
    if (!id) {
        errors.push('id field is required !!')
    }
    if (!status) {
        errors.push('id field is required !!')
    }
    if (!contact) {
        errors.push('id field is required !!')
    }
    if (!company) {
        errors.push('id field is required !!')
    }
    if (!email) {
        errors.push('id field is required !!')
    }
    if (errors.length === 0) {
        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }); //connect to db
            let db = client.db("crm");
            let result = await db.collection("users").findOne({
                email: req.body.email,
            });
            await db.collection("services").updateOne({
                _id: objectId(id),
            }, {
                $set: {
                    company: company,
                    status: status,
                    createdBy: email,
                    contact: contact,
                    createdAt: new Date()
                },
            }, (err, result) => {
                if (result) {
                    return res.json({
                        message: "service updated successfully.."
                    });
                } else if (!result.length) {
                    return res.json({
                        message: "no services were found with " + email,
                    });
                }
            });
            client.close();
        } catch (error) {
            console.log(error);
            return res.json({
                error: 'something went wrong'
            })
        }
        client.close();
    } else {
        return res.json({
            error: errors
        })
    }
});

// endpoint to create contact
router.route("/createContact").post(async (req, res) => {
    const {
        email,
        status,
        contact,
        name
    } = req.body;
    let errors = [];
    if (!status) {
        errors.push('id field is required !!')
    }
    if (!contact) {
        errors.push('id field is required !!')
    }
    if (!name) {
        errors.push('id field is required !!')
    }
    if (!email) {
        errors.push('id field is required !!')
    }
    if (errors.length === 0) {
        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }); //connect
            let db = clientInfo.db("CustomerRelationshipManagement");
            await db.collection("contacts").insertOne({
                createdBy: email,
                status: status,
                contact: contact,
                name: name,
                createdAt: new Date()
            }, (err, result) => {
                if (err) {
                    return res.json({
                        error: err
                    })
                }
                if (result) {
                    return res.json({
                        message: 'contact successfully created !!'
                    });

                }
            });
            client.close();
        } catch (error) {
            console.log(error);
            return res.json({
                error: 'something went wrong'
            })
        }
    } else {
        return res.json({
            errors: errors
        })

    }
});

// endpoint to get contacts
router.route("/getContact").get(async (req, res) => {
    let {
        email
    } = req.body
    if (!email) {
        return res.json({
            error: 'email field is required !!'
        })
    } else {
        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }); //connect to db
            let db = client.db("CustomerRelationshipManagement");
            await db
                .collection("contacts")
                .find({
                    email: email
                })
                .toArray(
                    (err, result) => {
                        if (result) {
                            return res.json({
                                result
                            });
                        } else if (!result.length) {
                            return res.json({
                                result: "no contacts were found with " + email,
                            });
                        }
                    }
                );
            client.close();
        } catch (error) {
            console.log(error);
            return res.json({
                error: 'something went wrong'
            })
        }
    }
});

//  endpoint to update contacts
router.route("/updateContact").put( async (req, res) => {
    const {
        email,
        status,
        contact,
        name,
        id
    } = req.body;
    let errors = [];
    if (!status) {
        errors.push('id field is required !!')
    }
    if (!contact) {
        errors.push('id field is required !!')
    }
    if (!name) {
        errors.push('id field is required !!')
    }
    if (!email) {
        errors.push('id field is required !!')
    }
    if (!id) {
        errors.push('id field is required !!')
    }
    if (errors.length === 0) {

        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }); //connect to db
            let db = client.db("CustomerRelationshipManagement");

            let result = await db.collection("contacts").updateOne({
                _id: objectId(id),
            }, {
                $set: {
                    email: email,
                    status: status,
                    contact: contact,
                    name: name,
                    updatedAt: new Date(),
                },
            });

            if (result) {
                res.status(200).json({
                    message: "Contact updated",
                    result,
                });
            } else if (!result.length) {
                res.status(200).json({
                    message: "no contact found",
                });
            }
            client.close();
        } catch (error) {
            console.log(error);
            return res.json({
                error: "something went wrong",
            });
        }
    } else {
        return res.json({
            error: errors
        })
    }
});

module.exports = router;