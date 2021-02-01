const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const { EncodeToken } = require("../services/jwt");
require("dotenv").config();

router.use(cookieParser());
router.use(bodyParser.json());

const url =
  "mongodb+srv://satyaprasadbehara:Fdwe6cYnwFMERYMC@cluster0.efor9.mongodb.net/CustomerRelationshipManagement?retryWrites=true&w=majority";

router.route("/login").post(async (req, res) => {
  const { email, password } = req.body;
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
    await user.findOne(
      {
        email: email,
      },
      async(err, User) => {
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
        } else if (User.userType !== "admin") {
          return res.json({
            error:
              User.userType +
              "  will not have permission to access admin portal",
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
                    message:
                      "Hello " + name + " , you are successfully logged in...", //if credentials matched,
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

module.exports = router;
