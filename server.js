require('dotenv').config();
const PORT = process.env.PORT;

const express = require('express');
const app = express();

// Middleware
const cors = require('cors');
app.use(cors());

///////////////////////////////////////////////////
// Socket Client
///////////////////////////////////////////////////
const { WebSocketServer } = require("ws");
const wss = new WebSocketServer({
    noServer: true,
    path: "/websockets",
});


// List of currentSockets;
wss.currentSockets = [];

// method to create IDs (created on our websocket server object)
wss.getUniqueID = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};




wss.on('connection', (socket, request, client) => {
    //  START HERE, a connection is made
    console.log('a connection has been made');
    socket.id = wss.getUniqueID();
    let message = {
        type: 'welcome', userID: socket.id
    }

    socket.send(JSON.stringify(message), ()=>{
        console.log('welcome message sent');
    });

    socket.on('close', (cause) => {
        console.log('socket disconnected', socket.id);
        console.log(cause);
        console.log(wss.currentSockets);
        // should remove socket from wss.currentSockets
        for (let i = 0; i < wss.currentSockets.length; i++){
            if (wss.currentSockets[i].userID === socket.id) {
                wss.currentSockets.splice(i, 1);
            }
        }

        for (let client of wss.clients){
            console.log('sending you a users list');
            const currentUsers = {
                type: 'updated users',
                users: wss.currentSockets,
            }
            client.send(JSON.stringify(currentUsers));
        }
    });
});

////////////////////////////////////////////////
// Server
////////////////////////////////////////////////
app.get('/', (req, res, next) => res.send('greetings, earthling'));

// Turn Express App into a Server
const server = app.listen(PORT, ()=>{
    console.log(`listening on port ${PORT}`);
});

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (websocket) => {
        wss.emit("connection", websocket, request);
    });
});