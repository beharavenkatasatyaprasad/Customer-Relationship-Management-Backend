const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongodb = require("mongodb");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const mongoClient = mongodb.MongoClient;
const config = require("../config.json");
const ObjectId = require("mongodb").ObjectId;
const { EncodeToken } = require("../services/jwt");
const e = require("express");
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
  } = req.body;
  let errors = [];
  if (!token) {
    errors.push("unauthorized request");
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
          error: "Login to continue..",
        });
      } else {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        let db = client.db("CustomerRelationshipManagement");
        let users = db.collection("users");
        let leads = db.collection("leads");
        let admins = await users
          .find({
            userType: "admin",
          })
          .toArray();
        let managers = await users
          .find({
            userType: "manager",
          })
          .toArray();
        let adminsMails = [];
        let managersMails = [];
        if (admins.length) {
          admins.forEach((admin) => {
            adminsMails.push(admin.email);
          });
        }
        if (managers.length) {
          managers.forEach((manager) => {
            managersMails.push(manager.email);
          });
        }
        let isAdminMailsUndefined = adminsMails || [
          "satyaprasadbehara@gmail.com",
        ];
        let isManagersMailsUndefined = managersMails || [
          "satyaplanet1@gmail.com",
        ];
        let sendto = [...isAdminMailsUndefined, ...isManagersMailsUndefined];
        let id = "L" + Math.floor(Math.random() * (999 - 100 + 1) + 100);
        leads.insertOne(
          {
            id: id,
            agent: agent,
            name: name,
            status: status,
            contact: contact,
            source: source,
            email: email,
            walkingdate: walkingdate,
            agentemail: Token.email,
          },
          (err, result) => {
            if (err) console.log(err);
            if (result) {
              let mailOptions = {
                from: '"Customer Relationship Management 🤝" <noreply@crm.com>',
                to: sendto,
                subject: "New Lead alert",
                html:
                  `Hello, ,<br /> New lead has been created by ` + Token.email,
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
      res.status(501).json({
        error: "something went wrong",
      });
    }
  } else {
    res.status(404).json({
      error: errors[0],
    });
  }
});

//end point to fetch lead
router.route("/getLeads/:token").get(async (req, res) => {
  let Token = req.params.token;
  if (!Token) {
    return res.json({
      message: "Login to continue..",
    });
  } else {
    try {
      let token = jwt.verify(Token, config.JWTSECRET);
      let email = token.email;
      let role = token.userType;
      if (!email && role === "employee") {
        res.status(404).json({
          error: "Login to continue..",
        });
      } else {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        let db = client.db("CustomerRelationshipManagement");
        let leads = await db
          .collection("leads")
          .find({
            agentemail: token.email,
          })
          .toArray();
        let allleads = leads || [];

        res.status(202).json({
          leads: allleads,
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

//end point to fetch a particular lead
router.route("/getLead/:id/:token").get(async (req, res) => {
  let { token, id } = req.params;
  console.log(token, id);
  let o_id = new ObjectId(id);
  if (!token) {
    return res.json({
      message: "Login to continue..",
    });
  } else {
    try {
      let Token = jwt.verify(token, config.JWTSECRET);
      let email = Token.email;
      if (!email) {
        res.status(404).json({
          error: "Unauthorized login..",
        });
      } else {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        let db = client.db("CustomerRelationshipManagement");
        await db.collection("leads").findOne(
          {
            _id: o_id,
          },
          async (err, result) => {
            if (err) throw err;
            else {
              res.status(202).json({
                lead: result,
              });
            }
          }
        );
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
  const {
    name,
    email,
    contact,
    source,
    id,
    status,
    token,
  } = req.body;
  let errors = [];
  if (!token) {
    errors.push("unauthorized request");
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
          error: "Login to continue..",
        });
      } else {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        let db = client.db("CustomerRelationshipManagement");
        let o_id = new ObjectId(id);
        await db.collection("leads").updateOne(
          {
            _id: o_id,
          },
          {
            $set: {
              name: name,
              status: status,
              contact: contact,
              source: source,
              email: email,
            },
          },
          (err, result) => {
            if (result) {
              res.status(202).json({
                lead: "lead updated successfully..",
              });
            } else {
              res.status(202).json({
                error: "no leads were found with " + id,
              });
            }
          }
        );
      }
    } catch (error) {
      console.log(error);
      res.status(404).json({
        error: "something went wrong",
      });
    }
  } else {
    res.status(404).json({
      errors: errors[0],
    });
  }
});

router.route("/deleteLead/:id").delete(async (req, res) => {
  let { id } = req.params;
  let errors = [];
  if (!id) {
    errors.push("id field is required !!");
  }
  if (errors.length === 0) {
    try {
      let client = await mongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      let db = client.db("CustomerRelationshipManagement");
      let o_id = new ObjectId(id);
      await db.collection("leads").deleteOne(
        {
          _id: o_id,
        },
        (err, result) => {
          if (result) {
            res.status(202).json({
              message: "lead successfully deleted..",
            });
          } else {
            res.status(404).json({
              error: "something went wrong",
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
      errors: errors,
    });
  }
});

// endpoint to create service
router.route("/createService").post(async (req, res) => {
  let jwtcookie = req.cookies.jwt;
  const { status, contact, company } = req.body;
  let errors = [];
  if (!jwtcookie) {
    errors.push("unauthorized request");
  }
  if (!status) {
    errors.push("status field is required !!");
  }
  if (!contact) {
    errors.push("contact field is required !!");
  }
  if (!company) {
    errors.push("company field is required !!");
  }
  if (errors.length === 0) {
    try {
      let token = jwt.verify(jwtcookie, process.env.jwtsecret);
      let email = token.email;
      let client = await mongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      let db = client.db("CustomerRelationshipManagement");
      let services = db.collection("services");
      let users = db.collection("users");
      let admins = await users
        .find({
          userType: "admin",
        })
        .toArray();
      let managers = await users
        .find({
          userType: "manager",
        })
        .toArray();
      let adminsMails = [];
      let managersMails = [];
      if (admins.length) {
        admins.forEach((admin) => {
          adminsMails.push(admin.email);
        });
      }
      if (managers.length) {
        managers.forEach((manager) => {
          managersMails.push(manager.email);
        });
      }
      let isAdminMailsUndefined = adminsMails || [
        "satyaprasadbehara@gmail.com",
      ];
      let isManagersMailsUndefined = managersMails || [
        "satyaplanet1@gmail.com",
      ];
      let sendto = [...isAdminMailsUndefined, ...isManagersMailsUndefined];
      // console.log(sendto);
      services.insertOne(
        {
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
        error: "something went wrong !!",
      });
    }
  } else {
    return res.json({
      errors: errors,
    });
  }
});

// endpoint to get services info
router.route("/getServices").get(async (req, res) => {
  let jwtcookie = req.cookies.jwt;
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
          error: "Login to continue..",
        });
      } else {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        let db = client.db("CustomerRelationshipManagement");
        let services = await db
          .collection("services")
          .find({
            createdBy: email,
          })
          .toArray();
        let allservices = services || "no services found..";
        return res.json({
          services: allservices,
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
  let jwtcookie = req.cookies.jwt;
  const { status, contact, company, id } = req.body;
  let errors = [];
  if (!id) {
    errors.push("id field is required !!");
  }
  if (!jwtcookie) {
    errors.push("unauthorized request");
  }
  if (!status) {
    errors.push("status field is required !!");
  }
  if (!contact) {
    errors.push("company field is required !!");
  }
  if (!company) {
    errors.push("contact field is required !!");
  }
  if (errors.length === 0) {
    try {
      let token = jwt.verify(jwtcookie, process.env.jwtsecret);
      let email = token.email;
      if (!email) {
        return (
          res,
          json({
            error: "login to continue..",
          })
        );
      } else {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        let db = client.db("CustomerRelationshipManagement");
        let o_id = new ObjectId(id);
        await db.collection("services").updateOne(
          {
            email: o_id,
          },
          {
            $set: {
              company: company,
              status: status,
              contact: contact,
              updatedAt: new Date(),
              Updatedby: email,
            },
          },
          (err, result) => {
            if (result) {
              return res.json({
                message: "service updated successfully..",
              });
            } else {
              return res.json({
                message: "no services were found",
              });
            }
          }
        );
      }
    } catch (error) {
      console.log(error);
      return res.json({
        error: "something went wrong",
      });
    }
  } else {
    return res.json({
      errors: errors,
    });
  }
});

// endpoint to create contact
router.route("/createContact").post(async (req, res) => {
  const {
    name,
    email,
    phone,
    agent,
    branch,
    offer,
    token
  } = req.body;
  let errors = [];
  if (!token) {
    errors.push("unauthorized request");
  }
  if (!branch) {
    errors.push("branch field is required !!");
  }
  if (!phone) {
    errors.push("phone field is required !!");
  }
  if (!offer) {
    errors.push("offer field is required !!");
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
          error: "Login to continue..",
        });
      } else {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        let db = client.db("CustomerRelationshipManagement");
        let users = db.collection("users");
        let contacts = db.collection("contacts");
        let admins = await users
          .find({
            userType: "admin",
          })
          .toArray();
        let managers = await users
          .find({
            userType: "manager",
          })
          .toArray();
        let adminsMails = [];
        let managersMails = [];
        if (admins.length) {
          admins.forEach((admin) => {
            adminsMails.push(admin.email);
          });
        }
        if (managers.length) {
          managers.forEach((manager) => {
            managersMails.push(manager.email);
          });
        }
        let isAdminMailsUndefined = adminsMails || [
          "satyaprasadbehara@gmail.com",
        ];
        let isManagersMailsUndefined = managersMails || [
          "satyaplanet1@gmail.com",
        ];
        let sendto = [...isAdminMailsUndefined, ...isManagersMailsUndefined];
        let id = "C" + Math.floor(Math.random() * (999 - 100 + 1) + 100);
        contacts.insertOne(
          {
            id: id,
            name: name,
            branch: branch,
            phone: phone,
            agent: agent,
            email: email,
            agentemail: Token.email,
            offer:offer
          },
          (err, result) => {
            if (err) console.log(err);
            if (result) {
              let mailOptions = {
                from: '"Customer Relationship Management 🤝" <noreply@crm.com>',
                to: sendto,
                subject: "New Contact alert",
                html:
                  `Hello, ,<br /> New Contact has been created by ` + Token.email,
              };
              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  console.log(error);
                } else {
                  res.status(202).json({
                    message: "Contact successfully created..",
                  }); 
                }
              });
            }
          }
        );
      }
    } catch (error) {
      console.log(error);
      res.status(501).json({
        error: "something went wrong"
      });
    }
  } else {
    res.status(404).json({
      error: errors[0],
    });
  }
});

// endpoint to get contacts by email
router.route("/getContacts/:token").get(async (req, res) => {
  let Token = req.params.token;
  if (!Token) {
    return res.json({
      message: "Login to continue..",
    });
  } else {
    try {
      let token = jwt.verify(Token, config.JWTSECRET);
      let email = token.email;
      let role = token.userType;
      if (!email && role === "employee") {
        res.status(404).json({
          error: "Login to continue..",
        });
      } else {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        let db = client.db("CustomerRelationshipManagement");
        let contacts = await db
          .collection("contacts")
          .find({
            agentemail: token.email,
          })
          .toArray();
        let allcontacts = contacts || [];
        res.status(202).json({
          contacts: allcontacts
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

router.route("/getContact/:id/:token").get(async (req, res) => {
  let { token, id } = req.params;
  let o_id = new ObjectId(id);
  if (!token) {
    return res.json({
      message: "Login to continue..",
    });
  } else {
    try {
      let Token = jwt.verify(token, config.JWTSECRET);
      let email = Token.email;
      if (!email) {
        res.status(404).json({
          error: "Unauthorized login..",
        });
      } else {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        let db = client.db("CustomerRelationshipManagement");
        await db.collection("contacts").findOne(
          {
            _id: o_id,
          },
          async (err, result) => {
            if (err) throw err;
            else {
              res.status(202).json({
                contact: result,
              });
            }
          }
        );
      }
    } catch (error) {
      console.log(error);
      res.status(505).json({
        error: "something went wrong",
      });
    }
  }
});

//  endpoint to update contacts
router.route("/updateContact").put(async (req, res) => {
  const {
    name,
    email,
    phone,
    branch,
    id,
    offer,
    token
  } = req.body;
  let errors = [];
  if (!token) {
    errors.push("unauthorized request");
  }
  if (!branch) {
    errors.push("branch field is required !!");
  }
  if (!phone) {
    errors.push("phone field is required !!");
  }
  if (!offer) {
    errors.push("offer field is required !!");
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
          error: "Login to continue..",
        });
      } else {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        let db = client.db("CustomerRelationshipManagement");
        let o_id = new ObjectId(id);
        await db.collection("contacts").updateOne(
          {
            _id: o_id,
          },
          {
            $set: {
              name: name,
              branch: branch,
              phone: phone,
              email: email,
              offer:offer
            },
          },
          (err, result) => {
            if (result) {
              res.status(202).json({
                contact: "Contact updated successfully..",
              });
            } else {
              res.status(404).json({
                error: "no Contact were found with " + id,
              });
            }
          }
        );
      }
    } catch (error) {
      console.log(error);
      res.status(404).json({
        error: "something went wrong",
      });
    }
  } else {
    res.status(404).json({
      errors: errors[0],
    });
  }
});

router.route("/deleteContact/:id").delete(async (req, res) => {
  let { id } = req.params;
  let errors = [];
  if (!id) {
    errors.push("id field is required !!");
  }
  if (errors.length === 0) {
    try {
      let client = await mongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      let db = client.db("CustomerRelationshipManagement");
      let o_id = new ObjectId(id);
      await db.collection("contacts").deleteOne(
        {
          _id: o_id,
        },
        (err, result) => {
          if (result) {
            res.status(202).json({
              message: "contact successfully deleted..",
            });
          } else {
            res.status(404).json({
              error: "something went wrong",
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
      errors: errors,
    });
  }
});

module.exports = router;
