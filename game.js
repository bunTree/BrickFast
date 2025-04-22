// 游戏变量
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');

// 检查DOM元素是否正确获取
function checkDomElements() {
    console.log("检查DOM元素:");
    console.log("canvas:", canvas);
    console.log("ctx:", ctx);
    console.log("startButton:", startButton);
    console.log("pauseButton:", pauseButton);
    console.log("scoreElement:", scoreElement);
    console.log("livesElement:", livesElement);
    
    if (!canvas) {
        console.error("找不到canvas元素!");
        return false;
    }
    
    if (!ctx) {
        console.error("无法获取canvas上下文!");
        return false;
    }
    
    return true;
}

// 确保画布尺寸设置正确
function ensureCanvasSize() {
    // 如果画布没有设置尺寸，设置默认尺寸
    if (!canvas.width || canvas.width < 10) {
        canvas.width = 800;
    }
    if (!canvas.height || canvas.height < 10) {
        canvas.height = 600;
    }
    
    // 检查CSS尺寸是否影响实际尺寸
    const computedStyle = window.getComputedStyle(canvas);
    console.log("CSS尺寸:", computedStyle.width, "x", computedStyle.height);
    
    // 强制设置canvas尺寸
    canvas.width = parseInt(canvas.width);
    canvas.height = parseInt(canvas.height);
    
    console.log("画布尺寸已设置为:", canvas.width, "x", canvas.height);
}

// 游戏状态
let gameRunning = false;
let gamePaused = false;
let score = 0;
let lives = 3;
let level = 1;
let lastFrameTime = 0; // 用于计算帧率
let frameRate = 60; // 初始帧率
const MAX_BALLS = 30; // 限制最大球数量，防止卡顿
let debugMode = false; // 调试模式开关

// 挡板属性
const paddle = {
    width: 100,
    height: 20,
    x: 350,
    y: 550,
    speed: 8,
    dx: 0
};

// 球数组（支持多个球）
let balls = [];

// 初始化球
function createBall(x, y, dx, dy) {
    console.log("创建球，参数:", {x, y, dx, dy});
    
    // 固定球速为5
    const FIXED_BALL_SPEED = 5;
    
    // 创建新球对象
    const ball = {
        radius: 5,
        x: x !== undefined ? x : canvas.width / 2,
        y: y !== undefined ? y : paddle.y - 10,
        dx: dx !== undefined ? dx : 0,
        dy: dy !== undefined ? dy : -FIXED_BALL_SPEED,
        speed: FIXED_BALL_SPEED
    };
    
    // 如果提供了dx和dy，需要调整它们以确保总速度为FIXED_BALL_SPEED
    if (dx !== undefined || dy !== undefined) {
        const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        if (Math.abs(currentSpeed - FIXED_BALL_SPEED) > 0.1 && currentSpeed > 0) {
            const factor = FIXED_BALL_SPEED / currentSpeed;
            ball.dx *= factor;
            ball.dy *= factor;
        }
    }
    
    // 确保垂直方向速度不为0
    if (Math.abs(ball.dy) < 0.1) {
        ball.dy = -FIXED_BALL_SPEED;
    }
    
    // 确保球速总是FIXED_BALL_SPEED
    const finalSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    console.log("球创建完成，速度:", finalSpeed);
    
    return ball;
}

// 道具数组
let powerups = [];

// 道具类型
const POWERUP_TYPES = {
    SPLIT_BALL: 0,  // 球分裂
    MULTI_BALL: 1   // 从挡板发射多个球
};

// 道具参数
const POWERUP_CHANCE = 0.35; // 从0.25提高到0.35，增加道具生成概率
const POWERUP_SIZE = 20;
const POWERUP_SPEED = 2;
const POWERUP_COLORS = ['#FF00FF', '#00FFFF']; // 紫色和青色

// 砖块属性
const brickRowCount = 18; // 从15增加到18行
const brickColumnCount = 22; // 从20增加到22列
const brickWidth = 35; // 从38减少到35宽度
const brickHeight = 10; // 从12减少到10高度
const brickPadding = 2; // 保持砖块间距为2
const brickOffsetTop = 35; // 从40减少到35顶部偏移
// 计算砖块总宽度并居中显示
const totalBricksWidth = brickColumnCount * (brickWidth + brickPadding) - brickPadding;
const brickOffsetLeft = Math.max(5, (canvas.width - totalBricksWidth) / 2); // 动态计算左侧偏移，使砖块布局居中

// 性能优化参数
const MIN_FPS_THRESHOLD = 30; // 当FPS低于这个值时触发优化
const COLLISION_OPTIMIZATION_DISTANCE = 10; // 碰撞检测半径缓冲区

// 关卡配置 - 定义20个不同的砖块布局
const levelLayouts = [
    // 第1关 - 基本布局（所有砖块都存在）
    {
        name: "基本布局",
        pattern: (c, r) => true, // 默认全满
        rows: 15,
        cols: 20
    },
    // 第2关 - 双墙布局
    {
        name: "双墙",
        pattern: (c, r) => c < 4 || c > 15,
        rows: 15,
        cols: 20
    },
    // 第3关 - 交错布局
    {
        name: "交错",
        pattern: (c, r) => (c + r) % 2 === 0,
        rows: 15,
        cols: 20
    },
    // 第4关 - 金字塔
    {
        name: "金字塔",
        pattern: (c, r) => c >= r && c < 20 - r,
        rows: 15,
        cols: 20
    },
    // 第5关 - 倒金字塔
    {
        name: "倒金字塔",
        pattern: (c, r) => c <= r || c >= 19 - r,
        rows: 15,
        cols: 20
    },
    // 第6关 - 中空矩形
    {
        name: "中空矩形",
        pattern: (c, r) => !(c >= 4 && c <= 15 && r >= 3 && r <= 11),
        rows: 15,
        cols: 20
    },
    // 第7关 - 对角线
    {
        name: "对角线",
        pattern: (c, r) => c === r || c === 19 - r || (c === r - 1) || (c === 20 - r),
        rows: 15,
        cols: 20
    },
    // 第8关 - 棋盘
    {
        name: "棋盘",
        pattern: (c, r) => (c + r) % 2 === 0,
        rows: 15,
        cols: 20
    },
    // 第9关 - 同心矩形
    {
        name: "同心矩形",
        pattern: (c, r) => (r === 0 || r === 14 || c === 0 || c === 19) || 
                          (r === 4 && c >= 4 && c <= 15) || 
                          (r === 10 && c >= 4 && c <= 15) ||
                          (c === 4 && r >= 4 && r <= 10) ||
                          (c === 15 && r >= 4 && r <= 10),
        rows: 15,
        cols: 20
    },
    // 第10关 - 竖条纹
    {
        name: "竖条纹",
        pattern: (c, r) => c % 2 === 0,
        rows: 15,
        cols: 20
    },
    // 第11关 - 横条纹
    {
        name: "横条纹",
        pattern: (c, r) => r % 2 === 0,
        rows: 15,
        cols: 20
    },
    // 第12关 - Z形图案
    {
        name: "Z形图案",
        pattern: (c, r) => (r === 0) || (r === 14) || (r + c >= 13 && r + c <= 16),
        rows: 15,
        cols: 20
    },
    // 第13关 - 蜂窝形状
    {
        name: "蜂窝",
        pattern: (c, r) => ((c % 4 === 0) && (r % 3 === 0)) || 
                          ((c % 4 === 1) && (r % 3 === 1)) ||
                          ((c % 4 === 2) && (r % 3 === 2)) ||
                          ((c % 4 === 3) && (r % 3 === 0)),
        rows: 15,
        cols: 20
    },
    // 第14关 - 双半圆
    {
        name: "双半圆",
        pattern: (c, r) => {
            // 创建左右两个半圆形状
            const centerX1 = 5;
            const centerX2 = 14;
            const centerY = 7;
            const radius = 6;
            const dist1 = Math.sqrt(Math.pow(c - centerX1, 2) + Math.pow(r - centerY, 2));
            const dist2 = Math.sqrt(Math.pow(c - centerX2, 2) + Math.pow(r - centerY, 2));
            return dist1 <= radius || dist2 <= radius;
        },
        rows: 15,
        cols: 20
    },
    // 第15关 - 城堡
    {
        name: "城堡",
        pattern: (c, r) => {
            // 底部
            if (r === 14) return true;
            // 城墙和塔楼
            if (r === 8 && (c % 2 === 0)) return true;
            if (r === 7 && (c % 2 === 0)) return true;
            if (r === 5 && (c % 3 === 0)) return true;
            if (r === 4 && (c % 3 === 0)) return true;
            if (r === 2 && (c % 5 === 0)) return true;
            if (r === 1 && (c % 5 === 0)) return true;
            // 墙体
            if (r === 13 && c >= 1 && c <= 18) return true;
            if (r === 12 && c >= 1 && c <= 18) return true;
            if (r === 11 && c >= 1 && c <= 18) return true;
            if (r === 10 && ((c >= 1 && c <= 4) || (c >= 8 && c <= 11) || (c >= 15 && c <= 18))) return true;
            if (r === 9 && ((c >= 1 && c <= 4) || (c >= 8 && c <= 11) || (c >= 15 && c <= 18))) return true;
            return false;
        },
        rows: 15,
        cols: 20
    },
    // 第16关 - 星状图案
    {
        name: "星状",
        pattern: (c, r) => {
            // 中心十字形
            if (c === 10 || r === 7) return true;
            // 对角线
            if (Math.abs(c - 10) === Math.abs(r - 7) && Math.abs(c - 10) <= 5) return true;
            return false;
        },
        rows: 15,
        cols: 20
    },
    // 第17关 - 环形
    {
        name: "环形",
        pattern: (c, r) => {
            const centerX = 10;
            const centerY = 7;
            const dist = Math.sqrt(Math.pow(c - centerX, 2) + Math.pow(r - centerY, 2));
            return dist >= 3 && dist <= 6;
        },
        rows: 15,
        cols: 20
    },
    // 第18关 - 棋盘格加强版
    {
        name: "大棋盘",
        pattern: (c, r) => {
            // 交替的3x3格子
            return Math.floor(c/3) % 2 === Math.floor(r/3) % 2;
        },
        rows: 15,
        cols: 20
    },
    // 第19关 - V形
    {
        name: "多重V形",
        pattern: (c, r) => {
            return Math.abs(c - 10) === r || Math.abs(c - 10) === r - 7 || r === 14;
        },
        rows: 15,
        cols: 20
    },
    // 第20关 - 终极挑战 - 混合图案
    {
        name: "终极挑战",
        pattern: (c, r) => {
            // 螺旋形状
            const centerX = 10;
            const centerY = 7;
            const dist = Math.sqrt(Math.pow(c - centerX, 2) + Math.pow(r - centerY, 2));
            const angle = Math.atan2(r - centerY, c - centerX);
            const spiral = (dist / 1.8 + angle * 3 / Math.PI) % 2.5 < 1;
            
            // 边界
            const border = (c === 0 || c === 19 || r === 0 || r === 14);
            
            // 网格
            const grid = ((c + r) % 4 === 0);
            
            return spiral || border || grid;
        },
        rows: 15,
        cols: 20
    }
];

// 创建砖块
const bricks = [];
function createBricks() {
    // 获取当前关卡的布局配置 (关卡从1开始，数组索引从0开始)
    const layoutIndex = (level - 1) % levelLayouts.length;
    const currentLayout = levelLayouts[layoutIndex];
    
    const rows = currentLayout.rows;
    const cols = currentLayout.cols;
    
    // 重新计算每关的左侧偏移，以确保砖块居中
    const levelTotalWidth = cols * (brickWidth + brickPadding) - brickPadding;
    const levelOffsetLeft = Math.max(5, (canvas.width - levelTotalWidth) / 2);
    
    for (let c = 0; c < cols; c++) {
        bricks[c] = [];
        for (let r = 0; r < rows; r++) {
            // 根据当前关卡的模式确定砖块是否存在
            const exists = currentLayout.pattern(c, r);
            
            const brickX = c * (brickWidth + brickPadding) + levelOffsetLeft;
            const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
            
            // 不同行的砖块有不同的分数和颜色
            const type = r % 5;
            const colors = ['#FF5252', '#FF9800', '#FFEB3B', '#66BB6A', '#42A5F5'];
            const points = [7, 5, 3, 2, 1];
            
            bricks[c][r] = { 
                x: brickX, 
                y: brickY, 
                status: exists ? 1 : 0,  // 根据模式设置状态
                color: colors[type],
                points: points[type]
            };
        }
    }
}

// 创建道具
function createPowerup(x, y, type) {
    console.log(`创建道具 type=${type} (${type === POWERUP_TYPES.SPLIT_BALL ? "分裂球" : "多球发射"}) 在位置 x=${x}, y=${y}`);
    return {
        x: x,
        y: y,
        size: POWERUP_SIZE,
        type: type,
        speed: POWERUP_SPEED
    };
}

// 键盘控制挡板
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'F2') {
        debugMode = !debugMode;
        console.log(`调试模式: ${debugMode ? '开启' : '关闭'}`);
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 移动挡板
function movePaddle() {
    paddle.x += paddle.dx;
    
    // 挡板左右边界检测
    if (paddle.x < 0) {
        paddle.x = 0;
    } else if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

// 移动球
function moveBalls() {
    // 创建一个新数组来保存有效的球
    const activeBalls = [];
    
    // 如果球的数量超过最大限制，移除最旧的球
    if (balls.length > MAX_BALLS) {
        // 保留第一个球（原始球）和最新的球
        balls = [balls[0], ...balls.slice(-(MAX_BALLS-1))];
    }
    
    // 获取当前关卡的配置
    const layoutIndex = (level - 1) % levelLayouts.length;
    const currentLayout = levelLayouts[layoutIndex];
    const rows = currentLayout.rows;
    const cols = currentLayout.cols;
    
    // 创建一个缓存数组来存储活跃砖块的位置，加速碰撞检测
    const activeBricks = [];
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (bricks[c] && bricks[c][r] && bricks[c][r].status === 1) {
                activeBricks.push({col: c, row: r, brick: bricks[c][r]});
            }
        }
    }
    
    // 优化版本的球移动和碰撞检测
    balls.forEach(ball => {
        // 确保球速度不超过固定值
        const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        if (Math.abs(currentSpeed - ball.speed) > 0.1) {
            // 如果当前速度偏离了设定速度，进行调整
            const factor = ball.speed / currentSpeed;
            ball.dx *= factor;
            ball.dy *= factor;
        }
        
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // 球与墙壁碰撞检测
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
            // 确保球在边界内
            if (ball.x - ball.radius < 0) {
                ball.x = ball.radius;
            } else if (ball.x + ball.radius > canvas.width) {
                ball.x = canvas.width - ball.radius;
            }
        }
        
        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
            ball.y = ball.radius; // 确保球在边界内
        }
        
        // 球落地检测
        if (ball.y + ball.radius > canvas.height) {
            // 只有当所有球都落地时才减少生命值
            if (balls.length <= 1) {
                lives--;
                livesElement.textContent = lives;
                
                if (lives <= 0) {
                    gameOver();
                    return;
                }
                
                // 重置球和挡板位置
                resetBall();
                activeBalls.push(balls[0]); // 保留一个重置后的球
            }
            // 如果有多个球，这个球掉落后直接移除
        } else {
            // 球与挡板碰撞检测
            if (
                ball.y + ball.radius > paddle.y &&
                ball.y - ball.radius < paddle.y + paddle.height &&
                ball.x > paddle.x &&
                ball.x < paddle.x + paddle.width
            ) {
                // 确保球在挡板上方反弹
                ball.y = paddle.y - ball.radius;
                ball.dy = -Math.abs(ball.dy); // 强制向上反弹
                
                // 根据击中挡板的位置调整球的水平方向
                const hitPoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
                ball.dx = hitPoint * 5; // 调整反弹角度
                
                // 确保最小水平速度
                if (Math.abs(ball.dx) < 0.5) {
                    ball.dx = ball.dx > 0 ? 0.5 : -0.5;
                }
                
                // 确保球速度保持一致
                const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                if (Math.abs(currentSpeed - ball.speed) > 0.1) {
                    const factor = ball.speed / currentSpeed;
                    ball.dx *= factor;
                    ball.dy *= factor;
                }
            }
            
            // 球与砖块碰撞检测 - 使用更高效的优化方法
            let brickHit = false;
            
            // 使用预先计算的活跃砖块数组进行碰撞检测
            for (let i = 0; i < activeBricks.length && !brickHit; i++) {
                const {col, row, brick} = activeBricks[i];
                
                // 计算球和砖块中心点之间的距离
                const brickCenterX = brick.x + brickWidth / 2;
                const brickCenterY = brick.y + brickHeight / 2;
                const ballToBrickDistance = Math.sqrt(
                    Math.pow(ball.x - brickCenterX, 2) + 
                    Math.pow(ball.y - brickCenterY, 2)
                );
                
                // 快速距离检查 - 如果球与砖块中心点距离太远，跳过详细碰撞检测
                const maxDist = Math.sqrt(Math.pow(brickWidth/2 + ball.radius, 2) + 
                                          Math.pow(brickHeight/2 + ball.radius, 2));
                
                if (ballToBrickDistance > maxDist + COLLISION_OPTIMIZATION_DISTANCE) {
                    continue;
                }
                
                // 详细的AABB碰撞检测
                if (
                    ball.x + ball.radius > brick.x &&
                    ball.x - ball.radius < brick.x + brickWidth &&
                    ball.y + ball.radius > brick.y &&
                    ball.y - ball.radius < brick.y + brickHeight
                ) {
                    // 确定球从哪个方向碰到砖块
                    const overlapLeft = ball.x + ball.radius - brick.x;
                    const overlapRight = brick.x + brickWidth - (ball.x - ball.radius);
                    const overlapTop = ball.y + ball.radius - brick.y;
                    const overlapBottom = brick.y + brickHeight - (ball.y - ball.radius);
                    
                    // 找出最小的重叠，判断碰撞方向
                    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                    
                    if (minOverlap === overlapTop || minOverlap === overlapBottom) {
                        ball.dy = -ball.dy; // 垂直碰撞，反转垂直速度
                    } else {
                        ball.dx = -ball.dx; // 水平碰撞，反转水平速度
                    }
                    
                    // 碰撞后保持球速度一致
                    const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                    if (Math.abs(currentSpeed - ball.speed) > 0.1) {
                        const factor = ball.speed / currentSpeed;
                        ball.dx *= factor;
                        ball.dy *= factor;
                    }
                    
                    brick.status = 0;
                    activeBricks.splice(i, 1); // 从活跃砖块数组中移除
                    score += brick.points;
                    scoreElement.textContent = score;
                    
                    // 随机生成道具
                    if (Math.random() < POWERUP_CHANCE) {
                        const powerupType = Math.random() < 0.5 ? POWERUP_TYPES.SPLIT_BALL : POWERUP_TYPES.MULTI_BALL;
                        const newPowerup = createPowerup(brick.x + brickWidth/2, brick.y + brickHeight/2, powerupType);
                        powerups.push(newPowerup);
                        console.log(`砖块被击碎，生成了${powerupType === POWERUP_TYPES.SPLIT_BALL ? "分裂球" : "多球发射"}道具`);
                    }
                    
                    brickHit = true; // 避免一个球同时击中多个砖块
                }
            }
            
            // 保留当前球到活跃球列表
            activeBalls.push(ball);
        }
    });
    
    // 更新球数组为有效的球
    balls = activeBalls;
    
    // 确保至少有一个球
    if (balls.length === 0 && lives > 0) {
        resetBall();
    }
    
    // 检查是否所有砖块都被击碎
    if (activeBricks.length === 0) {
        levelUp();
    }
}

// 移动道具
function movePowerups() {
    const activePowerups = [];
    
    powerups.forEach(powerup => {
        powerup.y += powerup.speed;
        
        // 改进道具与挡板碰撞检测 - 使用更精确的矩形碰撞
        const powerupLeft = powerup.x - powerup.size/2;
        const powerupRight = powerup.x + powerup.size/2;
        const powerupTop = powerup.y - powerup.size/2;
        const powerupBottom = powerup.y + powerup.size/2;
        
        const paddleLeft = paddle.x;
        const paddleRight = paddle.x + paddle.width;
        const paddleTop = paddle.y;
        const paddleBottom = paddle.y + paddle.height;
        
        if (
            powerupRight > paddleLeft &&
            powerupLeft < paddleRight &&
            powerupBottom > paddleTop &&
            powerupTop < paddleBottom
        ) {
            // 激活道具效果
            console.log("道具被捕获:", powerup.type === POWERUP_TYPES.SPLIT_BALL ? "分裂球" : "多球发射");
            activatePowerup(powerup.type);
        } 
        // 移除落到屏幕外的道具
        else if (powerup.y < canvas.height) {
            activePowerups.push(powerup);
        }
    });
    
    powerups = activePowerups;
}

// 激活道具效果
function activatePowerup(type) {
    console.log("开始激活道具类型:", type);
    
    // 如果球数量已经达到上限，不再增加新球
    if (balls.length >= MAX_BALLS) {
        console.log("球数量已达上限，无法激活道具");
        return;
    }
    
    // 固定球速为5
    const FIXED_BALL_SPEED = 5;
    
    try {
        if (type === POWERUP_TYPES.SPLIT_BALL) {
            console.log("激活分裂球道具");
            // 分裂球效果：把每个现有的球分裂成3个
            const newBalls = [];
            const maxNewBalls = Math.min(balls.length, Math.floor(MAX_BALLS / 3));
            
            // 只处理部分球以避免产生太多球
            for (let i = 0; i < maxNewBalls; i++) {
                const ball = balls[i];
                // 保留原球
                newBalls.push(ball);
                
                // 如果总球数还没达到上限，添加新球
                if (newBalls.length + 2 <= MAX_BALLS) {
                    console.log("为球", i, "创建分裂球");
                    
                    // 第一个新球 - 左偏
                    const ball1 = createBall(
                        ball.x, 
                        ball.y, 
                        -3,  // 固定向左的分量
                        -4   // 固定向上的分量
                    );
                    
                    // 第二个新球 - 右偏
                    const ball2 = createBall(
                        ball.x, 
                        ball.y, 
                        3,   // 固定向右的分量
                        -4   // 固定向上的分量
                    );
                    
                    newBalls.push(ball1);
                    newBalls.push(ball2);
                    
                    console.log("成功添加2个分裂球");
                }
            }
            
            // 保留剩余的球
            if (maxNewBalls < balls.length) {
                newBalls.push(...balls.slice(maxNewBalls));
            }
            
            balls = newBalls.slice(0, MAX_BALLS);
            console.log("分裂球道具激活完成，当前球数量:", balls.length);
        } 
        else if (type === POWERUP_TYPES.MULTI_BALL) {
            console.log("激活多球发射道具");
            // 从挡板发射新球，但确保不超过最大球数量
            const remainingSlots = MAX_BALLS - balls.length;
            const numNewBalls = Math.min(3, remainingSlots);
            
            if (numNewBalls <= 0) {
                console.log("没有剩余球槽位，无法添加新球");
                return;
            }
            
            const paddleCenter = paddle.x + paddle.width / 2;
            let newBallsAdded = 0;
            
            if (numNewBalls >= 1) {
                // 中间球 - 直上
                const ball2 = createBall(
                    paddleCenter, 
                    paddle.y - 10, 
                    0, 
                    -FIXED_BALL_SPEED
                );
                balls.push(ball2);
                newBallsAdded++;
            }
            
            if (numNewBalls >= 2) {
                // 左侧球 - 左上
                const ball1 = createBall(
                    paddleCenter - 20, 
                    paddle.y - 10, 
                    -3, 
                    -4
                );
                balls.push(ball1);
                newBallsAdded++;
            }
            
            if (numNewBalls >= 3) {
                // 右侧球 - 右上
                const ball3 = createBall(
                    paddleCenter + 20, 
                    paddle.y - 10, 
                    3, 
                    -4
                );
                balls.push(ball3);
                newBallsAdded++;
            }
            
            console.log("多球道具激活完成，添加了", newBallsAdded, "个球，当前球数量:", balls.length);
        }
        
        // 检查所有球速度是否正确
        balls.forEach((ball, index) => {
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            if (Math.abs(speed - FIXED_BALL_SPEED) > 0.1) {
                console.warn(`球[${index}]速度异常(${speed})，进行修正`);
                // 如果速度不正确，重新规范化
                if (speed > 0) {
                    ball.dx = (ball.dx / speed) * FIXED_BALL_SPEED;
                    ball.dy = (ball.dy / speed) * FIXED_BALL_SPEED;
                } else {
                    // 如果速度为0，设置默认速度
                    ball.dx = 0;
                    ball.dy = -FIXED_BALL_SPEED;
                }
            }
        });
    } catch (e) {
        console.error("激活道具时出错:", e);
    }
}

// 检查关卡是否完成
function checkLevelComplete() {
    // 获取当前关卡的布局配置
    const layoutIndex = (level - 1) % levelLayouts.length;
    const currentLayout = levelLayouts[layoutIndex];
    
    const rows = currentLayout.rows;
    const cols = currentLayout.cols;
    
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (bricks[c][r].status === 1) {
                return false;
            }
        }
    }
    return true;
}

// 重置球的位置
function resetBall() {
    console.log("重置球");
    
    // 完全清空现有球数组
    balls = [];
    
    // 创建一个新球，使用固定速度
    const FIXED_BALL_SPEED = 5;
    const newBall = {
        radius: 5,
        x: canvas.width / 2,
        y: paddle.y - 10,
        dx: 0,  // 初始水平速度为0
        dy: -FIXED_BALL_SPEED, // 固定垂直速度
        speed: FIXED_BALL_SPEED
    };
    
    // 添加到球数组
    balls.push(newBall);
    
    console.log("球已重置:", balls);
}

// 升级
function levelUp() {
    level++;
    
    // 判断是否完成所有关卡
    if (level > levelLayouts.length) {
        gameCompleted();
        return;
    }
    
    // 获取当前关卡配置
    const layoutIndex = (level - 1) % levelLayouts.length;
    const currentLayout = levelLayouts[layoutIndex];
    
    // 清空道具
    powerups = [];
    
    // 创建新砖块
    createBricks();
    
    // 显示升级信息
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '30px Arial';
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'center';
    ctx.fillText(`关卡 ${level}: ${currentLayout.name}`, canvas.width / 2, canvas.height / 2 - 50);
    ctx.fillText(`得分: ${score}`, canvas.width / 2, canvas.height / 2);
    
    // 显示关卡预览
    drawLevelPreview(canvas.width / 2, canvas.height / 2 + 80, currentLayout);
    
    gameRunning = false;
    
    // 暂停3秒后重置并开始新关卡
    setTimeout(() => {
        // 重置挡板位置
        paddle.x = (canvas.width - paddle.width) / 2;
        
        // 每关都重置为一个固定速度的新球
        resetBall();
        
        // 记录和验证当前球速
        const ball = balls[0];
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        console.log(`关卡${level}开始，球速度:`, speed);
        
        if (Math.abs(speed - 5) > 0.1) {
            console.warn("球速度异常，强制修正!");
            ball.dy = -5;
            ball.dx = 0;
        }
        
        gameRunning = true;
        update();
    }, 3000);
}

// 绘制关卡预览
function drawLevelPreview(centerX, centerY, layout) {
    const previewScale = 0.5;
    const previewWidth = layout.cols * (brickWidth + brickPadding) * previewScale;
    const previewHeight = layout.rows * (brickHeight + brickPadding) * previewScale;
    const startX = centerX - previewWidth / 2;
    const startY = centerY - previewHeight / 2;
    
    // 绘制预览背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(startX - 10, startY - 10, previewWidth + 20, previewHeight + 20);
    
    // 重新计算预览中的左偏移以确保居中
    const previewOffsetLeft = (previewWidth - (layout.cols * (brickWidth + brickPadding) - brickPadding) * previewScale) / 2;
    
    // 绘制砖块预览
    for (let c = 0; c < layout.cols; c++) {
        for (let r = 0; r < layout.rows; r++) {
            if (layout.pattern(c, r)) {
                const brickX = startX + c * (brickWidth + brickPadding) * previewScale + previewOffsetLeft;
                const brickY = startY + r * (brickHeight + brickPadding) * previewScale;
                
                const type = r % 5;
                const colors = ['#FF5252', '#FF9800', '#FFEB3B', '#66BB6A', '#42A5F5'];
                
                ctx.fillStyle = colors[type];
                ctx.fillRect(brickX, brickY, brickWidth * previewScale, brickHeight * previewScale);
                ctx.strokeStyle = '#FFF';
                ctx.strokeRect(brickX, brickY, brickWidth * previewScale, brickHeight * previewScale);
            }
        }
    }
}

// 游戏通关
function gameCompleted() {
    gameRunning = false;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '40px Arial';
    ctx.fillStyle = '#FFEB3B'; // 金色
    ctx.textAlign = 'center';
    ctx.fillText('恭喜通关!', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.font = '30px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText('你是打砖块大师!', canvas.width / 2, canvas.height / 2 + 50);
    
    startButton.textContent = '再玩一次';
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '30px Arial';
    ctx.fillStyle = '#FF5252';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = '#FFF';
    ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2 + 30);
    
    startButton.textContent = '重新开始';
}

// 绘制道具
function drawPowerups() {
    // 先确认道具数组是否有内容
    if (powerups.length > 0) {
        console.log(`绘制${powerups.length}个道具`);
    }
    
    powerups.forEach(powerup => {
        ctx.fillStyle = POWERUP_COLORS[powerup.type];
        ctx.beginPath();
        
        if (powerup.type === POWERUP_TYPES.SPLIT_BALL) {
            // 分裂球道具绘制为三角形
            ctx.moveTo(powerup.x, powerup.y - powerup.size / 2);
            ctx.lineTo(powerup.x - powerup.size / 2, powerup.y + powerup.size / 2);
            ctx.lineTo(powerup.x + powerup.size / 2, powerup.y + powerup.size / 2);
        } else {
            // 多球道具绘制为五角星
            const spikes = 5;
            const outerRadius = powerup.size / 2;
            const innerRadius = powerup.size / 4;
            
            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = Math.PI / spikes * i;
                const x = powerup.x + Math.sin(angle) * radius;
                const y = powerup.y + Math.cos(angle) * radius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.stroke();
        
        // 调试模式下显示道具碰撞盒
        if (debugMode) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.strokeRect(
                powerup.x - powerup.size/2,
                powerup.y - powerup.size/2,
                powerup.size,
                powerup.size
            );
        }
    });
}

// 辅助函数：检查球对象是否正确
function checkBalls() {
    console.log("检查球对象...");
    
    if (!Array.isArray(balls)) {
        console.error("balls不是数组!");
        balls = [];
        return false;
    }
    
    if (balls.length === 0) {
        console.warn("没有球!");
        return false;
    }
    
    let valid = true;
    
    balls.forEach((ball, index) => {
        if (!ball) {
            console.error(`球[${index}]为null或undefined!`);
            valid = false;
            return;
        }
        
        if (typeof ball.x !== 'number' || typeof ball.y !== 'number') {
            console.error(`球[${index}]坐标无效:`, ball);
            valid = false;
        }
        
        if (typeof ball.dx !== 'number' || typeof ball.dy !== 'number') {
            console.error(`球[${index}]速度无效:`, ball);
            valid = false;
        }
        
        if (typeof ball.radius !== 'number' || ball.radius <= 0) {
            console.error(`球[${index}]半径无效:`, ball);
            // 修复半径
            ball.radius = 5;
        }
    });
    
    console.log("球对象检查完成:", valid ? "有效" : "无效");
    return valid;
}

// 绘制游戏元素
function draw() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 检查球对象
    checkBalls();
    
    // 绘制挡板
    ctx.fillStyle = '#4a7bff';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    // 绘制所有球
    ctx.fillStyle = '#FFF';
    balls.forEach(ball => {
        if (!ball || typeof ball.radius !== 'number') {
            console.error("无效的球对象:", ball);
            return;
        }
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // 绘制砖块 - 采用优化方式，只绘制可视区域内的砖块
    const layoutIndex = (level - 1) % levelLayouts.length;
    const currentLayout = levelLayouts[layoutIndex];
    const rows = currentLayout.rows;
    const cols = currentLayout.cols;
    
    // 批量绘制砖块，减少状态切换
    const blocksByColor = {};
    
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (bricks[c] && bricks[c][r] && bricks[c][r].status === 1) {
                // 只处理在画布内的砖块
                const brick = bricks[c][r];
                if (
                    brick.x + brickWidth >= 0 && 
                    brick.x <= canvas.width && 
                    brick.y + brickHeight >= 0 && 
                    brick.y <= canvas.height
                ) {
                    // 按颜色分组砖块
                    if (!blocksByColor[brick.color]) {
                        blocksByColor[brick.color] = [];
                    }
                    blocksByColor[brick.color].push(brick);
                }
            }
        }
    }
    
    // 按颜色批量绘制砖块
    ctx.strokeStyle = '#FFF';
    for (const color in blocksByColor) {
        ctx.fillStyle = color;
        blocksByColor[color].forEach(brick => {
            ctx.fillRect(brick.x, brick.y, brickWidth, brickHeight);
            ctx.strokeRect(brick.x, brick.y, brickWidth, brickHeight);
        });
    }
    
    // 绘制道具
    drawPowerups();
    
    // 显示关卡信息
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'left';
    ctx.fillText(`关卡: ${level}/${levelLayouts.length}`, 20, 30);
    
    // 显示球的数量
    ctx.fillText(`球数量: ${balls.length}/${MAX_BALLS}`, 20, 50);
    
    // 显示当前球速度
    ctx.fillText(`球速度: 5.0`, 20, 70);
    
    // 显示帧率
    ctx.fillText(`FPS: ${Math.round(frameRate)}`, canvas.width - 80, 30);
    
    // 调试模式下显示额外信息
    if (debugMode) {
        ctx.fillText(`活跃砖块: ${countActiveBricks()}`, canvas.width - 130, 50);
    }
}

// 辅助函数：计算活跃砖块数量
function countActiveBricks() {
    let count = 0;
    const layoutIndex = (level - 1) % levelLayouts.length;
    const currentLayout = levelLayouts[layoutIndex];
    const rows = currentLayout.rows;
    const cols = currentLayout.cols;
    
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (bricks[c] && bricks[c][r] && bricks[c][r].status === 1) {
                count++;
            }
        }
    }
    return count;
}

// 游戏更新函数
function update(timestamp) {
    if (!gameRunning || gamePaused) {
        requestAnimationFrame(update);
        return;
    }
    
    // 计算帧率
    if (lastFrameTime) {
        const deltaTime = timestamp - lastFrameTime;
        frameRate = 1000 / deltaTime;
        
        // 如果帧率太低，减少球的数量以提高性能
        if (frameRate < MIN_FPS_THRESHOLD && balls.length > 5) {
            // 保留第一个球（原始球）和一些最新的球
            const targetBallCount = Math.max(5, Math.floor(balls.length * 0.6));
            balls = [balls[0], ...balls.slice(-(targetBallCount - 1))];
        }
    }
    lastFrameTime = timestamp;
    
    // 键盘控制
    paddle.dx = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        paddle.dx = -paddle.speed;
    } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        paddle.dx = paddle.speed;
    }
    
    // 确保ball数组中有球
    if (balls.length === 0) {
        resetBall();
    }
    
    movePaddle();
    moveBalls();
    movePowerups();
    draw();
    
    // 性能监控 - 仅在调试模式下显示
    if (debugMode && Math.random() < 0.01) {
        console.log(`帧率: ${frameRate.toFixed(1)} FPS, 球数量: ${balls.length}`);
    }
    
    requestAnimationFrame(update);
}

// 开始游戏
function startGame() {
    if (!gameRunning) {
        // 重置游戏状态
        gameRunning = true;
        gamePaused = false;
        score = 0;
        lives = 3;
        level = 1;
        scoreElement.textContent = score;
        livesElement.textContent = lives;
        
        // 清空道具
        powerups = [];
        
        // 确保挡板在正确的位置
        paddle.x = (canvas.width - paddle.width) / 2;
        
        // 创建砖块
        createBricks();
        
        // 重置球并确保速度正确
        resetBall();
        const ball = balls[0];
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        console.log("新游戏开始，初始球速度:", speed);
        
        // 确保球速正确
        if (Math.abs(speed - 5) > 0.1) {
            console.warn("球速度不正确，进行修正");
            ball.dx = 0;
            ball.dy = -5;
            ball.speed = 5;
        }
        
        // 调试输出
        console.log("游戏开始时球状态:", balls);
        
        // 开始游戏循环
        update();
        
        startButton.textContent = '重新开始';
    } else {
        // 重新开始游戏
        gameRunning = false;
        setTimeout(startGame, 100);
    }
}

// 暂停游戏
function togglePause() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    pauseButton.textContent = gamePaused ? '继续' : '暂停';
    
    if (!gamePaused) {
        update();
    }
}

// 事件监听
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

// 初始化
function init() {
    console.log("初始化游戏...");
    
    // 检查DOM元素
    if (!checkDomElements()) {
        console.error("DOM元素检查失败，游戏无法初始化!");
        alert("游戏初始化失败，请查看控制台获取更多信息");
        return;
    }
    
    // 确保画布尺寸正确
    ensureCanvasSize();
    
    // 设置初始值
    paddle.x = (canvas.width - paddle.width) / 2;
    paddle.y = canvas.height - 30;
    
    // 确保至少有一个初始球
    try {
        resetBall();
        console.log("初始球已创建:", balls);
    } catch (e) {
        console.error("创建球时出错:", e);
    }
    
    try {
        createBricks();
        console.log("砖块已创建");
    } catch (e) {
        console.error("创建砖块时出错:", e);
    }
    
    try {
        draw();
        console.log("游戏已绘制");
    } catch (e) {
        console.error("绘制游戏时出错:", e);
    }
    
    // 打印调试信息
    console.log("初始球状态:", balls);
    console.log("画布尺寸:", canvas.width, "x", canvas.height);
    console.log("砖块布局宽度:", totalBricksWidth, "左偏移:", brickOffsetLeft);
}

// 页面加载完成后立即初始化游戏
window.addEventListener('load', function() {
    console.log("页面加载完成，开始初始化游戏...");
    setTimeout(init, 100); // 延迟一点时间确保DOM完全加载
});