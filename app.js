const express = require("express");
const app = express(); //initialize express
const bodyParser = require("body-parser"); //body parsing middleware
const mongodb = require("mongodb"); //MongoDB driver
const cors = require('cors');
const morgan = require('morgan');
const config = require("./config.json")
const accessToEmployee = require('./routes/employee');
const accessToAdmin = require('./routes/admin');
const accessToManager = require('./routes/manager');
const verification = require('./routes/verification');
const mongoClient = mongodb.MongoClient;
require('dotenv').config();

app.use(bodyParser.json());

app.options('*', cors())
app.use(cors())
app.use(morgan('tiny'));

const url = config.mongodburl;

mongoClient.connect(
    url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
    (err, db) => {
        if(err) throw err;
        console.log("Database Connected!");
        db.close();
    }
);

app.use('/', verification);
app.use('/admin', accessToAdmin, accessToManager, accessToEmployee);
app.use('/manager', accessToManager, accessToEmployee);
app.use('/employee', accessToEmployee);

let port = process.env.PORT || 4000;

app.listen(port, console.log("Server is live 🙌"));
