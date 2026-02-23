require("dotenv").config() 
// this should be the first line of server.js to connect with .env file. if we dont write it at the beginning , we wont be able to connect with .env file.


const app = require("./src/app")
const connectToDB = require('./src/config/database')

connectToDB()

app.listen(3000, ()=>{
    console.log("Server is running on port 3000");
    
})