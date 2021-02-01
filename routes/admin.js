const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const {
    EncodeToken
} = require("../services/jwt");
require("dotenv").config();

router.use(cookieParser());
router.use(bodyParser.json());

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
                    } else if (User.userType !== "admin") {
                        return res.json({
                            error: User.userType + "  will not have permission to access admin portal"
                        });
                    }
                    if (errors.length === 0) {
                        if (User === null) {
                            return res.json({
                                message: "No registered user found with " + email,
                            });
                        } else {
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
                        }
                    } else {
                        return res.json({
                            error: errors,
                        });
                    }
                }
            );
            client.close()
        } catch (err) {
            console.log(err)
            return res.json({
                error: 'something went wrong'
            });
        }
    }
});

module.exports = router;
