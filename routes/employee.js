const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongodb = require("mongodb");
const nodemailer = require("nodemailer")
const jwt = require("jsonwebtoken")
const mongoClient = mongodb.MongoClient;
const config = require("../config.json")
const ObjectId = require('mongodb').ObjectId;
const {
    EncodeToken
} = require("../services/jwt");
require("dotenv").config();

const url = config.mongodburl;

router.use(cookieParser());
router.use(bodyParser.json());

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: config.user,
        pass: config.pass,
    },
});

// endpoint to create lead
router.route("/createLead").post(async (req, res) => {
    const {
        name,
        email,
        contact,
        walkingdate,
        source,
        status,
        agent,
        token,
        agentemail
    } = req.body;
    let errors = [];
    if (!token) {
        errors.push('unauthorized request');
    }
    if (!contact) {
        errors.push("company field is required !!");
    }
    if (!status) {
        errors.push("status field is required !!");
    }
    if (!contact) {
        errors.push("contact field is required !!");
    }
    if (!source) {
        errors.push("source field is required !!");
    }
    if (!agent) {
        errors.push("Agent field is required !!");
    }
    if (!email) {
        errors.push("email field is required !!");
    }
    if (!name) {
        errors.push("name field is required !!");
    }
    
    if (errors.length === 0) {
        try {
            let Token = jwt.verify(token, config.JWTSECRET);
            if (!Token.email) {
                res.status(404).json({
                    error: 'Login to continue..'
                })
            } else {
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
                        agent: agent,
                        name: name,
                        status: status,
                        contact: contact,
                        source:source,
                        walkingdate:walkingdate,
                        agentemail:agentemail
                    },
                    (err, result) => {
                        if (err) console.log(err);
                        if (result) {
                            let mailOptions = {
                                from: '"Customer Relationship Management 🤝" <noreply@crm.com>',
                                to: sendto,
                                subject: "New Lead alert",
                                html: `Hello, ,<br /> New lead has been created by ` + Token.email,
                            };
                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    res.status(202).json({
                                        message: "Lead successfully created..",
                                    }); //* if mail sent send this msg
                                }
                            });
                        }
                    }
                );
            }
        } catch (error) {
            console.log(error);
            res.status(501).json(({
                error: "something went wrong",
            }));
        }
    } else {
        res.status(404).json({
            error: errors[0]
        });
    }
});

//end point to fetch lead 
router.route("/getLeads/:token").get(async (req, res) => {
    let Token = req.params.token
    if (!Token) {
        return res.json({
            message: "Login to continue..",
        });
    } else {
        try {
            let token = jwt.verify(Token, config.JWTSECRET);
            let email = token.email;
            let role = token.userType;
            if (!email && role === 'employee') {
                res.status(404).json({
                    error: 'Login to continue..'
                })
            } else {
                let client = await mongoClient.connect(url, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                });
                let db = client.db("CustomerRelationshipManagement");
                let leads = await db.collection("leads").find({
                    agent: email
                }).toArray();
                let allleads = leads || [];
                
                res.status(202).json({
                    leads: allleads
                });
            }
        } catch (error) {
            console.log(error);
            res.status(505).json({
                error: "something went wrong",
            });
        }
    }
});

// endpoints to update leads
router.route("/updateLead").put(async (req, res) => {
    let jwtcookie = req.cookies.jwt
    const {
        status,
        contact,
        company,
        id
    } = req.body;
    let errors = []
    if (!id) {
        errors.push('id field is required !!')
    }
    if (!jwtcookie) {
        errors.push('unauthorized request');
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
            let token = jwt.verify(jwtcookie, process.env.jwtsecret);
            let email = token.email;
            if (!email) {
                return res, json({
                    error: 'login to continue..'
                })
            } else {
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
                        Updatedby: email
                    },
                }, (err, result) => {
                    if (result) {
                        return res.json({
                            message: "lead updated successfully.."
                        });
                    } else {
                        return res.json({
                            message: "no leads were found with " + email,
                        });
                    }
                });
            }
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
        status,
        contact,
        company
    } = req.body;
    let errors = []
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
            let token = jwt.verify(jwtcookie, process.env.jwtsecret);
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
                    createdBy: email,
                    contact: contact,
                },
                (err, result) => {
                    if (err) console.log(err);
                    if (result) {
                        let mailOptions = {
                            from: '"Customer Relationship Management 🤝" <noreply@crm.com>',
                            to: sendto,
                            subject: "New Service alert",
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
    let jwtcookie = req.cookies.jwt
    if (!jwtcookie) {
        return res.json({
            message: "Login to continue..",
        });
    } else {
        try {
            let token = jwt.verify(jwtcookie, process.env.jwtsecret);
            let email = token.email;
            if (!email) {
                return res.json({
                    error: 'Login to continue..'
                })
            } else {
                let client = await mongoClient.connect(url, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                });
                let db = client.db("CustomerRelationshipManagement");
                let services = await db.collection("services").find({
                    createdBy: email
                }).toArray();
                let allservices = services || 'no services found..'
                return res.json({
                    services: allservices
                });
            }
        } catch (error) {
            console.log(error);
            return res.json({
                error: "something went wrong",
            });
        }
    }
});

// endpoint to update services
router.route("/updateService").put(async (req, res) => {
    let jwtcookie = req.cookies.jwt
    const {
        status,
        contact,
        company,
        id
    } = req.body;
    let errors = []
    if (!id) {
        errors.push('id field is required !!')
    }
    if (!jwtcookie) {
        errors.push('unauthorized request');
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
            let token = jwt.verify(jwtcookie, process.env.jwtsecret);
            let email = token.email;
            if (!email) {
                return res, json({
                    error: 'login to continue..'
                })
            } else {
                let client = await mongoClient.connect(url, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                });
                let db = client.db("CustomerRelationshipManagement");
                let o_id = new ObjectId(id);
                await db.collection("services").updateOne({
                    email: o_id,
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
                            message: "service updated successfully.."
                        });
                    } else {
                        return res.json({
                            message: "no services were found",
                        });
                    }
                });
            }
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

// endpoint to create contact
router.route("/createContact").post(async (req, res) => {
    let jwtcookie = req.cookies.jwt
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
    if (!jwtcookie) {
        errors.push('unauthorized request');
    }
    if (!contact) {
        errors.push('id field is required !!')
    }
    if (!name) {
        errors.push('name field is required !!')
    }
    if (errors.length === 0) {
        try {
            let token = jwt.verify(jwtcookie, process.env.jwtsecret);
            let email = token.email;
            if (!email) {
                return res, json({
                    error: 'login to continue..'
                })
            } else {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }); //connect
            
            let db = client.db("CustomerRelationshipManagement");
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
        }} catch (error) {
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

// endpoint to get contacts by email
router.route("/getContact").get(async (req, res) => {
    let jwtcookie = req.cookies.jwt
    if (!jwtcookie) {
        return res.json({
            message: "Login to continue..",
        });
    } else {
        try {
            let token = jwt.verify(jwtcookie, process.env.jwtsecret);
            let email = token.email;
            if (!email) {
                return res.json({
                    error: 'Login to continue..'
                })
            } else {
                let client = await mongoClient.connect(url, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                });
                let db = client.db("CustomerRelationshipManagement");
                let contacts = await db.collection("contacts").find({
                    createdBy: email
                }).toArray();
                let allcontacts = contacts || 'no contacts found..'
                return res.json({
                    contacts: allcontacts
                });
            }
        } catch (error) {
            console.log(error);
            return res.json({
                error: "something went wrong",
            });
        }
    }
});

//  endpoint to update contacts
router.route("/updateContact").put(async (req, res) => {
    let jwtcookie = req.cookies.jwt
    const {
        status,
        contact,
        name,
        id
    } = req.body;
    let errors = [];
    if (!status) {
        errors.push('id field is required !!')
    }
    if (!jwtcookie) {
        errors.push('unauthorized required')
    }
    if (!contact) {
        errors.push('id field is required !!')
    }
    if (!name) {
        errors.push('id field is required !!')
    }
    if (!id) {
        errors.push('id field is required !!')
    }
    if (errors.length === 0) {
        try {
            let token = jwt.verify(jwtcookie, process.env.jwtsecret);
            let email = token.email;
            if (!email) {
                return res.json({
                    error: 'Login to continue..'
                })
            } else {
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
                    Updatedby: email,
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
        }} catch (error) {
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