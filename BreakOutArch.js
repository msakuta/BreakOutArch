BreakOutArch = new (function(){
'use strict';
var canvas;
var width;
var height;
var protectedHeight;
var engine;

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
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies;

	// create an engine
	engine = Engine.create();
	engine.world.gravity = {x: 0., y: 0.2};

	// create a renderer
	var render = Render.create({
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
	var canvasRect = canvas.getBoundingClientRect();
	width = canvasRect.width;
	height = canvasRect.height;
	protectedHeight = height * 0.75;

	var paddles = [Bodies.rectangle(width / 2, height * 3 / 4, 80, 20, {
		density: 0.001,
		frictionAir: 1.8,
		collisionFilter: {
			category: paddleCategory,
			mask: groundCategory | wallCategory | paddleCategory | ballCategory,
		}
	})];
	paddles[0].restitution = 1.;
	balls = [0].map(function(i){return Bodies.circle(300 + 50 * i, 300, 10, {
		frictionAir: 0.,
		collisionFilter: {
			category: ballCategory,
			mask: ballCategory | paddleCategory | wallCategory
		}
	})});
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

var ballRadius = 5;

function init(){
	// paddles.push({name: "A", pos: [width / 2, 300], velo: [0. ,0.], balls: [], cooldown: 10});

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

	console.log(blocks);

	// for(var i = 0; i < 1; i++){
	// 	var target = paddles[Math.floor(Math.random() * paddles.length)];
	// 	balls.push({
	// 		pos: [target.pos[0], target.pos[1] + Math.random() * 200],
	// 		velo: [0, -15 * Math.random()],
	// 		color: "rgb(" + (Math.random() * 255) + ", " + (Math.random() * 255) + ", " + (Math.random() * 255) + ")"
	// 	});
	// }
}


function timerProc(){
	animate();
	draw();
}

function getPaddleRect(paddle){
	var {pos} = paddle;
	return [pos[0] - paddleWidth / 2, pos[1] - paddleHeight / 2, pos[0] + paddleWidth / 2, pos[1] + paddleHeight / 2];
}

function getBlockRect(block){
	var {pos} = block;
	return [pos[0] - blockWidth / 2, pos[1] - blockHeight / 2, pos[0] + blockWidth / 2, pos[1] + blockHeight / 2];
}

function getBallBoundingRect(ball){
	var {pos} = ball;
	return [pos[0] - ballRadius, pos[1] - ballRadius, pos[0] + ballRadius, pos[1] + ballRadius];
}

var leftSide = 1;
var rightSide = 2;
var topSide = 4;
var bottomSide = 8;

/// Returns side of r1 as a bitfield
function rectIntersects(r1, r2){
	if(r1[0] <= r2[2] && r2[0] <= r1[2] && r1[1] <= r2[3] && r2[1] <= r1[3]){
		var side = [r2[2] - r1[0], r1[2] - r2[0], r2[3] - r1[1], r1[3] - r2[1]]
			.map((x, i) => [x, i]).reduce((r, a) => (r[0] > a[0] ? a : r))[1];
		return 1 << side;
	}
	else
		return 0;
}

function animate(){
	var accel = 1;

	for(var i = 0; i < balls.length;){
		var ball = balls[i];
		for(var j = 0; j < 2; j++)
			ball.pos[j] += ball.velo[j];
		ball.velo[1] += accel;

		function reactSides(sides){
			if(sides & leftSide && ball.velo[0] < 0)
				ball.velo[0] *= -1;
			if(sides & rightSide && 0 < ball.velo[0])
				ball.velo[0] *= -1;
			if(sides & topSide && ball.velo[1] < 0)
				ball.velo[1] *= -1;
			if(sides & bottomSide && 0 < ball.velo[1])
				ball.velo[1] *= -1;
		}

		for(var j = 0; j < paddles.length; j++){
			var sides = rectIntersects(getBallBoundingRect(ball), getPaddleRect(paddles[j]));
			reactSides(sides);
			if(sides){
				// Apply velocity of the paddle
				[0, 1].forEach(function(k){
					balls[i].velo[k] += paddles[j].velo[k];
				});
			}
		}

		for(var j = 0; j < blocks.length;){
			var sides = rectIntersects(getBallBoundingRect(ball), getBlockRect(blocks[j]));
			reactSides(sides);
			if(sides){
				blocks[j].health--;
				if(blocks[j].health <= 0){
					blocks.splice(j, 1);
					continue;
				}
			}
			j++;
		}

		if(height < ball.pos[1] && 0 < ball.velo[1]){
			ball.pos[1] = 0;
			ball.velo[1] = 0.;
		}
		else if(ball.pos[1] <= 0 && ball.velo[1] < 0){
			ball.pos[1] = 0;
			ball.velo[1] = 0.;
		}
		if(width < ball.pos[0] && 0 < ball.velo[0]){
			ball.velo[0] *= -1;
			ball.pos[0] = width;
		}
		else if(ball.pos[0] <= 0 && ball.velo[0] < 0){
			ball.pos[0] = 0;
			ball.velo[0] *= -1;
		}
		i++;
	}

	for(var i = 0; i < paddles.length; i++){
		var paddle = paddles[i];
		var elem = document.getElementById("debug");
		if(elem)
			elem.innerHTML = "velo: " + paddle.velo[0] + ", " + paddle.velo[1];
		paddle.velo = [0., 0.];
	}
}

function draw() {
	var ctx = canvas.getContext('2d');

	function drawPaddle(paddle){
		var pos = paddle.pos;

		ctx.strokeStyle = "#ff0000";
		ctx.fillStyle = "#331111";
		ctx.beginPath();
		ctx.rect(pos[0] - paddleWidth / 2, pos[1] - paddleHeight / 2, paddleWidth, paddleHeight);
		ctx.fill();
		ctx.stroke();
	}

	function drawBlock(block){
		var pos = block.pos;
		ctx.strokeStyle = "rgb(" + ((3 - block.health) / 2 * 255) + ", 0, 0)";
		ctx.fillStyle = block.color;
		ctx.beginPath();
		ctx.rect(pos[0] - blockWidth / 2, pos[1] - blockHeight / 2, blockWidth-1, blockHeight-1);
		ctx.fill();
		ctx.stroke();
	}

	function drawBall(ball){
		ctx.beginPath();
		ctx.arc(ball.pos[0], ball.pos[1], ballRadius, 0, 2*Math.PI);
		ctx.fillStyle = ball.color;
		ctx.fill();
		ctx.strokeStyle = "#000";
		ctx.stroke();
	}

	ctx.clearRect(0,0,width,height);

	for(var i = 0; i < paddles.length; i++)
		drawPaddle(paddles[i]);

	for(var i = 0; i < balls.length; i++){
		drawBall(balls[i]);
	}

	for(var i = 0; i < blocks.length; i++)
		drawBlock(blocks[i]);
}
})();
