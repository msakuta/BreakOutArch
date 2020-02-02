BreakOutArch = new (function(){
'use strict';
var canvas;
var width;
var height;
var protectedHeight;
var engine;
var render;

var balls = [];
var blocks = [];
var paddles = [];

var score = 0;
var ballCount = 5;
var gameOver = false;
var ballCategory = Matter.Body.nextCategory();
var groundCategory = Matter.Body.nextCategory();
var wallCategory = Matter.Body.nextCategory();
var paddleCategory = Matter.Body.nextCategory();

window.addEventListener('load', function() {

	var Engine = Matter.Engine,
		Render = Matter.Render;

	// create an engine
	engine = Engine.create();
	engine.world.gravity = {x: 0., y: 0.2};

	// create a renderer
	render = Render.create({
		element: document.getElementById("mat"),
		engine: engine,
		options: {
			width: 600,
			height: 600,
			wireframes: false,
			showDebug: true,
			// showVelocity: true,
			// showCollisions: true,
		}
	});

	canvas = render.canvas;
	if ( ! canvas || ! canvas.getContext ) {
		return false;
	}

	init();

	// run the engine
	Engine.run(engine);

	// run the renderer
	Render.run(render);
});

var paddleWidth = 60;
var paddleHeight = 20;

var blockWidth = 70;
var blockHeight = 20;
var blockRows = 3;
var blockColumns = 7;

var ballRadius = 10;

function init(){

	var World = Matter.World,
		Bodies = Matter.Bodies;

	var canvasRect = canvas.getBoundingClientRect();
	width = canvasRect.width;
	height = canvasRect.height;
	protectedHeight = height * 0.75;

	// paddles.push({name: "A", pos: [width / 2, 300], velo: [0. ,0.], balls: [], cooldown: 10});
	paddles = [Bodies.rectangle(width / 2, height * 3 / 4, 80, 20, {
		density: 0.001,
		frictionAir: 1.8,
		collisionFilter: {
			category: paddleCategory,
			mask: groundCategory | wallCategory | paddleCategory | ballCategory,
		}
	})];
	paddles[0].restitution = 1.;
	balls = [Bodies.circle(width / 2, height / 2, ballRadius, {
		frictionAir: 0.,
		collisionFilter: {
			category: ballCategory,
			mask: ballCategory | paddleCategory | wallCategory
		}
	})];
	var ground = Bodies.rectangle(width / 2, height + 50, width, 150, {
		isStatic: true,
		collisionFilter: {
			category: groundCategory,
			mask: paddleCategory | wallCategory,
		}
	});
	ground.restitution = 1.;
	var roof = Bodies.rectangle(width / 2, -50, width, 120, { isStatic: true, restitution: 1.,
		collisionFilter: {
			category: wallCategory
		}
	});
	roof.restitution = 1.;
	var leftWall = Bodies.rectangle(-100, height / 2, 250, height, { isStatic: true, restitution: 1.,
		collisionFilter: {
			category: wallCategory
		}
	});
	leftWall.restitution = 1.;
	var rightWall = Bodies.rectangle(width + 100, height / 2, 250, height, { isStatic: true, restitution: 1.,
		collisionFilter: {
			category: wallCategory
		}
	});
	rightWall.restitution = 1.;
	var mouseProxy = Bodies.circle(width / 2, height * 3 / 4, 0, {
		collisionFilter: {
			category: Matter.Body.nextCategory(),
			mask: 0
		},
		isStatic: true,
	})

	// add all of the bodies to the world
	World.add(engine.world, [...paddles, ...balls, ground, roof, leftWall, rightWall, mouseProxy]);

	var mouse = Matter.Mouse.create(render.canvas);
	console.log(mouse)

	var constraint = Matter.Constraint.create({
		bodyA: mouseProxy,
		bodyB: paddles[0],
		pointB: {x: paddleWidth / 2, y: 0},
		length: 0.,
		stiffness: 0.05
	})

	World.add(engine.world, constraint);

	Matter.Events.on(engine, "beforeUpdate", function(e){
		var body = paddles[0];
		var gravity = engine.world.gravity;
		var gravityScale = typeof gravity.scale !== 'undefined' ? gravity.scale : 0.001;
		body.force.x -= body.mass * gravity.x * gravityScale;
		body.force.y -= body.mass * gravity.y * gravityScale;

		for(var i = 0; i < balls.length; i++){
			var ball = balls[i];
			if(0 < ballCount){
				if(height < ball.position.y){
					ballCount--;
					Matter.Body.setPosition(ball, {x: width / 2, y: height / 2});
					Matter.Body.setVelocity(ball, {x: 0, y: 0});
				}
			}
			else if(height < ball.position.y){
				gameOver = true;
			}
		}
	});

	Matter.Events.on(render, "afterRender", function(e){
		var context = render.context;
		context.font = "20px Sans";
		context.fillStyle = "#fff";
		context.fillText("Score: " + score, 30, 30);
		context.fillText("Balls: " + ballCount, width - 100, 30);

		if(gameOver){
			context.font = "40px Sans";
			context.fillText("Game over", width / 2 - context.measureText("Game over").width / 2, height / 2);
		}
	});

	window.addEventListener("mousemove", function(evt){
		var rect = render.canvas.getBoundingClientRect();
		var pos = [
			Math.max(0, Math.min(rect.width-1, evt.clientX - rect.left)),
			Math.max(protectedHeight, Math.min(rect.height-1, evt.clientY - rect.top)),
		];
		Matter.Body.setPosition(mouseProxy, {x: pos[0], y: pos[1]});
	});

	function initBlocks(){
		for(var iy = 0; iy < blockRows; iy++){
			for(var ix = 0; ix < blockColumns; ix++){
				var body = Matter.Bodies.rectangle(
					(ix + 0.5 - blockColumns / 2) * (blockWidth) + width / 2,
					iy * (blockHeight) + 100,
					blockWidth - 1,
					blockHeight - 1,
					{
						isStatic: true,
						density: 0.001,
						collisionFilter: {
							category: ballCategory,
							mask: ballCategory,
						}
					}
					// color: "rgb(" + (Math.random() * 127) + ", " + (Math.random() * 127) + ", " + (Math.random() * 127) + ")"
				);
				body.restitution = 1.;
				body.render.strokeStyle = "#330000";
				body.render.fillStyle = "rgb(127, 191, " + (iy * 127) + ")";
				Matter.World.add(engine.world, body);
				blocks.push(body);
			}
		}
	}

	initBlocks();

	function checkBlocks(){
		var numDone = blocks.reduce(function(numDOne, block){
			return numDOne + !block.isStatic;
		}, 0);

		if(numDone === blocks.length){
			blocks.forEach(function(block){
				Matter.World.remove(engine.world, block);
			});
			initBlocks();
		}
	}

	Matter.Events.on(engine, "collisionStart", function(e){
		var pairs = e.pairs;
		for(var i = 0; i < pairs.length; i++){
			var pair = pairs[i];
			if(balls.includes(pair.bodyA) || balls.includes(pair.bodyA)){
				console.log("ball hits ");
			}
			if(balls.includes(pair.bodyA) && blocks.includes(pair.bodyB)){
				Matter.Body.setStatic(pair.bodyB, false);
				// Matter.Body.setDensity(pair.bodyB, 0.001);
				pair.bodyB.collisionFilter.mask = 0;
				pair.bodyB.render.fillStyle = 'rgba(255, 255, 63, 0.25)'
				score += 10;
				checkBlocks();
			}
			else if(balls.includes(pair.bodyB) && blocks.includes(pair.bodyA)){
				Matter.Body.setStatic(pair.bodyA, false);
				// Matter.Body.setDensity(pair.bodyA, 0.001);
				pair.bodyA.collisionFilter.mask = 0;
				pair.bodyA.render.fillStyle = 'rgba(255, 255, 63, 0.25)'
				// ["bodyA", "bodyB"].forEach(function(name){pair[name].render.fillStyle = 'rgba(255, 255, 63, 127)'});
				score += 10;
				checkBlocks();
			}
		}
	});
}

})();
