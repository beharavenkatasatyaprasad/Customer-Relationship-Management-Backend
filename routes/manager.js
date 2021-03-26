const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongodb = require("mongodb");
const nodemailer = require("nodemailer");
const config = require("../config.json");
const mongoClient = mongodb.MongoClient;
const { EncodeToken } = require("../services/jwt");
const jwt = require("jsonwebtoken")
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

router.route("/register").post(async (req, res) => {
  const { fname, lname, userType, email, password } = req.body; //email & password from client
  let errors = [];
  if (!fname) {
    errors.push("fname field is required !!");
  }
  if (!lname) {
    errors.push("lname field is required !!");
  }
  if (!password) {
    errors.push("password field is required !!");
  }
  if (
    userType !== "admin" &&
    userType !== "employee" &&
    userType !== "manager"
  ) {
    !userType
      ? errors.push("userType field is required !!")
      : errors.push(userType + " is not a valid user type !!");
  }
  if (errors.length === 0) {
    let client = await mongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }); //connect to db
    let db = client.db("CustomerRelationshipManagement"); //db name
    let user = db.collection("users"); //collection name
    user.findOne(
      {
        email: email,
      },
      async (err, result) => {
        //find if the email is already exist in the collection
        if (err) {
          return res.json({
            error: "something went wrong",
          });
        }
        if (result == null) {
          let saltRounds = await bcrypt.genSalt(10);
          let hashedPwd = await bcrypt.hash(password, saltRounds);
          user.insertOne(
            {
              fname: fname,
              lname: lname,
              email: email,
              password: hashedPwd,
              userType: userType,
              verified: false,
              confirmed: false,
            },
            (err, result) => {
              if (err) console.log(err);
              if (result) {
                let emailToken = EncodeToken(email);
                let Tokenurl = `https://crm-backend-satya.herokuapp.com/auth/${emailToken}`;
                let name = fname + " " + lname;
                transporter.sendMail(
                  {
                    from:
                      '"Customer Relationship Management 🤝" <noreply@crm.com>',
                    to: `${email}`,
                    subject: "Account Confirmation Link",
                    html: `Hello ${name} , Here's your Account verification link: <br> <a style="color:green" href="${Tokenurl}">Click Here To Confirm</a> <br> Link expires in an hour...`,
                  },
                  (error, info) => {
                    console.log(info);
                    if (error) {
                      console.log(error);
                    } else {
                      return res.json({
                        message:
                          "Registration successful...A mail sent to " +
                          email +
                          " for user confirmation...",
                      }); //* if mail sent send this msg
                    }
                  }
                );
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
      error: errors,
    });
  }
});

// endpoint to get all leads
router.route("/leads/:token").get(async (req, res) => {
  let { token } = req.params;
  let verified = jwt.verify(token, config.JWTSECRET);
  let email = verified.email;
  let role = verified.userType;
  if(email && (role === 'admin' || role === 'manager')){
    try {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }); //connect to db
        let db = client.db("CustomerRelationshipManagement");
        let leads = await db.collection("leads").find({}).toArray();
        let allleads = leads || [];
        res.status(202).json({ leads: allleads });
      } catch (error) {
        console.log(error);
        res.status(501).json({
          error: "something went wrong",
        });
      }
  }else{
    res.status(404).json({
        error: "something went wrong",
      });
  }
  
});

// get all services //
router.route("/services").get(async (req, res) => {
  try {
    let client = await mongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }); //connect to db
    let db = client.db("CustomerRelationshipManagement");
    let services = await db.collection("services").find({}).toArray();
    return res.json({ services: services });
  } catch (error) {
    console.log(error);
    return res.json({
      message: "something went wrong",
    });
  }
});

// get all contacts / /
router.route("/contacts/:token").get(async (req, res) => {
  let { token } = req.params;
  let verified = jwt.verify(token, config.JWTSECRET);
  let email = verified.email;
  let role = verified.userType;
  if(email && (role === 'admin' || role === 'manager')){
    try {
        let client = await mongoClient.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }); //connect to db
        let db = client.db("CustomerRelationshipManagement");
        let contacts = await db.collection("contacts").find({}).toArray();
        let allcontacts= contacts || [];
        res.status(202).json({ contacts: allcontacts });
      } catch (error) {
        console.log(error);
        res.status(501).json({
          error: "something went wrong",
        });
      }
  }else{
    res.status(404).json({
        error: "something went wrong",
      });
  }
});

module.exports = router;
