var rndSeed = 1;

//adpat to game
var currentTile = {x: undefined, y:undefined, number:undefined};

//GAME VALUES
//Game score
var score = 0;
//for storing current state, we can load later
var saveState;
//stores current game state
var roundState;
//how many so far?
var movesTaken = 0;
//max number of moves allowed in a generation
var moveLimit = 5000;
//consists of move the 7 move parameters
var moveAlgorithm = {};
//set to highest rate move 
var inspectMoveSelection = false;

//GENETIC ALGORITHM VALUES
//stores number of genomes, init at 50 
var populationSize = 50;
//stores genomes
var genomes = [];
//index of current genome in genomes array
var currentGenome = -1;
//generation number
var generation = 0;
//stores values for a generation
var archive = {
	populationSize: 0,
	currentGeneration: 0,
	elites: [],
	genomes: []
};
//rate of mutation
var mutationRate = 0.05;
//helps calculate mutation
var mutationStep = 0.2;

/**
 * Returns the current game state in an object.
 * @return {State} The current game state.
 */
function getState() {
    var state = {
        grid: clone(grid),
        currentShape: clone(currentShape),
        rndSeed: clone(rndSeed),
        score: clone(score)
    };
    return state;
}

/**
 * Creates the initial population of genomes, each with random genes.
 */
function createInitialPopulation() {
    //inits the array
    genomes = [];
    //for a given population size
    for (var i = 0; i < populationSize; i++) {
        //randomly initialize the 7 values that make up a genome
        //these are all weight values that are updated through evolution
        var genome = {
            //unique identifier for a genome
            id: Math.random(),
            //The weight of each row cleared by the given move. the more rows that are cleared, the more this weight increases
            maxiumNumber: Math.random() - 0.5,
            //the absolute height of the highest column to the power of 1.5
            //added so that the algorithm can be able to detect if the blocks are stacking too high
            holes: Math.random() - 0.5,
        };
        //add them to the array
        genomes.push(genome);
    }
    evaluateNextGenome();
}

/**
 * Updates the game.
 */
function update() {
    //if we have our AI turned on and the current genome is nonzero
    //make a move
    if (currentGenome != -1) {
        //if that didn't do anything
        if (!results.moved) {
            //if we lost
            if (results.lose) {
                //update the fitness
                genomes[currentGenome].fitness = clone(score);
                //move on to the next genome
                evaluateNextGenome();
            } else {
                //if we didnt lose, make the next move
                makeNextMove();
            }
        }
    } else {
       //else just move down
        moveDown();
    }
    //output the state to the screen
    output();
    //and update the score
    updateScore();
}

/**
 * Evaluates the next genome in the population. If there is none, evolves the population.
 */
function evaluateNextGenome() {
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

/**
 * Makes a move, which is decided upon using the parameters in the current genome.
 */
function makeNextMove() {
    //increment number of moves taken
    movesTaken++;
    //if its over the limit of moves
    if (movesTaken > moveLimit) {
        //update this genomes fitness value using the game score
        genomes[currentGenome].fitness = clone(score);
        //and evaluates the next genome
        evaluateNextGenome();
    } else {
        //time to make a move

        //we're going to re-draw, so lets store the old drawing
        var oldDraw = clone(draw);
        draw = false;
        //get all the possible moves
        var possibleMoves = getAllPossibleMoves();
        //lets store the current state since we will update it
        var lastState = getState();
        //whats the next shape to play
        nextShape();
        //for each possible move 
        for (var i = 0; i < possibleMoves.length; i++) {
            //get the best move. so were checking all the possible moves, for each possible move. moveception.
            var nextMove = getHighestRatedMove(getAllPossibleMoves());
            //add that rating to an array of highest rates moves
            possibleMoves[i].rating += nextMove.rating;
        }
        //load current state
        loadState(lastState);
        //get the highest rated move ever
        var move = getHighestRatedMove(possibleMoves);
        //then rotate the shape as it says too
        for (var rotations = 0; rotations < move.rotations; rotations++) {
            rotateShape();
        }
        //and move left as it says
        if (move.translation < 0) {
            for (var lefts = 0; lefts < Math.abs(move.translation); lefts++) {
                moveLeft();
            }
            //and right as it says
        } else if (move.translation > 0) {
            for (var rights = 0; rights < move.translation; rights++) {
                moveRight();
            }
        }
        //update our move algorithm
        if (inspectMoveSelection) {
            moveAlgorithm = move.algorithm;
        }
        //and set the old drawing to the current
        draw = oldDraw;
        //output the state to the screen
        output();
        //and update the score
        updateScore();
    }
}

function reset(){
    // TODO
    if (//gamefinished
        true){
        //
    }
}

/**
 * Evolves the entire population and goes to the next generation.
 */
function evolve() {

    console.log("Generation " + generation + " evaluated.");
    //reset current genome for new generation
    currentGenome = 0;
    //increment generation
    generation++;
    //resets the game
    reset();
    //gets the current game state
    roundState = getState();
    //sorts genomes in decreasing order of fitness values
    genomes.sort(function(a, b) {
        return b.fitness - a.fitness;
    });
    //add a copy of the fittest genome to the elites list
    archive.elites.push(clone(genomes[0]));
    console.log("Elite's fitness: " + genomes[0].fitness);

    //remove the tail end of genomes, focus on the fittest
    while(genomes.length > populationSize / 2) {
        genomes.pop();
    }
    //sum of the fitness for each genome
    var totalFitness = 0;
    for (var i = 0; i < genomes.length; i++) {
        totalFitness += genomes[i].fitness;
    }

    //get a random index from genome array
   function getRandomGenome() {
       return genomes[randomWeightedNumBetween(0, genomes.length - 1)];
   }
   //create children array
   var children = [];
   //add the fittest genome to array
   children.push(clone(genomes[0]));
   //add population sized amount of children
   while (children.length < populationSize) {
       //crossover between two random genomes to make a child
       children.push(makeChild(getRandomGenome(), getRandomGenome()));
   }
   //create new genome array
   genomes = [];
   //to store all the children in
   genomes = genomes.concat(children);
   //store this in our archive
   archive.genomes = clone(genomes);
   //and set current gen
   archive.currentGeneration = clone(generation);
   console.log(JSON.stringify(archive));
   //store archive, thanks JS localstorage! (short term memory)
   localStorage.setItem("archive", JSON.stringify(archive));
}

/**
 * Creates a child genome from the given parent genomes, and then attempts to mutate the child genome.
 * @param  {Genome} mum The first parent genome.
 * @param  {Genome} dad The second parent genome.
 * @return {Genome}     The child genome.
 */
function makeChild(mum, dad) {
    //init the child given two genomes (its 7 parameters + initial fitness value)
    var child = {
        //unique id
        id : Math.random(),
        //all these params are randomly selected between the mom and dad genome
        maxiumNumber: randomChoice(mum.maxiumNumber, dad.maxiumNumber),
        holes: randomChoice(mum.holes, dad.holes),
        //no fitness. yet.
        fitness: -1
    };
    //mutation time!

    //we mutate each parameter using our mutationstep
    if (Math.random() < mutationRate) {
        child.maxiumNumber = child.maxiumNumber + Math.random() * mutationStep * 2 - mutationStep;
    }
    if (Math.random() < mutationRate) {
        child.holes = child.holes + Math.random() * mutationStep * 2 - mutationStep;
    }
    return child;
}