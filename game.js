var pong = (function () {

  var KEY_ENTER = 13;
  var KEY_UP = 38;
  var KEY_DOWN = 40;
  var KEY_W = 87;
  var KEY_S = 83;

  var canvas;
  var canvasCenter;
  var ctx;
  var scene;

  var scores = [0, 0];

  // ==========================================================================
  /**
   * The welcoming scene for the Pong game.
   *
   * This scene is the introduction scene which will be show to the users when
   * they open the page. Scene contains the topic of the game, instructions
   * about how to move paddles with the keyboard controls and a text which
   * contains an instruction about how to start the game.
   */
  var welcomeScene = (function () {
    /** A function that is called when the game enters the scene */
    function enter() {
      document.addEventListener("keyup", onKeyUp);
    }

    /** A function that is called when the game exits the scene. */
    function exit() {
      document.removeEventListener("keyup", onKeyUp);
    }

    /** A function that is called on each main loop iteration.  */
    function update() {
      // ... no implementation required
    }

    /** A function that is called on each rendering frame iteration. */
    function draw() {
      // clear the current contents from the canvas.
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // draw the application name string.
      ctx.font = "32pt Arial";
      ctx.fillText("HTML5 PONG", canvasCenter[0], 100);

      // draw the controls string.
      ctx.font = "18pt Arial";
      ctx.fillText("Controls for the left player:", canvasCenter[0], 200);
      ctx.fillText("W and S", canvasCenter[0], 240);
      ctx.fillText("Controls for the right player:", canvasCenter[0], 300);
      ctx.fillText("UP-ARROW and DOWN-ARROW", canvasCenter[0], 340);

      // draw the instructions how to proceed text.
      ctx.fillText("Press [ENTER] to start the match", canvasCenter[0], 500);
    }

    /**
     * A key listener to detect when a user key press is released.
     *
     * This implementation will detect only enter presses, which will trigger
     * a new state transition from the welcome scene to the court scene.
     *
     * @param {*} event A key release event from the browser.
     */
    function onKeyUp(event) {
      var key = e.keyCode ? e.keyCode : e.which;
      if (key == KEY_ENTER) {
        setScene(courtScene);
      }
    }

    return {
      enter: enter,
      exit: exit,
      update: update,
      draw: draw
    }
  })();

  // ==========================================================================
  /**
   * The court scene for the Pong application.
   *
   * This is the main game scene where the game simulation will be processed.
   * It contains all the logics required to move game entities and to make the
   * game act as a "game". This is the biggest scene from all the three scenes.
   */
  var courtScene = (function () {

    /** The width of the small boxes used around the scene. */
    var BOX_WIDTH = 20;
    /** The height for the top and bottom walls. */
    var WALL_HEIGHT = BOX_WIDTH;
    /** The height for the left and right paddles. */
    var PADDLE_HEIGHT = 100;
    /** A constant edge offset pixels for both paddles. */
    var EDGE_OFFSET = 30;

    /** A movement for the up direction. */
    var MOVE_UP = -1;
    /** A movement for being still. */
    var MOVE_NONE = 0;
    /** A movement for the down direction. */
    var MOVE_DOWN = 1;

    var background;
    var topWall;
    var bottomWall;
    var leftPaddle;
    var rightPaddle;
    var ball;
    var leftGoal;
    var rightGoal;

    /**
     * An Axis Aligned Bounding Box implementation for the game.
     * @param {*} x The x-coordinate (top-left-draw-start) point of the object.
     * @param {*} y The y-coordinate (top-left-draw-start) point of the object.
     * @param {*} width The width of the object.
     * @param {*} height The height of the object.
     */
    var AABB = (function (x, y, width, height) {

      /** The center point of the box. */
      var center = [x + (width / 2), y + (height / 2)];
      /** The extent of the box. */
      var extent = [width / 2, height / 2];

      /**
       * Check whether the AABB intersects with an another AABB.
       *
       * @param {*} o An another AABB to check intersection with.
       * @returns A boolean indicating whether AABBs intersect.
       */
      function intersects(o) {
        var x = Math.abs(this.center[0] - o.center[0]) < (this.extent[0] + o.extent[0]);
        var y = Math.abs(this.center[1] - o.center[1]) < (this.extent[1] + o.extent[1]);
        return x && y;
      }

      /**
       * Get the center of the AABB.
       *
       * @returns {[]} An array containing the center 2D-coordinates.
       */
      function getCenter() {
        return this.center;
      }

      /**
       * Set the center of the AABB.
       *
       * @param {[]} newCenter New center point 2D-coordinates.
       */
      function setCenter(newCenter) {
        this.center = newCenter;
      }

      /**
       * Get the extent of the AABB.
       *
       * @return {[]} An array containing the extent in 2D.
       */
      function getExtent() {
        return this.extent;
      }

      /**
       * Set the extent for the AABB.
       *
       * @param {[]} newExtent New 2D extent for the AABB.
       */
      function setExtent(newExtent) {
        this.extent = newExtent;
      }

      /**
       * Move the AABB with the amount of the given array.
       *
       * @param {[]} amount The amount to move.
       */
      function move(amount) {
        this.center[0] += amount[0];
        this.center[1] += amount[1];
      }

      /**
       * Draw the AABB boundaries to visualize the bounding box.
       *
       * This is helpful when debugging the bounding box.
       */
      function draw() {
        ctx.strokeStyle = "#00ff00";
        var rect = [this.center[0], this.center[1], this.extent[0], this.extent[1]];
        rect[0] -= this.extent[0];
        rect[1] -= this.extent[1];
        rect[2] *= 2;
        rect[3] *= 2;
        ctx.strokeRect(rect[0], rect[1], rect[2], rect[3]);
        ctx.strokeStyle = "#ffffff";
      }

      return {
        intersects: intersects,
        center: center,
        extent: extent,
        getCenter: getCenter,
        setCenter: setCenter,
        getExtent: getExtent,
        setExtent: setExtent,
        move: move,
        draw: draw
      };

    });

    /**
     * A center line entity that contains the center line boxes.
     *
     * Note that this entity is not collideable and should not be used in any
     * kind of game logic related stuff. It is only used to make the court to
     * look more like a playfield similar to tennis or other ball games.
     */
    var centerLine = (function () {

      function draw() {
        var x = (canvasCenter[0] - BOX_WIDTH / 2);
        for (var y = WALL_HEIGHT; y < canvas.height; y += (1.93 * BOX_WIDTH)) {
          ctx.fillRect(x, y, BOX_WIDTH, BOX_WIDTH);
        }
      }

      return { draw: draw };

    });


    /**
     * A wall entity that contains definitions for the top and bottom walls.
     * @param {*} x The x-coordinate of the wall position.
     * @param {*} y The y-coordinate of the wall position.
     * @param {*} width The width of the wall.
     * @param {*} height The height of the wall.
     */
    var wall = (function (x, y, width, height) {

      var position = [x, y];
      var size = [width, height];
      var aabb = AABB(x, y, width, height);

      function draw() {
        ctx.fillRect(position[0], position[1], size[0], size[1]);
      }

      return { draw: draw, aabb: aabb };

    });

    /**
     * The paddle entity that contains definitions for a player paddle.
     * @param {*} x The x-coordinate of the paddle position.
     * @param {*} y The y-coordinate of the paddle position.
     * @param {*} width The width of the paddle.
     * @param {*} height The height of the paddle.
     */
    var paddle = (function (x, y, width, height) {

      /** The movement velocity for the paddles. */
      var VELOCITY = 8.0;

      var position = [x, y];
      var size = [width, height];
      var aabb = AABB(x, y, width, height);
      var movement = 0;

      function draw() {
        ctx.fillRect(position[0], position[1], size[0], size[1]);
      }

      function setMovement(direction) {
        movement = direction;
      }

      function getMovement() {
        return movement;
      }

      function update() {
        if (movement != 0) {
          var moveAmount = [0, movement * VELOCITY];
          position[0] += moveAmount[0];
          position[1] += moveAmount[1];
          aabb.move(moveAmount);
          if (movement == 1) {
            if (aabb.intersects(bottomWall.aabb)) {
              // prevent paddle from moving through the wall.
              position[1] = bottomWall.aabb.center[1];
              position[1] -= bottomWall.aabb.extent[1];
              position[1] -= size[1];

              // ensure that the AABB position gets updated as well.
              var center = [aabb.center[0], position[1]];
              center[1] += aabb.extent[1];
              aabb.setCenter(center);

              // stop the movement.
              movement = 0;
            }
          } else {
            if (aabb.intersects(topWall.aabb)) {
              // prevent paddle from moving through the wall.
              position[1] = topWall.aabb.center[1];
              position[1] += topWall.aabb.extent[1];

              // ensure that the AABB position gets updated as well.
              var center = [aabb.center[0], position[1]];
              center[1] += aabb.extent[1];
              aabb.setCenter(center);

              // stop the movement.
              movement = 0;
            }
          }
        }
      }

      /**
       * Reset the paddle state.
       *
       * Clears the position and randomizes the movement direction.
       */
      function reset() {
        // center the paddle in a vetical axis.
        position = [x, canvasCenter[1] - size[1] / 2];

        // apply the movement to AABB as well.
        var extent = aabb.getExtent();
        var aabbCenter = [position[0] + extent[0], position[1] + extent[1]];
        aabb.setCenter(aabbCenter);

        // reset the paddle movement.
        movement = MOVE_NONE;
      }

      return {
        draw: draw,
        update: update,
        setMovement: setMovement,
        getMovement: getMovement,
        aabb: aabb,
        reset: reset
      };

    });

    /**
     * The ball entity that contains definitions for the game ball.
     * @param {*} x The x-coordinate of the ball position.
     * @param {*} y The y-coordinate of the ball position.
     * @param {*} width The width of the ball.
     * @param {*} height The height of the ball.
     */
    var ballBox = (function (x, y, width, height) {

      /** The initial velocity for the ball. */
      var INITIAL_VELOCITY = 8.0;
      /** The amount of velocity to be added on each paddle hit. */
      var VELOCITY_INCREASE = 1.0;
      /** The maximum velocity for the ball. */
      var MAX_VELOCITY = 15.0;

      var velocity = INITIAL_VELOCITY;
      var position = [x, y];
      var direction = [-0.5, 0.5];
      var size = [width, height];
      var aabb = AABB(x, y, width, height);

      function draw() {
        ctx.fillRect(position[0], position[1], size[0], size[1]);
        aabb.draw();
      }

      function update() {
        // apply a movement for the ball for this tick.
        var movement = [direction[0] * velocity, direction[1] * velocity];
        position[0] += movement[0];
        position[1] += movement[1];
        aabb.move(movement);

        if (aabb.intersects(bottomWall.aabb)) {
          // prevent the ball from moving through the wall.
          position[1] = bottomWall.aabb.center[1];
          position[1] -= bottomWall.aabb.extent[1];
          position[1] -= size[1];

          // ensure that the AABB position gets updated as well.
          var center = [position[0], position[1]];
          center[0] += aabb.extent[0];
          center[1] += aabb.extent[1];
          aabb.setCenter(center);

          // invert the y-axis direction.
          direction[1] = -direction[1];
        } else if (aabb.intersects(topWall.aabb)) {
          // prevent the ball from moving through the wall.
          position[1] = topWall.aabb.center[1];
          position[1] += topWall.aabb.extent[1];

          // ensure that the AABB position gets updated as well.
          var center = [position[0], position[1]];
          center[0] += aabb.extent[0];
          center[1] += aabb.extent[1];
          aabb.setCenter(center);

          // invert the y-axis direction.
          direction[1] = -direction[1];
        } else if (aabb.intersects(leftPaddle.aabb)) {
          // prevent the ball from moving through the paddle.
          position[0] = leftPaddle.aabb.center[0];
          position[0] += leftPaddle.aabb.extent[0];

          // ensure that the AABB position gets updated as well.
          var center = [position[0], position[1]];
          center[0] += aabb.extent[0];
          center[1] += aabb.extent[1];
          aabb.setCenter(center);

          // invert the x-axis direction.
          direction[0] = -direction[0];

          // increase the velocity if possible.
          velocity += VELOCITY_INCREASE;
          velocity = Math.min(velocity, MAX_VELOCITY);
        } else if (aabb.intersects(rightPaddle.aabb)) {
          // prevent the ball from moving through the paddle.
          position[0] = rightPaddle.aabb.center[0];
          position[0] -= rightPaddle.aabb.extent[0];
          position[0] -= size[0];

          // ensure that the AABB position gets updated as well.
          var center = [position[0], position[1]];
          center[0] += aabb.extent[0];
          center[1] += aabb.extent[1];
          aabb.setCenter(center);

          // invert the x-axis direction.
          direction[0] = -direction[0];

          // increase the velocity if possible.
          velocity += VELOCITY_INCREASE;
          velocity = Math.min(velocity, MAX_VELOCITY);
        } else if (aabb.intersects(leftGoal.aabb)) {
          resetEntities();
          scores[1] += 1;
          console.log(scores); // TODO remove
          if (scores[0] > 9 || scores[1] > 9) {
            // TODO change to endgameScene
          }
        } else if (aabb.intersects(rightGoal.aabb)) {
          resetEntities();
          scores[0] += 1;
          console.log(scores); // TODO remove
          if (scores[0] > 9 || scores[1] > 9) {
            // TODO change to endgameScene
          }
        }
      }

      /**
       * Randomize the ball direction.
       *
       * Note here that we use four static directions for the ball.
       */
      function randomizeDirection() {
        var random = Math.floor((Math.random() * 4));
        switch (random) {
          case 0:
            direction = [0.5, 0.5];
            break;
          case 1:
            direction = [0.5, -0.5];
            break;
          case 2:
            direction = [-0.5, 0.5];
            break;
          case 3:
          default:
            direction = [-0.5, -0.5];
            break;
        }
      }

      /**
       * Reset the ball state.
       *
       * Clears the position and randomizes the movement direction.
       */
      function reset() {
        var halfBox = BOX_WIDTH / 2;
        position = [canvasCenter[0] - halfBox, canvasCenter[1] - halfBox];
        aabb.setCenter([canvasCenter[0], canvasCenter[1]]);
        randomizeDirection();
        velocity = INITIAL_VELOCITY;
      }

      return {
        draw: draw,
        update: update,
        reset: reset
      };

    });

    /**
     * A goal entity that contains definitions for the game goals.
     * @param {*} x The x-coordinate of the goal position.
     * @param {*} y The y-coordinate of the goal position.
     * @param {*} width The width of the goal.
     * @param {*} height The height of the goal.
     */
    var goal = (function (x, y, width, height) {

      var aabb = AABB(x, y, width, height);

      return { aabb: aabb };
    });

    /** A function that is called when the game entities must be reset. */
    function resetEntities() {
      ball.reset();
      rightPaddle.reset();
      leftPaddle.reset();
    }

    /** A function that is called when the game enters the scene */
    function enter() {
      // create a new background for the courtyard.
      background = new centerLine();

      // calculate the position and size for the top wall.
      var position = [0, 0];
      var size = [canvas.width, WALL_HEIGHT];
      topWall = wall(0, 0, canvas.width, WALL_HEIGHT);

      // calculate the position and size for the bottom wall.
      position = [0, canvas.height - WALL_HEIGHT];
      size = [canvas.width, WALL_HEIGHT];
      bottomWall = wall(position[0], position[1], size[0], size[1]);

      // calculate the position and size for the left paddle.
      position = [EDGE_OFFSET, canvasCenter[1] - (PADDLE_HEIGHT / 2)];
      size = [BOX_WIDTH, PADDLE_HEIGHT];
      leftPaddle = paddle(position[0], position[1], size[0], size[1]);

      // calculate the position and size for the right paddle.
      position[0] = (canvas.width - EDGE_OFFSET - size[0]);
      rightPaddle = paddle(position[0], position[1], size[0], size[1]);

      // calculate the position and size for the ball.
      var halfBox = BOX_WIDTH / 2;
      position = [canvasCenter[0] - halfBox, canvasCenter[1] - halfBox];
      size = [BOX_WIDTH, BOX_WIDTH];
      ball = ballBox(position[0], position[1], size[0], size[1]);

      // calculate the position and size for the left goal.
      // NOTE: we use area where the ball is completely out of the scene.
      position = [-1000, 0];
      size = [1000 - BOX_WIDTH, canvas.height];
      leftGoal = goal(position[0], position[1], size[0], size[1]);

      // calculate the position and size for the right goal.
      // NOTE: we use area where the ball is completely out of the scene.
      position = [BOX_WIDTH + canvas.width, 0];
      size = [1000, canvas.height];
      rightGoal = goal(position[0], position[1], size[0], size[1]);

      // add button listeners to the document.
      document.addEventListener("keyup", onKeyUp);
      document.addEventListener("keydown", onKeyDown);

      // reset scores.
      scores = [0, 0];
    }

    /**
     * A function that handles court key release events.
     *
     * @param {*} event A key release event from the browser.
     */
    function onKeyUp(event) {
      var key = event.keyCode ? event.keyCode : event.which;
      switch (key) {
        case KEY_UP:
          if (rightPaddle.getMovement() == MOVE_UP) {
            rightPaddle.setMovement(MOVE_NONE);
          }
          break;
        case KEY_DOWN:
          if (rightPaddle.getMovement() == MOVE_DOWN) {
            rightPaddle.setMovement(MOVE_NONE);
          }
          break;
        case KEY_W:
          if (leftPaddle.getMovement() == MOVE_UP) {
            leftPaddle.setMovement(MOVE_NONE);
          }
          break;
        case KEY_S:
          if (leftPaddle.getMovement() == MOVE_DOWN) {
            leftPaddle.setMovement(MOVE_NONE);
          }
          break;
        default:
          break;
      }
    }

    /**
     * A function that handles court key press events.
     *
     * @param {*} event A key press event from the browser.
     */
    function onKeyDown(event) {
      var key = event.keyCode ? event.keyCode : event.which;
      switch (key) {
        case KEY_UP:
          rightPaddle.setMovement(MOVE_UP);
          break;
        case KEY_DOWN:
          rightPaddle.setMovement(MOVE_DOWN);
          break;
        case KEY_W:
          leftPaddle.setMovement(MOVE_UP);
          break;
        case KEY_S:
          leftPaddle.setMovement(MOVE_DOWN);
          break;
        default:
          break;
      }
    }

    /** A function that is called when the game exits the scene. */
    function exit() {
      // remove button listeners from the document.
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("keydown", onKeyDown);
    }

    /** A function that is called on each main loop iteration.  */
    function update() {
      leftPaddle.update();
      rightPaddle.update();
      ball.update();
    }

    /** A function that is called on each rendering frame iteration. */
    function draw() {
      // clear the current contents from the canvas.
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // draw the top and bottom wall.
      topWall.draw();
      bottomWall.draw();

      // draw the center line with small boxes.
      background.draw();

      // draw paddles.
      leftPaddle.draw();
      rightPaddle.draw();

      // draw the ball.
      ball.draw();
    }

    return {
      enter: enter,
      exit: exit,
      update: update,
      draw: draw
    }

  })();

  // ==========================================================================

  /**
   * Set the given scene as the active scene.
   *
   * Old active scene (if any) will be first exited by calling the exit
   * function so it can clean up all necessary resources as required. New
   * scene will be assigned as the active scene and the enter function will
   * be called to ensure that the new scene can initialize itself.
   *
   * @param {*} newScene A new scene to be applied as the active scene.
   */
  function setScene(newScene) {
    if (newScene) {
      // perform a cleanup for the old scene (if defined).
      if (scene) {
        scene.exit();
      }

      // apply the new scene and call the scene init (reset).
      scene = newScene;
      scene.enter();
    }
  }

  /**
   * Initialize the game.
   *
   * Initialization will ensure that the game will get a reference to the
   * 2D drawing context from the game canvas element. It also provides a
   * way to define a game wide initializations for scenes etc.
   */
  function init() {
    // get a referene to the target <canvas> element.
    canvas = document.getElementById("game-canvas");
    if (!canvas) {
      throw Error("Unable to find the required canvas element.");
    }

    // precalculate the center point of the canvas.
    canvasCenter = [];
    canvasCenter[0] = (canvas.width / 2);
    canvasCenter[1] = (canvas.height / 2);

    // get a reference to the 2D drawing context.
    ctx = canvas.getContext("2d");
    if (!ctx) {
      throw Error("Unable to get 2D draw context from the canvas.");
    }

    // specify global draw definitions.
    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    // set the welcome scene as the initial scene.
    setScene(courtScene);
  }

  function run() {
    // update and draw the current scene.
    scene.update();
    scene.draw();

    // perform a trivial main loop iteration.
    requestAnimationFrame(run);
  }

  /**
   * Start the game.
   *
   * Game will be first initialized and the started. Game will be using a
   * infinite loop (via requestAnimationFrame) as the main loop, so the game
   * will not will run until the user closes the browser tab or if an error
   * is detected by the JavaScript.
   */
  function start() {
    init();
    run();
  }

  return {
    start: start
  };
})();

pong.start();
