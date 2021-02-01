const express = require("express");
const app = express(); //initialize express
const bodyParser = require("body-parser"); //body parsing middleware
const mongodb = require("mongodb"); //MongoDB driver
const accessToEmployee = require('./routes/employee');
const accessToAdmin = require('./routes/admin');
const accessToManager = require('./routes/manager');
const mongoClient = mongodb.MongoClient;
require('dotenv').config()
app.use(bodyParser.json());

const url = "mongodb+srv://satyaprasadbehara:Fdwe6cYnwFMERYMC@cluster0.efor9.mongodb.net/CustomerRelationshipManagement?retryWrites=true&w=majority";

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

app.use('/admin', accessToAdmin, accessToManager, accessToEmployee);
app.use('/manager', accessToManager, accessToEmployee);
app.use('/employee', accessToEmployee);

let port = process.env.PORT || 3000;

app.listen(port, console.log("Server is live 🙌"));
