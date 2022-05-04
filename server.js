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
wss.updateUsers = function () {
    const userUpdateMessage = {
        type: 'update users',
        users: wss.currentSockets,
    }

    for (let client of wss.clients){
        console.log('sending updated users list');
        client.send(JSON.stringify(userUpdateMessage));
    }
};




wss.on('connection', (socket, request, client) => {
    console.log('a connection has been made');

    socket.on('message', (message)=>{
        message = JSON.parse(message);
        switch(message.type){
            case 'new user':
                // set the socketID to match the peerID
                socket.id = message.userObj.userID;
                // add new user to current user list
                wss.currentSockets.push(message.userObj);

                console.log(wss.currentSockets);
                
                // send out updated user lists
                wss.updateUsers();
                break;
            default: 
                console.log('message type unrecognized');
        }
    })

    socket.on('close', (cause) => {
        console.log('socket disconnected', socket.id);
        // should remove socket from wss.currentSockets
        for (let i = 0; i < wss.currentSockets.length; i++){
            if (wss.currentSockets[i].userID === socket.id) {
                wss.currentSockets.splice(i, 1);
            }
        }
        // send out updated user lists
        wss.updateUsers();
       
    });
});

////////////////////////////////////////////////
// Server
////////////////////////////////////////////////
app.get('/', (req, res, next) => res.send('this is socket server'));

// Turn Express App into a Server
const server = app.listen(PORT, ()=>{
    console.log(`listening on port ${PORT}`);
});

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (websocket) => {
        wss.emit("connection", websocket, request);
    });
});