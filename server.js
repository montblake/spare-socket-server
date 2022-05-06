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

// method to send all clients a current users list
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


// LISTENERS
wss.on('connection', (socket, request, client) => {
    console.log('a socket has been established has been made');

    socket.on('message', (message)=>{
        message = JSON.parse(message);

        switch(message.type){
            case 'new user':
                // set the socketID to match the peerID
                socket.id = message.userObj.userID;

                console.log("new user message!");
                // add new user to current sockets list
                const newSocket = {
                    userName: message.userObj.userName,
                    userID: message.userObj.userID,
                }
                wss.currentSockets.push(newSocket);

                // make current users list
                const currentUsers = {
                    type: 'update users',
                    users: wss.currentSockets,
                }

                // send new user message to all but sender
                // send updated users to all

                // so for each client:
                for (let client of wss.clients){
                    // if you are not the new user...
                    if (client.id !== message.userObj.userID){
                        // you get the new user message
                        // which will initiate video sharing
                        client.send(JSON.stringify(message));
                    }
                    // and all clients (including new user)
                    // get updated client list 
                    client.send(JSON.stringify(currentUsers));
                }
                break;

            case 'chat message':
                // receives incoming chat message and
                // distributes to all clients except the sender
                // (sender has already attached message to their local chat)
                // (clients listen for incoming message and add to their local chat)
                console.log('chat message received');
                console.log(message);
                for (let client of wss.clients){
                    let clientID = client.id;
                    let senderID = message.signedMessage.from.userID;
                    if (clientID !== senderID){
                        console.log("distributing message");
                        client.send(JSON.stringify(message));
                    }
                }
                break;

            case 'direct message':
                console.log('incoming dm');
                for (let client of wss.clients){
                    let clientID = client.id;
                    let targetID = message.target.userID;
                    if (clientID === targetID){
                        console.log('sending to ', message.target.userName);
                        client.send(JSON.stringify(message));
                    }
                }
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