const mongoose = require('mongoose');
require('dotenv').config();


const connect = async () => {
    console.log(process.env.MONGODB_URI)
    await mongoose.connect(process.env.MONGODB_URI);
}

module.exports = connect;