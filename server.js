require('dotenv').config();

const PORT = process.env.PORT;

const express = require('express');
const app = express();

const cors = require('cors');

// Middleware for app?
app.use(cors());

// Routes for app?
app.get('/', (req,res)=>{
    res.send('<h1>greetings, earthling</h1>');
})



// Turn Express App into a Server
const server = app.listen(PORT, ()=>{
    console.log(`listening on port ${PORT}`);
});