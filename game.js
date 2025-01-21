class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.difficultyButtons = document.getElementById('difficultyButtons');
        
        this.setupCanvas();
        this.setupEventListeners();
        
        // 粒子系统
        this.particles = [];
        this.particleColors = ['#ff0', '#f0f', '#0ff', '#ff4444'];
        
        // 游戏配置
        this.difficulties = {
            easy: { baseSpeed: 150, boostSpeed: 60 },
            medium: { baseSpeed: 120, boostSpeed: 45 },
            hard: { baseSpeed: 90, boostSpeed: 35 }
        };
        this.currentDifficulty = 'medium';
        this.isBoost = false;
        this.touchStartTime = 0;
        this.longPressThreshold = 300; // 长按阈值（毫秒）
        
        // 初始状态下不启动游戏循环
        this.isGameRunning = false;
    }

    setupCanvas() {
        // 检测设备类型
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // 计算可用空间，预留一些边距
        const maxWidth = window.innerWidth - (isMobile ? 20 : 40); // 移动端边距改为10px
        const maxHeight = window.innerHeight - (isMobile ? 200 : 160); // 移动端预留200px空间（包括顶部信息栏和底部虚拟键盘）
        
        let canvasWidth, canvasHeight;
        
        if (isMobile) {
            // 移动端使用9:16比例
            const aspectRatio = 9 / 16;
            canvasWidth = Math.min(maxWidth, maxHeight * aspectRatio);
            canvasHeight = canvasWidth / aspectRatio;
        } else {
            // PC端使用16:9比例
            const aspectRatio = 16 / 9;
            canvasHeight = Math.min(maxHeight, maxWidth / aspectRatio);
            canvasWidth = canvasHeight * aspectRatio;
        }
        
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        // 动态计算网格大小，确保网格数量适中
        const gridCount = 30;
        this.gridSize = Math.floor(Math.min(canvasWidth, canvasHeight) / gridCount);
        this.cols = Math.floor(canvasWidth / this.gridSize);
        this.rows = Math.floor(canvasHeight / this.gridSize);
    }

    initGame() {
        this.score = 0;
        this.direction = 'right';
        this.nextDirection = 'right';
        
        this.snake = [
            {x: 3, y: Math.floor(this.rows/2)},
            {x: 2, y: Math.floor(this.rows/2)},
            {x: 1, y: Math.floor(this.rows/2)}
        ];
        
        this.generateFood();
        this.gameSpeed = this.difficulties[this.currentDifficulty].baseSpeed;
        this.lastTime = 0;
        this.scoreElement.textContent = `分数: ${this.score}`;
    }

    generateFood() {
        do {
            this.food = {
                x: Math.floor(Math.random() * this.cols),
                y: Math.floor(Math.random() * this.rows)
            };
        } while (this.snake.some(segment => 
            segment.x === this.food.x && segment.y === this.food.y));
    }

    setupEventListeners() {
        // 难度选择
        this.difficultyButtons.addEventListener('click', (e) => {
            const button = e.target;
            if (button.classList.contains('difficulty-button')) {
                this.currentDifficulty = button.dataset.difficulty;
                this.difficultyButtons.style.display = 'none';
                document.querySelector('.instructions').style.display = 'none';
                this.initGame();
                if (!this.isGameRunning) {
                    this.isGameRunning = true;
                    this.gameLoop();
                }
            }
        });

        // 虚拟游戏手柄控制
        const controls = document.querySelectorAll('.control-button');
        let controlPressStartTime = 0;

        controls.forEach(control => {
            control.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.isGameRunning) {
                    controlPressStartTime = Date.now();
                    const direction = control.className.split(' ')[1].replace('control-', '');
                    this.handleControlPress(direction);
                }
            });

            control.addEventListener('touchend', () => {
                if (this.isBoost) {
                    this.isBoost = false;
                    this.gameSpeed = this.difficulties[this.currentDifficulty].baseSpeed;
                }
                controlPressStartTime = 0;
            });
        });

        // 检查长按
        const checkLongPress = () => {
            if (controlPressStartTime && Date.now() - controlPressStartTime >= this.longPressThreshold && !this.isBoost) {
                this.isBoost = true;
                this.gameSpeed = this.difficulties[this.currentDifficulty].boostSpeed;
            }
            requestAnimationFrame(checkLongPress);
        };
        checkLongPress();

        // 键盘控制
        let keyPressStartTime = 0;
        const keyPressThreshold = 300; // 长按阈值（毫秒）

        document.addEventListener('keydown', (e) => {
            if (this.isGameRunning) {
                if (!keyPressStartTime) {
                    keyPressStartTime = Date.now();
                }
                this.handleKeyPress(e.key);
                
                // 检查长按
                if (Date.now() - keyPressStartTime >= keyPressThreshold && !this.isBoost) {
                    this.isBoost = true;
                    this.gameSpeed = this.difficulties[this.currentDifficulty].boostSpeed;
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (this.isBoost) {
                this.isBoost = false;
                this.gameSpeed = this.difficulties[this.currentDifficulty].baseSpeed;
            }
            keyPressStartTime = 0;
        });

        // 触摸控制
        let touchStartX = 0;
        let touchStartY = 0;

        let longPressTimer;

        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            this.touchStartTime = Date.now();
            
            // 设置长按检测定时器
            longPressTimer = setTimeout(() => {
                this.isBoost = true;
                this.gameSpeed = this.difficulties[this.currentDifficulty].boostSpeed;
            }, this.longPressThreshold);
            
            e.preventDefault();
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const touchDuration = Date.now() - this.touchStartTime;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // 处理方向
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0 && this.direction !== 'left') {
                    this.nextDirection = 'right';
                } else if (deltaX < 0 && this.direction !== 'right') {
                    this.nextDirection = 'left';
                }
            } else {
                if (deltaY > 0 && this.direction !== 'up') {
                    this.nextDirection = 'down';
                } else if (deltaY < 0 && this.direction !== 'down') {
                    this.nextDirection = 'up';
                }
            }

            // 清除长按定时器并重置加速状态
            clearTimeout(longPressTimer);
            this.isBoost = false;
            this.gameSpeed = this.difficulties[this.currentDifficulty].baseSpeed;
            e.preventDefault();
        });

        this.canvas.addEventListener('touchcancel', () => {
            clearTimeout(longPressTimer);
            this.isBoost = false;
            this.gameSpeed = this.difficulties[this.currentDifficulty].baseSpeed;
        });
    }

    handleKeyPress(key) {
        switch(key) {
            case 'ArrowUp':
                if (this.direction !== 'down') this.nextDirection = 'up';
                break;
            case 'ArrowDown':
                if (this.direction !== 'up') this.nextDirection = 'down';
                break;
            case 'ArrowLeft':
                if (this.direction !== 'right') this.nextDirection = 'left';
                break;
            case 'ArrowRight':
                if (this.direction !== 'left') this.nextDirection = 'right';
                break;
        }
    }

    handleControlPress(direction) {
        switch(direction) {
            case 'up':
                if (this.direction !== 'down') this.nextDirection = 'up';
                break;
            case 'down':
                if (this.direction !== 'up') this.nextDirection = 'down';
                break;
            case 'left':
                if (this.direction !== 'right') this.nextDirection = 'left';
                break;
            case 'right':
                if (this.direction !== 'left') this.nextDirection = 'right';
                break;
        }
    }

    update(timestamp) {
        if (timestamp - this.lastTime < this.gameSpeed) return;
        this.lastTime = timestamp;

        this.direction = this.nextDirection;
        const head = {...this.snake[0]};

        switch(this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // 检查碰撞
        if (this.checkCollision(head)) {
            this.gameOver();
            return;
        }

        this.snake.unshift(head);

        // 检查是否吃到食物
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.scoreElement.textContent = `分数: ${this.score}`;
            // 创建爆炸效果
            this.createExplosion(this.food.x * this.gridSize + this.gridSize/2, 
                               this.food.y * this.gridSize + this.gridSize/2);
            this.generateFood();
            this.gameSpeed = Math.max(50, 150 - Math.floor(this.score / 100) * 10);
        } else {
            this.snake.pop();
        }
    }

    checkCollision(head) {
        // 检查墙壁碰撞
        if (head.x < 0 || head.x >= this.cols || 
            head.y < 0 || head.y >= this.rows) {
            return true;
        }

        // 检查自身碰撞
        return this.snake.some(segment => 
            segment.x === head.x && segment.y === head.y);
    }

    createExplosion(x, y) {
        for (let i = 0; i < 30; i++) {
            const speed = 2 + Math.random() * 3;
            const angle = Math.random() * Math.PI * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 3,
                color: this.particleColors[Math.floor(Math.random() * this.particleColors.length)],
                life: 1.0
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 更新和绘制粒子
        this.updateParticles();
        this.drawParticles();

        // 绘制蛇
        this.snake.forEach((segment, index) => {
            const gradient = this.ctx.createLinearGradient(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                (segment.x + 1) * this.gridSize,
                (segment.y + 1) * this.gridSize
            );
            
            gradient.addColorStop(0, `hsl(${200 + index * 5}, 100%, 50%)`);
            gradient.addColorStop(1, `hsl(${200 + index * 5}, 100%, 60%)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                this.gridSize - 1,
                this.gridSize - 1
            );
        });

        // 绘制食物
        this.ctx.fillStyle = '#ff4444';
        this.ctx.beginPath();
        this.ctx.arc(
            (this.food.x + 0.5) * this.gridSize,
            (this.food.y + 0.5) * this.gridSize,
            this.gridSize / 2 - 1,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
    }

    gameOver() {
        alert(`游戏结束！最终得分：${this.score}`);
        this.isGameRunning = false;
        this.difficultyButtons.style.display = 'flex';
        document.querySelector('.instructions').style.display = 'block';
    }

    gameLoop(timestamp) {
        if (!this.isGameRunning) return;
        this.update(timestamp);
        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}

// 当页面加载完成后启动游戏
window.onload = () => {
    new SnakeGame();
};