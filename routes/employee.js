const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongodb = require("mongodb");
const nodemailer = require("nodemailer")
const jwt = require("jsonwebtoken")
const mongoClient = mongodb.MongoClient;
const ObjectId = require('mongodb').ObjectId;
const {
    EncodeToken
} = require("../services/jwt");
require("dotenv").config();

const url = "mongodb+srv://satyaprasadbehara:Fdwe6cYnwFMERYMC@cluster0.efor9.mongodb.net/CustomerRelationshipManagement?retryWrites=true&w=majority";

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
    if (errors.length === 0) {
        let client = await mongoClient.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }); //connect to db
        let db = client.db("CustomerRelationshipManagement"); //db name
        let user = db.collection("users"); //collection name
        await user.findOne({
                email: email,
            },
            async (err, User) => {
                if (err) {
                    console.log(err);
                    return res.json({
                        error: err,
                    });
                }
                if (User === null) {
                    return res.json({
                        error: `No registered user found with ${email}`,
                    });
                } else if (User.userType !== "employee") {
                    return res.json({
                        error: User.userType +
                            "  will not have permission to access employee portal",
                    });
                } else {
                    if (User === null) {
                        return res.json({
                            message: "No registered user found with " + email,
                        });
                    } else {
                        let usertype = User.userType;
                        let name = User.fname + " " + User.lname;
                        if (User.verified === true) {
                            let passwordMatched = await bcrypt.compare(password, User.password);
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
                                    .cookie("user", User._id, {
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
router.route("/passwordauth/:token").get((req, res) => {
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
        createdBy,
        status,
        contact,
        company
    } = req.body;
    let errors = [];
    if (!createdBy) {
        errors.push("createdBy field is required !!");
    }
    if (!company) {
        errors.push("company field is required !!");
    }
    if (!status) {
        errors.push("status field is required !!");
    }
    if (!contact) {
        errors.push("contact field is required !!");
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
                await users.find({
                    userType: "admin",
                })
                .toArray();
            let managers =
                await users.find({
                    userType: "manager",
                })
                .toArray();
            let adminsMails = []
            let managersMails = []
            if (admins.length) {
                admins.forEach(admin => {
                    adminsMails.push(admin.email);
                })
            }
            if (managers.length) {
                managers.forEach(manager => {
                    managersMails.push(manager.email);
                })
            }
            let isAdminMailsUndefined = adminsMails || ["satyaprasadbehara@gmail.com"]
            let isManagersMailsUndefined = managersMails || ["satyaplanet1@gmail.com"]
            let sendto = [...isAdminMailsUndefined, ...isManagersMailsUndefined];
            leads.insertOne({
                    createdBy: createdBy,
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
                            to: sendto,
                            subject: "New Lead alert",
                            html: `Hello, ,<br /> New lead has been created by` + createdBy,
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
            let leads = await db.collection("leads").find({
                createdBy: email
            }).toArray();
            let allleads = leads || 'no contacts found..'
            return res.json({
                leads: allleads
            });
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
        Updatedby,
        status,
        contact,
        company,
        id
    } = req.body;
    if (!id) {
        errors.push('id field is required !!')
    }
    let errors = []
    if (!Updatedby) {
        errors.push('Updatedby field is required !!')
    }
    if (!status) {
        errors.push('status field is required !!')
    }
    if (!contact) {
        errors.push('company field is required !!')
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
            let o_id = new ObjectId(id);
            await db.collection("leads").updateOne({
                _id: o_id,
            }, {
                $set: {
                    company: company,
                    status: status,
                    contact: contact,
                    updatedAt: new Date(),
                    Updatedby: Updatedby
                },
            }, (err, result) => {
                if (result) {
                    return res.json({
                        message: "lead updated successfully.."
                    });
                } else {
                    return res.json({
                        message: "no leads were found with " + Updatedby,
                    });
                }
            });
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
    let jwtcookie = req.cookies.jwt
    const {
        createdBy,
        status,
        contact,
        company
    } = req.body;
    let errors = []
    if (!createdBy) {
        errors.push('email field is required !!')
    }
    if (!jwtcookie) {
        errors.push('unauthorized request');
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
            let token = jwt.verify(jwtcookie, "abigsecret");
            let email = token.email;
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            let db = client.db("CustomerRelationshipManagement");
            let services = db.collection("services");
            let users = db.collection("users")
            let admins =
                await users.find({
                    userType: "admin",
                })
                .toArray();
            let managers =
                await users.find({
                    userType: "manager",
                })
                .toArray();
            console.log(managers)
            let adminsMails = []
            let managersMails = []
            if (admins.length) {
                admins.forEach(admin => {
                    adminsMails.push(admin.email);
                })
            }
            if (managers.length) {
                managers.forEach(manager => {
                    managersMails.push(manager.email);
                })
            }
            let isAdminMailsUndefined = adminsMails || ["satyaprasadbehara@gmail.com"]
            let isManagersMailsUndefined = managersMails || ["satyaplanet1@gmail.com"]
            let sendto = [...isAdminMailsUndefined, ...isManagersMailsUndefined];
            // console.log(sendto);
            services.insertOne({
                    company: company,
                    createdAt: new Date(),
                    status: status,
                    createdBy: createdBy,
                    contact: contact,
                },
                (err, result) => {
                    if (err) console.log(err);
                    if (result) {
                        let mailOptions = {
                            from: '"Customer Relationship Management 🤝" <noreply@crm.com>',
                            to: sendto,
                            subject: "New Service alert",
                            html: `Hello,<br /> New Service had been created by` + createdBy,
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
            let services = await db.collection("services").find({
                createdBy: email
            }).toArray();
            let allservices = services || 'no services found..'
            return res.json({
                services: allservices
            });
        } catch (error) {
            console.log(error);
            return res.json({
                message: "something went wrong"
            });
        }
    }
});

// endpoint to update services
router.route("/updateService").put(async (req, res) => {
    const {
        Updatedby,
        status,
        contact,
        company,
        id
    } = req.body;
    let errors = []
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
    if (!Updatedby) {
        errors.push('id field is required !!')
    }
    if (errors.length === 0) {
        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }); //connect to db
            let db = client.db("CustomerRelationshipManagement");
            let o_id = new ObjectId(id);
            await db.collection("services").updateOne({
                _id: o_id,
            }, {
                $set: {
                    company: company,
                    status: status,
                    Updatedby: Updatedby,
                    contact: contact,
                    Updatedat: new Date()
                },
            }, (err, result) => {
                console.log(err)
                if (result) {
                    return res.json({
                        message: "service updated successfully.."
                    });
                } else {
                    return res.json({
                        message: "no services were found with " + email,
                    });
                }
            });
        } catch (error) {
            console.log(error);
            return res.json({
                error: 'something went wrong'
            })
        }
    } else {
        return res.json({
            error: errors
        })
    }
});

// endpoint to create contact
router.route("/createContact").post(async (req, res) => {
    const {
        createdBy,
        status,
        contact,
        name
    } = req.body;
    let errors = [];
    if (!status) {
        errors.push('status field is required !!')
    }
    if (!contact) {
        errors.push('id field is required !!')
    }
    if (!name) {
        errors.push('name field is required !!')
    }
    if (!createdBy) {
        errors.push('createdBy field is required !!')
    }
    if (errors.length === 0) {
        try {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }); //connect
            let db = client.db("CustomerRelationshipManagement");
            await db.collection("contacts").insertOne({
                createdBy: createdBy,
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
            let contacts = await db.collection("contacts").find({
                createdBy: email
            }).toArray();
            let allcontacts = contacts || 'no contacts found..'
            return res.json({
                contacts: allcontacts
            });
        } catch (error) {
            console.log(error);
            return res.json({
                error: 'something went wrong'
            })
        }
    }
});

//  endpoint to update contacts
router.route("/updateContact").put(async (req, res) => {
    const {
        Updatedby,
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
    if (!Updatedby) {
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
            let o_id = new ObjectId(id);
            db.collection("contacts").updateOne({
                _id: o_id
            }, {
                $set: {
                    Updatedby: Updatedby,
                    status: status,
                    contact: contact,
                    name: name,
                    updatedAt: new Date(),
                },
            }, (err, result) => {
                if (result) {
                    return res.json({
                        message: "Contact updated successfully...",
                    });
                } else {
                    return res.json({
                        error: 'no contacts found'
                    })
                }
            });
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