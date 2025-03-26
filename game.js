// Game constants
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 30;
const ENEMY_WIDTH = 30;
const ENEMY_HEIGHT = 30;
const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 15;
const ENEMY_ROWS = 5;
const ENEMY_COLS = 8;
const ENEMY_PADDING = 15;
const ENEMY_DROP_DISTANCE = 30;
const ENEMY_MOVE_INTERVAL = 1000; // ms
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;

// Game variables
let canvas, ctx;
let player, bullets, enemies;
let score = 0;
let gameOver = false;
let gameActive = false;
let enemyDirection = 1; // 1 for right, -1 for left
let lastEnemyMove = 0;
let animationId;
let canShoot = true;
let shootCooldown = 300; // ms
let lastShootTime = 0;
let lastTapTime = 0; // For mobile double-tap detection

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    resetGame();
    
    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.getElementById('startButton').addEventListener('click', startGame);
    
    // Initialize touch controls for mobile
    initTouchControls();
    
    // Initial render
    render();
}

// Reset game state
function resetGame() {
    // Create player
    player = {
        x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
        y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        speed: PLAYER_SPEED,
        isMovingLeft: false,
        isMovingRight: false
    };
    
    // Create bullets array
    bullets = [];
    
    // Create enemies
    createEnemies();
    
    // Reset score
    score = 0;
    document.getElementById('score').textContent = score;
    
    // Reset game state
    gameOver = false;
    gameActive = false;
    enemyDirection = 1;
    lastEnemyMove = 0;
}

// Create enemy grid
function createEnemies() {
    enemies = [];
    
    const startX = (CANVAS_WIDTH - (ENEMY_COLS * (ENEMY_WIDTH + ENEMY_PADDING))) / 2;
    const startY = 50;
    
    for (let row = 0; row < ENEMY_ROWS; row++) {
        for (let col = 0; col < ENEMY_COLS; col++) {
            enemies.push({
                x: startX + col * (ENEMY_WIDTH + ENEMY_PADDING),
                y: startY + row * (ENEMY_HEIGHT + ENEMY_PADDING),
                width: ENEMY_WIDTH,
                height: ENEMY_HEIGHT,
                row: row,
                col: col
            });
        }
    }
}

// Start the game
function startGame() {
    if (gameOver || !gameActive) {
        if (gameOver) {
            resetGame();
        }
        gameActive = true;
        animate();
    }
}

// Game loop
function animate(timestamp) {
    if (!gameActive) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Update game objects
    updatePlayer();
    updateBullets();
    updateEnemies(timestamp);
    
    // Check collisions
    checkCollisions();
    
    // Check win/lose conditions
    checkGameStatus();
    
    // Render game objects
    render();
    
    // Continue animation if game is active
    if (gameActive) {
        animationId = requestAnimationFrame(animate);
    }
}

// Update player position
function updatePlayer() {
    if (player.isMovingLeft && player.x > 0) {
        player.x -= player.speed;
    }
    
    if (player.isMovingRight && player.x < CANVAS_WIDTH - player.width) {
        player.x += player.speed;
    }
}

// Update bullets position
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= BULLET_SPEED;
        
        // Remove bullets that are off screen
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
        }
    }
}

// Update enemies position
function updateEnemies(timestamp) {
    if (!timestamp) return;
    
    // Move enemies at intervals
    if (timestamp - lastEnemyMove > ENEMY_MOVE_INTERVAL) {
        let moveDown = false;
        let leftMost = CANVAS_WIDTH;
        let rightMost = 0;
        
        // Find leftmost and rightmost enemies
        enemies.forEach(enemy => {
            leftMost = Math.min(leftMost, enemy.x);
            rightMost = Math.max(rightMost, enemy.x + enemy.width);
        });
        
        // Check if enemies hit the edge
        if (rightMost >= CANVAS_WIDTH && enemyDirection === 1) {
            enemyDirection = -1;
            moveDown = true;
        } else if (leftMost <= 0 && enemyDirection === -1) {
            enemyDirection = 1;
            moveDown = true;
        }
        
        // Move enemies
        enemies.forEach(enemy => {
            enemy.x += enemyDirection * 10;
            if (moveDown) {
                enemy.y += ENEMY_DROP_DISTANCE;
            }
        });
        
        lastEnemyMove = timestamp;
        
        // Increase speed as fewer enemies remain
        const remainingEnemies = enemies.length;
        const totalEnemies = ENEMY_ROWS * ENEMY_COLS;
        const speedFactor = 1 + (1 - remainingEnemies / totalEnemies) * 0.5;
    }
}

// Check for collisions
function checkCollisions() {
    // Check bullet-enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                // Collision detected
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                
                // Update score
                score += 10;
                document.getElementById('score').textContent = score;
                
                break;
            }
        }
    }
    
    // Check enemy-player collisions
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            // Game over if enemy collides with player
            endGame();
            return;
        }
        
        // Game over if enemies reach the bottom
        if (enemy.y + enemy.height >= player.y) {
            endGame();
            return;
        }
    }
}

// Check game status
function checkGameStatus() {
    // Win condition: all enemies destroyed
    if (enemies.length === 0) {
        // Level complete
        createEnemies();
        // Increase difficulty by speeding up enemy movement
        ENEMY_MOVE_INTERVAL *= 0.8;
    }
}

// End the game
function endGame() {
    gameActive = false;
    gameOver = true;
    cancelAnimationFrame(animationId);
    
    // Display game over message
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    
    ctx.font = '18px Arial';
    ctx.fillText('Click "Start Game" to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
}

// Render game objects
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw player
    ctx.fillStyle = '#30cfd0';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw player ship details
    ctx.fillStyle = '#107d7e';
    ctx.fillRect(player.x + player.width / 2 - 2, player.y - 5, 4, 5);
    
    // Draw bullets
    ctx.fillStyle = 'white';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // Draw enemies
    enemies.forEach(enemy => {
        // Different colors based on row
        const rowColors = ['#FF5252', '#FF7B52', '#FFB752', '#FFE552', '#B4FF52'];
        ctx.fillStyle = rowColors[enemy.row % rowColors.length];
        
        // Draw enemy body
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Draw enemy details
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(enemy.x + 5, enemy.y + 8, enemy.width - 10, enemy.height - 16);
        ctx.fillRect(enemy.x + 5, enemy.y + enemy.height - 8, enemy.width - 10, 4);
    });
    
    // Draw game over screen if game is over
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.fillStyle = 'white';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        
        ctx.font = '24px Arial';
        ctx.fillText(`Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        
        ctx.font = '18px Arial';
        ctx.fillText('Click "Start Game" to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    }
}

// Handle keyboard input
function handleKeyDown(e) {
    if (!gameActive) return;
    
    switch(e.key) {
        case 'ArrowLeft':
        case 'Left':
            player.isMovingLeft = true;
            break;
        case 'ArrowRight':
        case 'Right':
            player.isMovingRight = true;
            break;
        case ' ':
        case 'Spacebar':
            // Shoot
            shoot();
            e.preventDefault(); // Prevent page scrolling
            break;
    }
}

function handleKeyUp(e) {
    switch(e.key) {
        case 'ArrowLeft':
        case 'Left':
            player.isMovingLeft = false;
            break;
        case 'ArrowRight':
        case 'Right':
            player.isMovingRight = false;
            break;
    }
}

// Shoot a bullet
function shoot() {
    const now = Date.now();
    
    // Check cooldown
    if (now - lastShootTime < shootCooldown) {
        return;
    }
    
    // Create a new bullet
    bullets.push({
        x: player.x + player.width / 2 - BULLET_WIDTH / 2,
        y: player.y - BULLET_HEIGHT,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT
    });
    
    lastShootTime = now;
}

// Initialize touch controls for mobile devices
function initTouchControls() {
    // Left half of screen moves left
    const leftTouch = (e) => {
        e.preventDefault();
        player.isMovingLeft = true;
        player.isMovingRight = false;
    };
    
    // Right half of screen moves right
    const rightTouch = (e) => {
        e.preventDefault();
        player.isMovingRight = true;
        player.isMovingLeft = false;
    };
    
    // End touch
    const endTouch = (e) => {
        e.preventDefault();
        player.isMovingLeft = false;
        player.isMovingRight = false;
    };
    
    // Add touch event listeners
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const x = touch.clientX - canvas.getBoundingClientRect().left;
        
        if (x < CANVAS_WIDTH / 2) {
            leftTouch(e);
        } else {
            rightTouch(e);
        }
        
        // Double tap to shoot
        if (e.touches.length === 1 && e.timeStamp - lastTapTime < 300) {
            shoot();
        }
        lastTapTime = e.timeStamp;
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const x = touch.clientX - canvas.getBoundingClientRect().left;
        
        if (x < CANVAS_WIDTH / 2) {
            leftTouch(e);
        } else {
            rightTouch(e);
        }
    });
    
    canvas.addEventListener('touchend', endTouch);
    canvas.addEventListener('touchcancel', endTouch);
}

// Initialize the game when the page loads
window.addEventListener('load', init);