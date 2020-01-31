BreakOutArch = new (function(){
'use strict';
var canvas;
var width;
var height;
var protectedHeight;

window.addEventListener('load', function() {
	canvas = document.getElementById("scratch");
	if ( ! canvas || ! canvas.getContext ) {
		return false;
	}
	width = parseInt(canvas.style.width);
	height = parseInt(canvas.style.height);
	protectedHeight = height * 0.75;

	init();
	draw();

	window.addEventListener("mousemove", function(evt){
		var rect = canvas.getBoundingClientRect();
		var pos = [
			Math.max(0, Math.min(width-1, evt.clientX - rect.left)),
			Math.max(protectedHeight, Math.min(height-1, evt.clientY - rect.top)),
		];
		paddles[0].velo = paddles[0].pos.map(function(v, i){return pos[i] - v})
		paddles[0].pos = pos;
	});

	// Animate (framerate could be subject to discuss)
	window.setInterval(timerProc, 50);
});

var balls = [];
var blocks = [];
var paddles = [];

var paddleWidth = 60;
var paddleHeight = 20;

var blockWidth = 50;
var blockHeight = 15;
var blockRows = 3;
var blockColumns = 5;

var ballRadius = 5;

function init(){
	paddles.push({name: "A", pos: [width / 2, 300], velo: [0. ,0.], balls: [], cooldown: 10});

	for(var iy = 0; iy < blockRows; iy++){
		for(var ix = 0; ix < blockColumns; ix++){
			blocks.push({
				pos: [(ix + 0.5 - blockColumns / 2) * blockWidth + width / 2, iy * blockHeight + 100],
				health: 3,
				color: "rgb(" + (Math.random() * 127) + ", " + (Math.random() * 127) + ", " + (Math.random() * 127) + ")"
			});
		}
	}

	for(var i = 0; i < 1; i++){
		var target = paddles[Math.floor(Math.random() * paddles.length)];
		balls.push({
			pos: [target.pos[0], target.pos[1] + Math.random() * 200],
			velo: [0, -15 * Math.random()],
			color: "rgb(" + (Math.random() * 255) + ", " + (Math.random() * 255) + ", " + (Math.random() * 255) + ")"
		});
	}
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
