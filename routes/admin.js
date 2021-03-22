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




module.exports = router;
