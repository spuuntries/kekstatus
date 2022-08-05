import pm2 from "pm2";
import { LowSync, JSONFileSync } from "lowdb";
import express from "express";
import { Server as socketIOServer, Socket } from "socket.io";
import { createServer } from "http";

const db = new LowSync(new JSONFileSync("file.json")),
  app = express(),
  server = createServer(app),
  io = new socketIOServer(server);

/** @type {Socket[]} */
var socketList = [];

db.read();
db.data = db.data || {};
db.write();

app.use(express.static("public"));

// Update process list
setInterval(() => {
  pm2.list((err, list) => {
    if (err) {
      console.error(err);
      return;
    }

    list.forEach((process) => {
      let status = process.pm2_env.status;
      if (!db.data[process.name]) {
        db.data[process.name] = [];
      }

      switch (status) {
        case "errored":
          db.data[process.name].push({
            status: status,
            time: new Date().getTime(),
          });
          break;

        case "stopped":
          db.data[process.name].push({
            status: status,
            time: new Date().getTime(),
          });
          break;

        case "stopping":
          db.data[process.name].push({
            status: status,
            time: new Date().getTime(),
          });
          break;

        case "online":
          // Check if process was previously down,
          // if so, add a new entry to the array
          // else, don't do anything
          if (db.data[process.name]) {
            if (
              db.data[process.name][db.data[process.name].length - 1].status !==
              status
            ) {
              db.data[process.name].push({
                status: status,
                time: new Date().getTime(),
              });
            }
          }
          break;
      }

      db.write();
      db.read();

      if (socketList.length) {
        socketList.forEach((socket) => {
          socket.emit("update", db.data);
        });
      }
    });
  });
}, 1000);

io.on("connection", (socket) => {
  socketList.push(socket);
  socket.emit("update", db.data);
});

io.on("disconnect", (socket) => {
  socketList = socketList.filter((s) => s.id !== socket.id);
});

server.listen(3000, () => {
  console.log("Listening on port 3000");
});
