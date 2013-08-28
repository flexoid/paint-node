function windowToCanvas(canvas, x, y) {
  var bbox = canvas.getBoundingClientRect();

  return {
    x: x - bbox.left * (canvas.width  / bbox.width),
    y: y - bbox.top  * (canvas.height / bbox.height)
  };
}

$(function() {
  var context = $("#canvas")[0].getContext('2d');
  var buttonPressed = false;
  var color;

  var socket = io.connect('http://localhost:4444');

  socket.on('draw', function (data) {
    draw(data.from.x, data.from.y, data.to.x, data.to.y, data.color);
  });

  socket.on('color', function (data) {
    color = data;
    console.log(data);
  });

  socket.on('users', function (users) {
    for (var id in users) {
      addUserListItem(id, users[id], id == socket.socket.sessionid);
    }
  });

  socket.on('userConnect', function (data) {
    addUserListItem(data.id, data.color, false);
  });

  socket.on('userDisconnect', function (id) {
    $('#userList #' + id).remove();
  });

  socket.on('drawFromHistory', function (history) {
    for (var color in history) {
      if (Array.isArray(history[color]) && history[color].length > 1) {
        drawColorFromHistory(color, history[color]);
      }
    }
  });

  function addUserListItem(id, color, me) {
    newItem = $('<li>•</li>');
    newItem.attr('id', id);
    if (me)
      newItem.attr('class', 'me');
    newItem.css('color', color);
    $('#userList').append(newItem);
  }

  var prevX, prevY;

  function prepareDrowing(x, y) {
    buttonPressed = true;
    prevX = x;
    prevY = y;
  }

  function stopDrawing() {
     buttonPressed = false;
     prevX = prevY = undefined;
  }

  function draw(prevX, prevY, x, y, color) {
    context.beginPath();
    context.moveTo(prevX, prevY);
    context.lineTo(x, y);
    context.strokeStyle = color;
    context.stroke();
  }

  function drawColorFromHistory(color, colorHistory) {
    context.beginPath();

    // for (var i = 1; i < colorHistory.length; i++) {
    //   var from = colorHistory[i - 1];
    //   var to = colorHistory[i];

    //   context.moveTo(from.x, from.y);
    //   context.lineTo(to.x, to.y);
    // }

    colorHistory.forEach(function(points) {
      context.moveTo(points.from.x, points.from.y);
      context.lineTo(points.to.x, points.to.y);
    });

    context.strokeStyle = color;
    context.stroke();
  }

  $("#canvas").on("mousedown", function(e) {
    coords = windowToCanvas(this, e.clientX, e.clientY);
    if (e.which == 1) prepareDrowing(coords.x, coords.y);
  });

  $("#canvas").on("mouseup", function(e) {
    if (e.which == 1) stopDrawing();
  });

  $("#canvas").on("mouseout", function(e) {
    buttonPressed = false;
  });

  $("#canvas").on("mousemove", function(e) {
    if (buttonPressed) {
      coords = windowToCanvas(this, e.clientX, e.clientY);

      if (prevX && prevY && color) {
        draw(prevX, prevY, coords.x, coords.y, color);

        socket.emit('draw', {from: {x: prevX, y: prevY}, to: {x: coords.x, y: coords.y}});
      }

      prevX = coords.x;
      prevY = coords.y;
    }
  });
});
