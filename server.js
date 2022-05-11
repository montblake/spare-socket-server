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
// ALL sockets (not sure of use of this )
wss.currentSockets = [];

// ALL Rooms
// an object with roomIDs as the keys, value is an array containing
// current sockets for that room
wss.currentRooms = {};


// method to send all clients a current users list
wss.updateUsers = function() {
    const userUpdateMessage = {
        type: 'update users',
        users: wss.currentSockets,
    }

    for (let client of wss.clients){
        console.log('sending updated users list');
        client.send(JSON.stringify(userUpdateMessage));
    }
};

wss.sendRemoveUserMessage = function(id) {
     console.log('sending remove user message');
    const removeUserMessage = {
        type: 'remove user',
        userID: id,
    }

    for (let client of wss.clients){
        client.send(JSON.stringify(removeUserMessage));
    }

}


// LISTENERS
wss.on('connection', (socket, request, client) => {
    console.log('a socket has been established');

    socket.on('message', (message)=>{
        message = JSON.parse(message);
        let allSockets;
        let roomSockets;

        // START HERE 
        // You receive a new user message, it should contain what room that user is joining
        // if the room is not in current rooms( ie is NEW), add it and add user to array
        // if room is current, add user to array
        // also? add user to current user (this functionality already exists)
        // then we must pass users list of current users ONLY FOR THE ROOM THEY ARE IN
        switch(message.type){
            // newUser = {userName: userName, userID: id, room: room}
            case 'new user':
                // set the socketID to match the peerID
                socket.id = message.userObj.userID;
                socket.room = message.userObj.room;
                console.log("new user message!");

                // add user to the appropriate room
                // if room is new, add to room list
                console.log(message.userObj.room);
                console.log(message.userObj.room in wss.currentRooms);
                if (message.userObj.room in wss.currentRooms){
                    console.log('hihi')
                    const prevOccupants = wss.currentRooms[message.userObj.room];  
                    wss.currentRooms = {...wss.currentRooms, [message.userObj.room]: [...prevOccupants, {userName: message.userObj.userName, userID: message.userObj.userID}]};
                    
                } else {
                    console.log('new room');
                                  
                    wss.currentRooms = {...wss.currentRooms, [message.userObj.room]: [{userName: message.userObj.userName, userID: message.userObj.userID}]};
                }
                console.log(wss.currentRooms);

                // add new user to current sockets list
                const newSocket = {
                    userName: message.userObj.userName,
                    userID: message.userObj.userID,
                }
                wss.currentSockets.push(newSocket);




                // NOW THAT SERVER LISTS HAVE BEEN UPDATED
                // COMMUNICATE TO THE USERS OF ***THAT ROOM***
                // make current users list
                const currentUsers = {
                    type: 'update users',
                    users: wss.currentRooms[message.userObj.room],
                }

                // send new user message to all but sender
                // send updated users to all


                // you need the actual sockets to send messages
                // to get the list of sockets, call on wss.clients
                allSockets = wss.clients;
                roomSockets = []
                allSockets.forEach(socket => {
                    if (socket.room === message.userObj.room){
                        roomSockets.push(socket);
                    }
                });

                for (let socket of roomSockets){
                    // if user is NOT the new user...
                    if (socket.id !== message.userObj.userID){
                        // send new user message
                        // (which initiates video sharing)
                        socket.send(JSON.stringify(message));
                    }
                    // and all users (including new user) get updated client list 
                    socket.send(JSON.stringify(currentUsers));
                }
                break;

            case 'chat message':
                // receives incoming chat message and
                // distributes to all clients except the sender
                // (sender has already attached message to their local chat)
                // (clients listen for incoming message and add to their local chat)
                console.log('chat message received');
                let chatRoom = message.signedMessage.from.room;
                console.log(message);

                allSockets = wss.clients;
                roomSockets = []
                allSockets.forEach(socket => {
                    if (socket.room === chatRoom){
                        roomSockets.push(socket);
                    }
                });

                for (let socket of roomSockets){
                    // if socket is NOT the sender of the message...
                    if (socket.id !== message.signedMessage.from.userID){
                        // send new user message
                        // (which initiates video sharing)
                        console.log('sending once');
                        socket.send(JSON.stringify(message));
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
                wss.sendRemoveUserMessage(wss.currentSockets[i].userID);
                wss.currentSockets.splice(i, 1);
                // send remove user message
                
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