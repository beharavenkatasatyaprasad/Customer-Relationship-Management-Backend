const express = require("express");
const app = express(); //initialize express
const bcrypt = require('bcryptjs'); //library to hash passwords
const saltRounds = 10; //cost factor (controls how much time is needed to calculate a single BCrypt hash)
const bodyParser = require("body-parser"); //body parsing middleware
const cookieParser = require("cookie-parser"); //to parse cookies
const nodemailer = require("nodemailer"); //Send e-mails
const cors = require("cors"); //middleware that can be used to enable CORS with various options
const mongodb = require("mongodb"); //MongoDB driver
const mongoClient = mongodb.MongoClient;

require("dotenv").config();
app.use(cookieParser());
app.use(bodyParser.json());

const url = process.env.MONGODB_URL;

mongoClient.connect(
  url,
  {
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
    service: 'gmail',
    auth: {
        user: process.env.GMAILUSER,
        pass: process.env.GMAILPASS
    }
});

//index Endpoint for server
app.get("/", (req, res) => {
  res.send("Hello From Server");
});

app.post("/register", async (req, res) => {
  let { email, password } = req.body; //email & password from client
  let client = await mongoClient.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }); //connect to db

  let db = client.db("crm"); //db name
  let user = db.collection("users"); //collection name
  user.findOne(
    {
      email: email,
    },
    (err, result) => {
      if (err) console.log(err);
      if (result == null) {
        bcrypt.hash(password, saltRounds,  (err, hash) => {
          //hash the client password
          user.insertOne({
            email: email,
            password: hash,
          }); //* insert  credentials in db
          return res.json({
            message: "Registration successful..."
          });
        });
      } else {
        return res.json({
          message: "User already exists with " + email
        });
      }
    }
  );
});

//Endpoint for resetting password
app.post("/resetpassword", async (req, res) => {
    const {
        email
    } = req.body //email from client
    let client = await mongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }); //connect to db
    let db = client.db("crm"); //db name
    let user = db.collection("users"); //collection name
    user.findOne({ //find if the email exist in the collection
        email: email
    }, (err, users) => {
        if (users == null) {
            return res.json({
                type_: "warning",
                message: 'No User found with ' + email + ' !!!'
            }); //! if not found send this message
        } else { //if found 
            let emailToken = jwt.sign({
                exp: Math.floor(Date.now() / 1000) + (60 * 60),
                email: email
            }, process.env.SECRET);
            user.findOneAndUpdate({
                email: email
            }, {
                $set: {
                    password: emailToken
                }
            }); //update the password with a token
            let url = `https://crm-server.herokuapp.com/auth/${emailToken}`
            let name = `${email.split('@')[0]}`
            //email template for sending token
            var mailOptions = {
                from: '"Hello buddy 👻" <noreply@satyaprasadbehara.com>',
                to: `${email}`,
                subject: 'Password Reset Link',
                html: `Hello ${name} ,<br> Here's your password reset link:  <a style="color:green" href="${url}">Click Here To Reset</a> <br> Link expires in 10 Minutes...`
            };

            //Send the mail
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error)
                } else {
                    return res.json({
                        type_: "success",
                        message: 'Reset Link sent to ' + email + ' !!!'
                    }); //* if mail sent send this `status`
                }
            });
        }
        if (err) {
            return res.json({
                message: err
            }); //! if found any error send this status
        }
    })
});

app.get('/auth/:token', async (req, res) => {
    const token = req.params.token
    jwt.verify(token, process.env.SECRET, async function (err, decoded) {
        if (decoded) {
            let client = await mongoClient.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            let db = client.db("rightclick"); //db name
            let user = db.collection("users"); //collection name
            user.findOneAndUpdate({
                email: decoded.email
            }, {
                $set: {
                    confirmed: true //and set the new hashed password in the db
                }
            }, (err, result) => {
                if (result) {
                    res.json('Verification successful go to /resetpassword endpoint to update your password');
                }
            });
        }
        if (err) {
            return res.json({
                message: err
            }); //if the token expired send this status
        }
    });
})

//Endpoint to verify the token and senting new password
app.post('/passwordreset', async (req, res) => {
    const {
        password,
        email
    } = req.body; //email & newpassword from client
    let client = await mongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }); //connect to db
    let db = client.db("crm"); //db name
    let user = db.collection("users"); //collection name
    user.findOne({
        email: email
    }, (err, User) => {
        if (User == null) {
            return res.json({
                message: 'No User found with ' + email + ' !!!'
            }); //! if not found send this status
        } else {
            let token = User.confirmed //find if the token exists in the collection
            if (token == true) {
                try {
                    bcrypt.hash(password, saltRounds, function (err, hash) { //hash the new password
                        user.findOneAndUpdate({
                            email: email
                        }, {
                            $set: {
                                password: hash //and set the new hashed password in the db
                            }
                        });
                    });
                    user.findOneAndUpdate({
                        email: email
                    }, {
                        $set: {
                            confirmed: false
                        }
                    });
                    return res.json({
                        message: 'Password reset Successful'
                    }); //*if done send this status
                } catch (e) {
                    return res.json({
                        message: err
                    }); //! if any error send this status
                }
            }
        }
    })
})


app.listen(3000, () => {
  console.log("CRM app listening");
});
