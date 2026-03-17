// const mongoose = require("mongoose");


//  const connectDB= async()=>{
//     await mongoose.connect("mongodb://127.0.0.1:27017/lendtotalk")
// }
// module.exports=connectDB




// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // --- 🟢 FIX APPLIED HERE ---
        // Removed the options object { useNewUrlParser: true, useUnifiedTopology: true }
        // as they are the default behavior in modern Mongoose.
        const conn = await mongoose.connect(process.env.MONGO_URI);
        // --- 🟢 FIX ENDS HERE ---

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        // Log the full error to help debug connection string issues, if any
        console.error(error); 
        process.exit(1);
    }
};

module.exports = connectDB;