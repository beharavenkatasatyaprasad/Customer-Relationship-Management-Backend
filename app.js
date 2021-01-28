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
    const { fname,lname,userType,email,password } = req.body; //email & password from client
    let client = await mongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }); //connect to db
    let db = client.db("crm"); //db name
    let user = db.collection("users"); //collection name
    user.findOne({
        email: email
    }, (err, result) => { //find if the email is already exist in the collection
        if (err) {
            return res.json({
                message: 'something went wrong'
            });
        }
        if (result == null) {
            bcrypt.hash(password, saltRounds, function (err, hash) { //hash the client password
                if (err) {
                    return res.json({
                        message: 'something went wrong'
                    });
                }
                user.insertOne({
                    fname: fname,
                    lname: lname,
                    email: email,
                    password: hash,
                    userType: userType,
                    verified: false
                }, (err, result) => {

                    if (result) {
                        let emailToken = jwt.sign({
                            exp: Math.floor(Date.now() / 1000) + (60 * 60),
                            email: email
                        }, process.env.JWT_SECRET);

                        let Tokenurl = `https://crmserver.herokuapp.com/auth/${emailToken}`
                        let name = fname +" " + lname 
                        //email template for sending token
                        var mailOptions = {
                            from: '"Customer Relationship Management 🤝" <noreply@crm.com>',
                            to: `${email}`,
                            subject: 'Account Confirmation Link',
                            html: `Hello ${name} , Here's your Account verification link: <br> <a style="color:green" href="${Tokenurl}">Click Here To Confirm</a> <br> Link expires in an hour...`
                        };
                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log(error)
                            } else {
                                return res.json({
                                    message: 'Check your mail and Confirm Identity...',
                                    type_: 'success'
                                }); //* if mail sent send this msg
                            }
                        });
                    }
                });
            });
        } else {
            return res.json({
                message: 'email already exists!!',
                type_: 'warning'
            });
        }
    })
});


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
