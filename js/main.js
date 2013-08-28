function windowToCanvas(canvas, x, y) {
  var bbox = canvas.getBoundingClientRect();

  return {
    x: x - bbox.left * (canvas.width  / bbox.width),
    y: y - bbox.top  * (canvas.height / bbox.height)
  };
}

$(function() {
  var canvas = $("#canvas")[0];
  var context = canvas.getContext('2d');
  var buttonPressed = false;
  var color;

  var socket = io.connect('/');

  socket.on('draw', function (data) {
    draw(data.from.x, data.from.y, data.to.x, data.to.y, data.color);
  });

  color = 'Blue';

  socket.on('userConnect', function(user) {
    addUserListItem(user, false);
  });

  socket.on('userDisconnect', function (id) {
    $('.userList #id-' + id).remove();
  });

  socket.on('init', function(data) {
    drawColorFromHistory(data.history);
    fillUsersList(data.users);
  });

  socket.on('clear', function() {
    clearCanvas();
  });

  function fillUsersList(users) {
    for (var id in users) {
      addUserListItem(users[id], id == socket.socket.sessionid);
    }
  }

  function addUserListItem(user, me) {
    newItem = $('<li>' + user.id + '</li>');
    newItem.attr('id', "id-" + user.id);
    if (me)
      newItem.attr('class', 'me');
    // newItem.css('color', color);
    $('.userList').append(newItem);
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
    context.closePath();
  }

  function drawColorFromHistory(history) {
    clearCanvas();

    for (var color in history) {
      if (Array.isArray(history[color]) && history[color].length > 1) {
        context.beginPath();

        history[color].forEach(function(points) {
          context.moveTo(points.from.x, points.from.y);
          context.lineTo(points.to.x, points.to.y);
        });

        context.strokeStyle = color;
        context.stroke();
        context.closePath();
      }
    }
  }

  function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
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

        socket.emit('draw', {from: {x: prevX, y: prevY}, to: {x: coords.x, y: coords.y}, color: color});
      }

      prevX = coords.x;
      prevY = coords.y;
    }
  });

  $("#clear").on("click", function() {
    socket.emit('clear');
    clearCanvas();
  });

  $(".palette .color").each(function() {
    var colorIcon = $(this);
    colorIcon.css('background-color', colorIcon.data('color'));

    colorIcon.on('click', function() {
      color = colorIcon.data('color');
      $(".palette .color").removeClass('selected');
      colorIcon.addClass('selected');
    });
  });
});
