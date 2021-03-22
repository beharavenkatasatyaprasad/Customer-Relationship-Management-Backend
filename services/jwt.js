const jwt = require('jsonwebtoken');
const config = require("../config.json");

let EncodeToken = (email,userType) => {
   let token = jwt.sign({
            email: email,
            userType:userType
        },
        config.JWTSECRET, {
            expiresIn: "10h",
        }
    ); 
    return token;
}

exports.EncodeToken = EncodeToken;