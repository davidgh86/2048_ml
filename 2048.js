document.addEventListener("DOMContentLoaded", function () {
    // Wait till the browser is ready to render the game (avoids glitches)
    window.requestAnimationFrame(function () {
      var manager = new GameManager(4, KeyboardInputManager, HTMLActuator, EvolutionaryGenetic);
      manager.moveDown();
    });
  });
  
  function EvolutionaryGenetic(mutationRate, mutationStep){
    //GENETIC ALGORITHM VALUES
    //stores number of genomes, init at 50 
    this.populationSize = 50;
    //stores genomes
    this.genomes = [];
    //index of current genome in genomes array
    this.currentGenome = -1;
    //generation number
    this.generation = 0;
    //stores values for a generation
    this.archive = {
      populationSize: 0,
      currentGeneration: 0,
      elites: [],
      genomes: []
    };
    //rate of mutation
    this.mutationRate = mutationRate; //0.05;
    //helps calculate mutation
    this.mutationStep = mutationStep; //0.2;
  }

  function GameManager(size, InputManager, Actuator, Genetic) {
    this.size         = size; // Size of the grid
    this.inputManager = new InputManager;
    this.actuator     = new Actuator;
    this.genetic      = new Genetic(0.05, 0.2)

    this.startTiles   = 2;
  
    this.inputManager.on("move", this.move.bind(this));
    this.inputManager.on("restart", this.restart.bind(this));
  
    this.setup();
  
  }

  /**
   * Clones an object.
   * @param  {Object} obj The object to clone.
   * @return {Object}     The cloned object.
   */
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  GameManager.prototype.getState = function() {
    var state = {
      grid: clone(this.grid),
      rndSeed: clone(this.rndSeed),
      score: clone(this.score),
      over: clone(this.over),
      won: clone(this.won)
    };
    return state;
  }
  
  // Restart the game
  GameManager.prototype.restart = function () {
    this.actuator.restart();
    this.setup();
  };
  
  // Set up the game
  GameManager.prototype.setup = function () {
    this.grid         = new Grid(this.size);
  
    this.rndSeed      = 1;
    this.score        = 0;
    this.over         = false;
    this.won          = false;
    this.movesTaken   = 0;
    this.moveLimit    = 5000;

    this.saveState = this.getState();
	  this.roundState = this.getState();
  
    // Add the initial tiles
    this.addStartTiles();
  
    // Update the actuator
    this.actuate();
  };
  
  // Set up the initial tiles to start the game with
  GameManager.prototype.addStartTiles = function () {
    for (var i = 0; i < this.startTiles; i++) {
      this.addRandomTile();
    }
  };
  
  // Adds a tile in a random position
  GameManager.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
      var value = Math.random() < 0.9 ? 2 : 4;
      var tile = new Tile(this.grid.randomAvailableCell(), value);
  
      this.grid.insertTile(tile);
    }
  };
  
  // Sends the updated grid to the actuator
  GameManager.prototype.actuate = function () {
    this.actuator.actuate(this.grid, {
      score: this.score,
      over:  this.over,
      won:   this.won
    });
  };
  
  // Save all tile positions and remove merger info
  GameManager.prototype.prepareTiles = function () {
    this.grid.eachCell(function (x, y, tile) {
      if (tile) {
        tile.mergedFrom = null;
        tile.savePosition();
      }
    });
  };
  
  // Move a tile and its representation
  GameManager.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
  };
  
  // Move tiles on the grid in the specified direction
  GameManager.prototype.move = function (direction) {
    // 0: up, 1: right, 2:down, 3: left
    var self = this;
  
    if (this.over || this.won) return; // Don't do anything if the game's over
  
    var cell, tile;
  
    var vector     = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved      = false;
  
    // Save the current tile positions and remove merger information
    this.prepareTiles();
  
    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
      traversals.y.forEach(function (y) {
        cell = { x: x, y: y };
        tile = self.grid.cellContent(cell);
  
        if (tile) {
          var positions = self.findFarthestPosition(cell, vector);
          var next      = self.grid.cellContent(positions.next);
  
          // Only one merger per row traversal?
          if (next && next.value === tile.value && !next.mergedFrom) {
            var merged = new Tile(positions.next, tile.value * 2);
            merged.mergedFrom = [tile, next];
  
            self.grid.insertTile(merged);
            self.grid.removeTile(tile);
  
            // Converge the two tiles' positions
            tile.updatePosition(positions.next);
  
            // Update the score
            self.score += merged.value;
  
            // The mighty 2048 tile
            if (merged.value === 2048) self.won = true;
          } else {
            self.moveTile(tile, positions.farthest);
          }
  
          if (!self.positionsEqual(cell, tile)) {
            moved = true; // The tile moved from its original cell!
          }
        }
      });
    });
  
    if (moved) {
      this.addRandomTile();
  
      if (!this.movesAvailable()) {
        this.over = true; // Game over!
      }
  
      this.actuate();
    }
  };
  
  // Get the vector representing the chosen direction
  GameManager.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
      0: { x: 0,  y: -1 }, // up
      1: { x: 1,  y: 0 },  // right
      2: { x: 0,  y: 1 },  // down
      3: { x: -1, y: 0 }   // left
    };
  
    return map[direction];
  };
  
  // Build a list of positions to traverse in the right order
  GameManager.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };
  
    for (var pos = 0; pos < this.size; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }
  
    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();
  
    return traversals;
  };
  
  GameManager.prototype.findFarthestPosition = function (cell, vector) {
    var previous;
  
    // Progress towards the vector direction until an obstacle is found
    do {
      previous = cell;
      cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
             this.grid.cellAvailable(cell));
  
    return {
      farthest: previous,
      next: cell // Used to check if a merge is required
    };
  };

  /**
   * Returns an array of all the possible moves that could occur in the current state, rated by the parameters of the current genome.
   * @return {Array} An array of all the possible moves that could occur.
   */
  GameManager.prototype.getAllPossibleMoves = function() {
    var lastState = getState();
    var possibleMoves = [];

    //for each possible 3 moves
    for (var rots = 0; rots < 4; rots++) {

      loadState(lastState);

      var algorithm = {
        rowsCleared: moveDownResults.rowsCleared,
        weightedHeight: Math.pow(getHeight(), 1.5),
        cumulativeHeight: getCumulativeHeight(),
        relativeHeight: getRelativeHeight(),
        holes: getHoles(),
        roughness: getRoughness()
      };

      var rating = 0;
      rating += algorithm.rowsCleared * genomes[currentGenome].rowsCleared;
      rating += algorithm.weightedHeight * genomes[currentGenome].weightedHeight;
      rating += algorithm.cumulativeHeight * genomes[currentGenome].cumulativeHeight;
      rating += algorithm.relativeHeight * genomes[currentGenome].relativeHeight;
      rating += algorithm.holes * genomes[currentGenome].holes;
      rating += algorithm.roughness * genomes[currentGenome].roughness;
      //if the move loses the game, lower its rating
      if (moveDownResults.lose) {
        rating -= 500;
      }

      //if the move loses the game, lower its rating
      if (moveDownResults.lose) {
        rating -= 500;
      }
      //push all possible moves, with their associated ratings and parameter values to an array
      possibleMoves.push({rotations: rots, translation: t, rating: rating, algorithm: algorithm});
    }
    //get last state
    this.loadState(lastState);
    //return array of all possible moves
    return possibleMoves;
  }

  /**
   * Makes a move, which is decided upon using the parameters in the current genome.
   */
  GameManager.prototype.makeNextMove = function() {
    //increment number of moves taken
    this.movesTaken++;
    //if its over the limit of moves
    if (this.movesTaken > this.moveLimit) {
      //update this genomes fitness value using the game score
      this.genomes[currentGenome].fitness = clone(score);
      //and evaluates the next genome
      this.evaluateNextGenome();
    } else {
      //time to make a move
      //get all the possible moves
      let possibleMoves = this.getAllPossibleMoves();
      //lets store the current state since we will update it
      let lastState = this.getState();

      //for each possible move 
      for (let i = 0; i < possibleMoves.length; i++) {
        //get the best move. so were checking all the possible moves, for each possible move. moveception.
        let nextMove = this.getHighestRatedMove(this.getAllPossibleMoves());
        //add that rating to an array of highest rates moves
        possibleMoves[i].rating += nextMove.rating;
      }
      //load current state
      this.loadState(lastState);
      //get the highest rated move ever
      let move = this.getHighestRatedMove(possibleMoves);
      //and move left as it says
      if (move.translation === 0) {
        this.moveUp();
        //and right as it says
      } else if (move.translation === 1) {
        this.moveRight();
      } else if (move.translation === 2) {
        this.moveDown();
      } else if (move.translation === 3){
        this.moveLeft();
      }

      //update our move algorithm
      if (inspectMoveSelection) {
        moveAlgorithm = move.algorithm;
      }
    }
  }

  GameManager.prototype.moveDown = function() {
    this.inputManager.emit("move", 2); // 40
  }

  /**
  * Evaluates the next genome in the population. If there is none, evolves the population.
  */
  GameManager.prototype.evaluateNextGenome = function() {
    //increment index in genome array
    currentGenome++;
    //If there is none, evolves the population.
    if (currentGenome == genomes.length) {
      evolve();
    }
    //load current gamestate
    loadState(roundState);
    //reset moves taken
    movesTaken = 0;
    //and make the next move
    makeNextMove();
  }


  
  GameManager.prototype.movesAvailable = function () {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
  };
  
  // Check for available matches between tiles (more expensive check)
  GameManager.prototype.tileMatchesAvailable = function () {
    var self = this;
  
    var tile;
  
    for (var x = 0; x < this.size; x++) {
      for (var y = 0; y < this.size; y++) {
        tile = this.grid.cellContent({ x: x, y: y });
  
        if (tile) {
          for (var direction = 0; direction < 4; direction++) {
            var vector = self.getVector(direction);
            var cell   = { x: x + vector.x, y: y + vector.y };
  
            var other  = self.grid.cellContent(cell);
            if (other) {
            }
  
            if (other && other.value === tile.value) {
              return true; // These two tiles can be merged
            }
          }
        }
      }
    }
  
    return false;
  };
  
  GameManager.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
  };
  
  
  
  function Grid(size) {
    this.size = size;
  
    this.cells = [];
  
    this.build();
  }
  
  // Build a grid of the specified size
  Grid.prototype.build = function () {
    for (var x = 0; x < this.size; x++) {
      var row = this.cells[x] = [];
  
      for (var y = 0; y < this.size; y++) {
        row.push(null);
      }
    }
  };
  
  // Find the first available random position
  Grid.prototype.randomAvailableCell = function () {
    var cells = this.availableCells();
  
    if (cells.length) {
      return cells[Math.floor(Math.random() * cells.length)];
    }
  };
  
  Grid.prototype.availableCells = function () {
    var cells = [];
  
    this.eachCell(function (x, y, tile) {
      if (!tile) {
        cells.push({ x: x, y: y });
      }
    });
  
    return cells;
  };
  
  // Call callback for every cell
  Grid.prototype.eachCell = function (callback) {
    for (var x = 0; x < this.size; x++) {
      for (var y = 0; y < this.size; y++) {
        callback(x, y, this.cells[x][y]);
      }
    }
  };
  
  // Check if there are any cells available
  Grid.prototype.cellsAvailable = function () {
    return !!this.availableCells().length;
  };
  
  // Check if the specified cell is taken
  Grid.prototype.cellAvailable = function (cell) {
    return !this.cellOccupied(cell);
  };
  
  Grid.prototype.cellOccupied = function (cell) {
    return !!this.cellContent(cell);
  };
  
  Grid.prototype.cellContent = function (cell) {
    if (this.withinBounds(cell)) {
      return this.cells[cell.x][cell.y];
    } else {
      return null;
    }
  };
  
  // Inserts a tile at its position
  Grid.prototype.insertTile = function (tile) {
    this.cells[tile.x][tile.y] = tile;
  };
  
  Grid.prototype.removeTile = function (tile) {
    this.cells[tile.x][tile.y] = null;
  };
  
  Grid.prototype.withinBounds = function (position) {
    return position.x >= 0 && position.x < this.size &&
           position.y >= 0 && position.y < this.size;
  };
  
  
  function HTMLActuator() {
    this.tileContainer    = document.getElementsByClassName("tile-container")[0];
    this.scoreContainer   = document.getElementsByClassName("score-container")[0];
    this.messageContainer = document.getElementsByClassName("game-message")[0];
  
    this.score = 0;
  }
  
  HTMLActuator.prototype.actuate = function (grid, metadata) {
    var self = this;
  
    window.requestAnimationFrame(function () {
      self.clearContainer(self.tileContainer);
  
      grid.cells.forEach(function (column) {
        column.forEach(function (cell) {
          if (cell) {
            self.addTile(cell);
          }
        });
      });
  
      self.updateScore(metadata.score);
  
      if (metadata.over) self.message(false); // You lose
      if (metadata.won) self.message(true); // You win!
    });
  };
  
  HTMLActuator.prototype.restart = function () {
    this.clearMessage();
  };
  
  HTMLActuator.prototype.clearContainer = function (container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  };
  
  HTMLActuator.prototype.addTile = function (tile) {
    var self = this;
  
    var element   = document.createElement("div");
    var position  = tile.previousPosition || { x: tile.x, y: tile.y };
    positionClass = this.positionClass(position);
  
    // We can't use classlist because it somehow glitches when replacing classes
    var classes = ["tile", "tile-" + tile.value, positionClass];
    this.applyClasses(element, classes);
  
    element.textContent = tile.value;
  
    if (tile.previousPosition) {
      // Make sure that the tile gets rendered in the previous position first
      window.requestAnimationFrame(function () {
        classes[2] = self.positionClass({ x: tile.x, y: tile.y });
        self.applyClasses(element, classes); // Update the position
      });
    } else if (tile.mergedFrom) {
      classes.push("tile-merged");
      this.applyClasses(element, classes);
  
      // Render the tiles that merged
      tile.mergedFrom.forEach(function (merged) {
        self.addTile(merged);
      });
    } else {
      classes.push("tile-new");
      this.applyClasses(element, classes);
    }
  
    // Put the tile on the board
    this.tileContainer.appendChild(element);
  };
  
  HTMLActuator.prototype.applyClasses = function (element, classes) {
    element.setAttribute("class", classes.join(" "));
  };
  
  HTMLActuator.prototype.normalizePosition = function (position) {
    return { x: position.x + 1, y: position.y + 1 };
  };
  
  HTMLActuator.prototype.positionClass = function (position) {
    position = this.normalizePosition(position);
    return "tile-position-" + position.x + "-" + position.y;
  };
  
  HTMLActuator.prototype.updateScore = function (score) {
    this.clearContainer(this.scoreContainer);
  
    var difference = score - this.score;
    this.score = score;
  
    this.scoreContainer.textContent = this.score;
  
    if (difference > 0) {
      var addition = document.createElement("div");
      addition.classList.add("score-addition");
      addition.textContent = "+" + difference;
  
      this.scoreContainer.appendChild(addition);
    }
  };
  
  HTMLActuator.prototype.message = function (won) {
    var type    = won ? "game-won" : "game-over";
    var message = won ? "You win!" : "Game over!"
  
    // if (ga) ga("send", "event", "game", "end", type, this.score);
  
    this.messageContainer.classList.add(type);
    this.messageContainer.getElementsByTagName("p")[0].textContent = message;
  };
  
  HTMLActuator.prototype.clearMessage = function () {
    this.messageContainer.classList.remove("game-won", "game-over");
  };
  
  function KeyboardInputManager() {
    this.events = {};
  
    this.listen();
  }
  
  KeyboardInputManager.prototype.on = function (event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  };
  
  KeyboardInputManager.prototype.emit = function (event, data) {
    var callbacks = this.events[event];
    if (callbacks) {
      callbacks.forEach(function (callback) {
        callback(data);
      });
    }
  };
  
  KeyboardInputManager.prototype.listen = function () {
    var self = this;
  
    var map = {
      38: 0, // Up
      39: 1, // Right
      40: 2, // Down
      37: 3, // Left
      75: 0, // vim keybindings
      76: 1,
      74: 2,
      72: 3
    };
  
    document.addEventListener("keydown", function (event) {
      var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                      event.shiftKey;
      var mapped    = map[event.which];
  
      if (!modifiers) {
        if (mapped !== undefined) {
          event.preventDefault();
          self.emit("move", mapped);
        }
  
        if (event.which === 32) self.restart.bind(self)(event);
      }
    });
  
    var retry = document.getElementsByClassName("retry-button")[0];
    retry.addEventListener("click", this.restart.bind(this));
  
    // Listen to swipe events
    var gestures = [Hammer.DIRECTION_UP, Hammer.DIRECTION_RIGHT,
                    Hammer.DIRECTION_DOWN, Hammer.DIRECTION_LEFT];
  
    var gameContainer = document.getElementsByClassName("game-container")[0];
    var handler       = Hammer(gameContainer, {
      drag_block_horizontal: true,
      drag_block_vertical: true
    });
    
    handler.on("swipe", function (event) {
      event.gesture.preventDefault();
      mapped = gestures.indexOf(event.gesture.direction);
  
      if (mapped !== -1) self.emit("move", mapped);
    });
  };
  
  KeyboardInputManager.prototype.restart = function (event) {
    event.preventDefault();
    this.emit("restart");
  };
  
  function Tile(position, value) {
    this.x                = position.x;
    this.y                = position.y;
    this.value            = value || 2;
  
    this.previousPosition = null;
    this.mergedFrom       = null; // Tracks tiles that merged together
  }
  
  Tile.prototype.savePosition = function () {
    this.previousPosition = { x: this.x, y: this.y };
  };
  
  Tile.prototype.updatePosition = function (position) {
    this.x = position.x;
    this.y = position.y;
  };
  
  