const db = firebase.firestore()

function initializeDBListener(genetics) {
  db.enablePersistence()
  .catch(err => {
      if (err.code == 'failed-precondition'){
          // probably multiple tabs open at once
         // console.log("persistence failed") 
      } else if (err.code == 'unimplemented') {
          // lack of browser support
          // console.log("persistence is not available")
      }
    })
  // real-time listener
  db.collection('genomes').onSnapshot((snapshot) => {
    // console.log(snapshot.docChanges())
    snapshot.docChanges().forEach((change) => {
        // console.log(change, change.doc.data(), change.doc.id)
        if (change.type === 'added'){
          genetics.genomes.push(change.doc.data())
            //renderRecipe(change.doc.data(), change.doc.id)
        }
        // if (change.type === 'removed'){
        //     removeRecipe(change.doc.id)
        // }
    });
    genetics.generateNextGenome()
  })
}

function persistGenome(genome){
    db.collection('genomes').add(genome)
      .catch(err => {
            console.log(err)
      })
}

document.addEventListener("DOMContentLoaded", async function () {
    // Wait till the browser is ready to render the game (avoids glitches)
    window.requestAnimationFrame(async function () {
      let manager = new GameManager(4, KeyboardInputManager, HTMLActuator, EvolutionaryGenetics);
      let genetics = manager.genetics;
      initializeDBListener(genetics)
      
      setInterval(()=>iterate(manager), 500)
    });
    
  });


  //GameManager.prototype.
  function iterate (gameManager){
    gameManager.makeNextMove();
  }

  function calculateNextMove(arrayGrid, dir) {
    if (dir==0){
      return calculateNextUpFunction(arrayGrid)
    }else if(dir==1){
      return calculateNextRightFunction(arrayGrid)
    }else if(dir==2){
      return calculateNextDownFunction(arrayGrid)
    }else{
      return calculateNextLeftFunction(arrayGrid)
    }
  }

  function calculateNextUpFunction(arrayGrid) {
    let rotatedArray = rotateArray270(arrayGrid)
    let rotatedMergedArray = calculateNextLeftFunction(rotatedArray)
    return rotateArray90(rotatedMergedArray)
  }

  function calculateNextDownFunction(arrayGrid) {
    let rotatedArray = rotateArray90(arrayGrid)
    let rotatedMergedArray = calculateNextLeftFunction(rotatedArray)
    return rotateArray270(rotatedMergedArray)
  }

  function calculateNextRightFunction(arrayGrid){
    let rotatedArray = rotateArray180(arrayGrid)
    let rotatedMergedArray = calculateNextLeftFunction(rotatedArray)
    return rotateArray180(rotatedMergedArray)
  }

  function calculateNextLeftFunction(arrayGrid){
    let resultArrayGrid = []
    for (let i=0; i<arrayGrid.length; i++){
      resultArrayGrid.push(moveTraversable(arrayGrid[i]))
    }
    return resultArrayGrid;
  }

  function rotateArray90(arrayGrid){
    let resultArray = []
    for (i=0; i<arrayGrid[0].length; i++){
      let resultVector = []
      for (j=(arrayGrid.length-1); j>=0; j--){
        resultVector.push(arrayGrid[j][i])
      }
      resultArray.push(resultVector)
    }
    return resultArray;
  }

  function rotateArray180(arrayGrid){
    return rotateArray90(rotateArray90(arrayGrid))
  }

  function rotateArray270(arrayGrid){
    return rotateArray180(rotateArray90(arrayGrid))
  }

  function moveTraversable(vectorGrid) {
    let movableElements = []
    for(let i=0; i<vectorGrid.length; i++){
      if (vectorGrid[i]!==0){
        movableElements.push(vectorGrid[i])
      }
    }
    for(let i=0; i<(movableElements.length-1); i++){
      if (movableElements[i]===movableElements[i+1]){
        movableElements[i]=movableElements[i]*2
        movableElements[i+1]=0
      }
    }
    let resultTraversable = []
    let count = 0;
    for(let i=0; i<movableElements.length; i++){
      if (movableElements[i]!==0){
        count++;
        resultTraversable.push(movableElements[i])
      }
    }
    for (; count<4; count++){
      resultTraversable.push(0)
    }
    return resultTraversable;

  }

  function EvolutionaryGenetics(gameManager){
    this.genomes = []

    this.gameManager = gameManager;

    //rate of mutation
    this.mutationRate = 0.2;
    //helps calculate mutation
    this.mutationStep = 0.2;

    this.currentGenome = this.generateRandomGenome();

    //this.genomes.push(this.currentGenome)
  }



  EvolutionaryGenetics.prototype.generateRandomGenome = function(){
    return {
      id: Math.random(),
      holesWeigth: Math.random() - 0.5,
      roughnessWeigth: Math.random() - 0.5,
      maximumPositionRowWeigth: Math.random() - 0.5,
      maximumPositionColWeigth: Math.random() - 0.5
    };
  }

  EvolutionaryGenetics.prototype.evolve = function(){
    this.currentGenome["score"] = this.gameManager.score;
    //this.genomes.push(this.currentGenome);
    persistGenome(this.currentGenome)
    
    this.generateNextGenome();
  }

  EvolutionaryGenetics.prototype.isLearning = function(){
    return localStorage.getItem("mode")==="learning"
  }

  EvolutionaryGenetics.prototype.generateNextGenome = function(){
    if (!this.isLearning()){
      if(this.genomes.length<1){
        this.currentGenome = this.generateRandomGenome();
      }else{
        this.sortGenomes()
        this.currentGenome = this.genomes[0];
      }
    }else{
      if (this.genomes.length<2){
        this.currentGenome = this.generateRandomGenome();
      }
      else{
        this.makeChild()
      }
    }
  }

  function randomChoice(propOne, propTwo) {
    if (Math.round(Math.random()) === 0) {
      return clone(propOne);
    } else {
      return clone(propTwo);
    }
  }

  EvolutionaryGenetics.prototype.makeChild = function() {
    
    this.sortGenomes()
    this.currentGenome = {
      id: Math.random(),
      holesWeigth: randomChoice(this.genomes[0].holesWeigth, this.genomes[1].holesWeigth),
      roughnessWeigth: randomChoice(this.genomes[0].roughnessWeigth, this.genomes[1].roughnessWeigth),
      maximumPositionRowWeigth: randomChoice(this.genomes[0].maximumPositionRowWeigth, this.genomes[1].maximumPositionRowWeigth),
      maximumPositionColWeigth: randomChoice(this.genomes[0].maximumPositionColWeigth, this.genomes[1].maximumPositionColWeigth)
    };

    if (Math.random() < this.mutationRate) {
      this.currentGenome.holesWeigth = this.currentGenome.holesWeigth + Math.random() * this.mutationStep * 2 - this.mutationStep;
    }
    if (Math.random() < this.mutationRate) {
      this.currentGenome.roughnessWeigth = this.currentGenome.roughnessWeigth + Math.random() * this.mutationStep * 2 - this.mutationStep;
    }
    if (Math.random() < this.mutationRate) {
      this.currentGenome.maximumPositionRowWeigth = this.currentGenome.maximumPositionRowWeigth + Math.random() * this.mutationStep * 2 - this.mutationStep;
    }
    if (Math.random() < this.mutationRate) {
      this.currentGenome.maximumPositionColWeigth = this.currentGenome.maximumPositionColWeigth + Math.random() * this.mutationStep * 2 - this.mutationStep;
    }
    console.log(JSON.stringify(this.currentGenome))
  }

  EvolutionaryGenetics.prototype.sortGenomes = function(){
    this.genomes.sort(function(a, b) {
      return -(a.score - b.score);
    });
  }

  EvolutionaryGenetics.prototype.getMoveRating = function(grid) {
    
    let rating = 0;
    const maximumPosition = this.getMaximumPosition(grid);

    let algorithm = {
      holes: this.getNumberOfHoles(grid),
      roughness: this.calculateRoughness(grid),
      maximumPositionHighRow: maximumPosition.row,
      maximumPositionHighColumn: maximumPosition.column
    };

    rating += algorithm.holes * this.currentGenome.holesWeigth;
    rating += algorithm.roughness * this.currentGenome.roughnessWeigth;
    rating += algorithm.maximumPositionHighRow * this.currentGenome.maximumPositionRowWeigth;
    rating += algorithm.maximumPositionHighColumn * this.currentGenome.maximumPositionColWeigth;

    return rating
  }

  EvolutionaryGenetics.prototype.getMaximumPosition = function (arrayGrid){
    return getMaximumPosition(arrayGrid);
  }

  function getMaximumPosition(arrayGrid){
    let result = {row: 0, column: 0}
    let maximum = 0;
    for (let iRow = 0; iRow<arrayGrid.length; iRow++){
      for (let iCol = 0; iCol<arrayGrid[iRow].length; iCol++){
        if(!!arrayGrid[iRow][iCol] && arrayGrid[iRow][iCol]!==0 && arrayGrid[iRow][iCol]>maximum){
          result = {row: iRow, column: iCol}
          maximum = arrayGrid[iRow][iCol]
        }
      }
    }
    return result;
  }
  
  EvolutionaryGenetics.prototype.normalizeGrid = function (grid){
    const normalizedCells = clone(grid)
    for (let row = 0; row<normalizedCells.length; row++){
      for (let cell = 0; cell<normalizedCells[row].length; cell++){
        let value = normalizedCells[row][cell];
        if (!!value && value !== 0){
          normalizedCells[row][cell] = Math.log2(value)
        }
      }
    }
    return normalizedCells;
  }

  EvolutionaryGenetics.prototype.getNumberOfHoles = function(arrayGrid){
    let result = 0
    for (let iRow = 0; iRow<arrayGrid.length; iRow++){
      for (let iCol = 0; iCol<arrayGrid[iRow].length; iCol++){
        if(!arrayGrid[iRow][iCol] || arrayGrid[iRow][iCol]===0){
          result++
        }
      }
    }
    return result;
  }

  EvolutionaryGenetics.prototype.calculateRoughness = function(arrayGrid){
    let result = 0;
    for (let row = 0; row<arrayGrid.length; row++){
      for (let col= 0; col<arrayGrid[row].length; col++){
        result += this.calculateRoughnessPivotValue(arrayGrid, row, col);
      }
    }
    return result;
  }

  EvolutionaryGenetics.prototype.calculateRoughnessPivotValue = function (arrayGrid, row, column) {
    let normalizedGrid = this.normalizeGrid(arrayGrid)
    let pivotValue = normalizedGrid[row][column];
    let result = 0;
    for (let iRow = 0; iRow<normalizedGrid.length; iRow++){
      for (let iCol = 0; iCol<normalizedGrid[iRow].length; iCol++){
        if((iRow === row && iCol === column) || normalizedGrid[iRow][iCol]===0){
          result += 0
        }else{
          let finalCellValue = Math.abs(normalizedGrid[iRow][iCol] - pivotValue)
          finalCellValue = finalCellValue / Math.pow(this.calculateDistance(iRow, iCol, row, column), 2)
          result += finalCellValue;
        }
      }
    }
    return result;
  }

  EvolutionaryGenetics.prototype.calculateDistance = function(rowIndex, columnIndex, pivotRowIndex, pivotColumnIndex) {
    let irow = Math.abs(rowIndex - pivotRowIndex)
    let iCol = Math.abs(columnIndex - pivotColumnIndex)
    return Math.abs(irow+iCol);
  }

  EvolutionaryGenetics.prototype.justOneTileEmpty = function(arrayGrid){
    let thereAreEmpty=false;
    for (let i = 0; i<arrayGrid.length; i++){
      for (let j = 0; j<arrayGrid[i].length; j++){
        if (!arrayGrid[i][j] || arrayGrid===0){
          if (thereAreEmpty){
            return false;
          }
          thereAreEmpty=true;
        }
      }
    }
    return thereAreEmpty;
  }
  
  /**
 * Clones an object.
 * @param  {Object} obj The object to clone.
 * @return {Object}     The cloned object.
 */
 function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
  
  function GameManager(size, InputManager, Actuator, Genetics) {
    this.size         = size; // Size of the grid
    this.inputManager = new InputManager;
    this.actuator     = new Actuator;
    this.genetics     = new Genetics(this);
  
    this.startTiles   = 2;
  
    this.inputManager.on("move", this.move.bind(this));
    this.inputManager.on("restart", this.restart.bind(this));
  
    this.setup();
  }

  GameManager.prototype.makeNextMove = function(){
    let nextMove = this.getNextMove();
    this.inputManager.emit("move", nextMove)
  }

  function gridArrayEquals(grid1, grid2){
    return JSON.stringify(grid1)===JSON.stringify(grid2)
  }

  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function transposeArrayGrid(arrayGrid){
    let result = []
    for (let col = 0; col<arrayGrid[0].length; col++){
      let resultRow = []
      for (let row = 0; row<arrayGrid.length; row++){
        resultRow.push(arrayGrid[row][col])
      }
      result.push(resultRow)
    }
    return result;
  }

  GameManager.prototype.getNextMove = function() {
    
    let currentArrayGrid = clone(this.grid.toArray())
    // due to the internal representation of the game we need to transpose the grid
    
    let gameMoveUp = calculateNextMove(currentArrayGrid, 0)
    let gameMoveRight = calculateNextMove(currentArrayGrid, 1)
    let gameMoveDown = calculateNextMove(currentArrayGrid, 2)
    let gameMoveLeft = calculateNextMove(currentArrayGrid, 3)

    let maxRating = -99999999999999;

    let upRating = gridArrayEquals(currentArrayGrid, gameMoveUp)?maxRating:this.genetics.getMoveRating(gameMoveUp)
    let rightRating = gridArrayEquals(currentArrayGrid, gameMoveRight)?maxRating:this.genetics.getMoveRating(gameMoveRight)
    let downRating = gridArrayEquals(currentArrayGrid, gameMoveDown)?maxRating:this.genetics.getMoveRating(gameMoveDown)
    let leftRating = gridArrayEquals(currentArrayGrid, gameMoveLeft)?maxRating:this.genetics.getMoveRating(gameMoveLeft)

    // avoiding makeing a move that leads to a game over
    if (this.genetics.justOneTileEmpty(gameMoveUp)){
      upRating -=500
    }
    if (this.genetics.justOneTileEmpty(gameMoveRight)){
      rightRating -=500
    }
    if (this.genetics.justOneTileEmpty(gameMoveDown)){
      downRating -=500
    }
    if (this.genetics.justOneTileEmpty(gameMoveLeft)){
      leftRating -=500
    }

    if(
      upRating===maxRating &&
      leftRating===maxRating &&
      rightRating===maxRating &&
      downRating===maxRating
    ){
      return getRandomInt(0,3)
    }

    if (
      upRating >= rightRating &&
      upRating >= downRating &&
      upRating >= leftRating
    ){
        return 0;     
    }
    if (
      rightRating >= upRating &&
      rightRating >= downRating &&
      rightRating >= leftRating
    ){
      return 1;     
    }
    if (
      downRating >= upRating &&
      downRating >= rightRating &&
      downRating >= leftRating
    ){
      return 2;   
    }
    else return 3;
    
  }
  
  // Restart the game
  GameManager.prototype.restart = function () {
    this.actuator.restart();
    this.genetics.evolve();
    this.setup();
  };
  
  // Set up the game
  GameManager.prototype.setup = function () {
    this.grid         = new Grid(this.size);
    this.score        = 0;
    this.over         = false;
    this.won          = false;
  
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
      won:   this.won,
      maximum: this.grid.getMaximumValue()
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
  GameManager.prototype.move = function (direction, simulate=false) {
    // 0: up, 1: right, 2:down, 3: left
    var self = this;
  
    if (this.over) {
      this.inputManager.emit("restart")
      return; // Don't do anything if the game's over
      
    }
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
            //if (merged.value === 2048) self.won = true;
          } else {
            self.moveTile(tile, positions.farthest);
          }
  
          if (!self.positionsEqual(cell, tile)) {
            moved = true; // The tile moved from its original cell!
          }
        }
      });
    });
  
    if (moved){ //&& !simulate) {
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

  Grid.prototype.getMaximumValue = function(){
    let maximum =0
    for (var x = 0; x < this.size; x++) {
      for (var y = 0; y < this.size; y++) {
        if (!!this.cells[x][y] && this.cells[x][y].value>maximum){
          maximum = this.cells[x][y].value
        }
      }
    }
    return maximum;
  }
  
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

  Grid.prototype.toArray = function() {
    let resultMatrix = []
    for (let row = 0; row<this.cells.length; row++){
      let resultRow = []
      for (let col=0; col<this.cells[row].length; col++){
        let tile = this.cells[row][col];
        if (tile != null){
          let cellContent = this.cellContent(this.cells[row][col])
          resultRow.push(!!cellContent?cellContent.value:0);
        }else {
          resultRow.push(0)
        }
      }
      resultMatrix.push(resultRow)
    }
    
    return transposeArrayGrid(resultMatrix);
  }
  
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
  
      if (metadata.over) {
        self.updateHistoryList(metadata.score, metadata.maximum);
      } // You lose
      //if (metadata.won) self.message(false); // You win!
      //if (metadata.won) self.message(true); // You win!
      
    });
  };

  HTMLActuator.prototype.updateHistoryList = function (score, maximum) {
    let scores= document.querySelector("#history-scores")
    let text = scores.innerHTML;
    let updatedText = `${text}<div></div>
    <div>
        ${score}
    </div>
    <div>
        ${maximum}
    </div>
    <div class="space-left"></div>
    `;
    scores.innerHTML=updatedText;
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
  
  