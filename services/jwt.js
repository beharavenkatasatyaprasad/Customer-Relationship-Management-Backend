const jwt = require('jsonwebtoken');

let EncodeToken = (email) => {
   let token = jwt.sign({
            email: email,
        },
        process.env.JWTSECRET, {
            expiresIn: "1h",
        }
    ); 
    return token;
}

exports.EncodeToken = EncodeToken;