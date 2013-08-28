var http = require('http'),
    socketio = require('socket.io'),
    fs = require('fs'),
    url = require("url"),
    path = require("path"),
    port = process.argv[2] || 4444;

var app = http.createServer(function(request, response) {

  // --- Static files handling ---

  var uri = url.parse(request.url).pathname,
    filename = path.join(process.cwd(), uri);

  fs.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }

    if (fs.statSync(filename).isDirectory()) filename += '/index.html';

    fs.readFile(filename, "binary", function(err, file) {
      if(err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      response.writeHead(200);
      response.write(file, "binary");
      response.end();
    });
  });
  // ---

}).listen(parseInt(port, 10));

var io = socketio.listen(app);

var colorsList = ['Blue', 'Red', 'BlueViolet', 'Green', 'DarkMagenta', 'Magenta'];
var users = {};
var drawHistory = {};

function AddToDrawHistory(data) {
  if (!drawHistory[data.color]) {
    drawHistory[data.color] = [];
    // drawHistory[data.color].push(data.from);
  }
  // drawHistory[data.color].push(data.to);
  drawHistory[data.color].push(data);
}

io.sockets.on('connection', function(socket) {
  var color = colorsList.shift();

  socket.emit('drawFromHistory', drawHistory);

  socket.set('color', color, function() {
    users[socket.id] = color;

    socket.emit('color', color);
    socket.emit('users', users);
    socket.broadcast.emit('userConnect', {id: socket.id, color: color});
  });

  socket.on('draw', function(data) {
    socket.get('color', function(err, color) {
      if (color) {
        data.color = color;
        socket.broadcast.emit('draw', data);
        AddToDrawHistory(data);
      }
    });
  });

  socket.on('disconnect', function() {
    socket.get('color', function(err, color) {
      if (color) {
        delete users[socket.id];
        colorsList.unshift(color);
      }
    });
    socket.broadcast.emit('userDisconnect', socket.id);
  });

  socket.on('clear', function() {
    socket.broadcast.emit('clean');
  });
});
