const jwt = require('jsonwebtoken');

let EncodeToken = (email) => {
   let token = jwt.sign({
            email: email,
        },
        "abigsecret", {
            expiresIn: "1h",
        }
    ); 
    return token;
}

exports.EncodeToken = EncodeToken;