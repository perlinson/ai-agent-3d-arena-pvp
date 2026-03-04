# 🎮 AI Agent 3D Arena PVP System

> 多人竞技场系统 - 支持实时PVP、排位赛、锦标赛，专为AI Agent设计

## ✨ 特性

### 🏟️ 竞技场系统
- **多人房间** - 支持2-16玩家同时竞技
- **多种游戏模式** - 大逃杀(FFA)、团队战(Siege)
- **实时同步** - 位置、状态、战斗同步
- **地图系统** - 多种竞技场地图

### ⚔️ 战斗系统
- **6种主动技能** - 火球、冰箭、治疗、护盾、传送、闪电
- **伤害类型** - 物理、火、冰、雷系
- **BUFF系统** - 护盾、潮湿等状态效果
- **投射物系统** - 实时飞行弹道

### 🏆 排位系统
- **7大段位** - 青铜→白银→黄金→铂金→钻石→大师→传奇
- **积分计算** - 击杀、死亡、排名综合评分
- **连胜奖励** - 连胜额外加分
- **全球排行榜** - 前20名玩家

### 🎪 锦标赛系统
- **单淘汰赛** - 经典的淘汰赛制
- **循环赛** - 积分制比赛
- **Bracket生成** - 自动生成对阵表
- **观战系统** - 比赛进程实时查看

### 📊 数据统计
- **个人战绩** - 击杀、死亡、胜率、KDA
- **房间状态** - 实时玩家、投射物、BUFF
- **仪表盘** - 服务器全局状态

## 📖 使用方法

```javascript
const { ArenaPVPSystem, ArenaRoom, RankingSystem, Tournament } = require('./index.js');

// 创建PVP系统
const pvp = new ArenaPVPSystem();

// ===== 房间系统 =====

// 创建房间
pvp.createRoom('arena_1', {
    name: '🔥 死亡竞技场',
    maxPlayers: 8,
    gameMode: 'ffa',
    matchDuration: 300
});

// 玩家加入
pvp.joinRoom('arena_1', 'agent_1', {
    id: 'agent_1',
    name: '🤖 阿尔法',
    maxHealth: 100,
    maxMana: 50
});

pvp.joinRoom('arena_1', 'agent_2', {
    id: 'agent_2',
    name: '🤖 贝塔',
    maxHealth: 100,
    maxMana: 50
});

// 开始比赛
pvp.startMatch('arena_1');

// ===== 战斗系统 =====

// 使用技能
const result = pvp.useSkill('arena_1', 'agent_1', 'fireball');

// 攻击敌人
pvp.attack('arena_1', 'agent_1', 'agent_2', 25, 'physical');

// 更新玩家位置（游戏循环中）
pvp.updatePlayer('arena_1', 'agent_1', {
    position: { x: 5, y: 1, z: 3 },
    rotation: { x: 0, y: Math.PI / 4, z: 0 }
});

// ===== 游戏循环 =====
setInterval(() => {
    pvp.update(0.016); // 60fps
    
    const room = pvp.getRoom('arena_1');
    if (room.status === 'finished') {
        console.log('比赛结束！');
        console.log(room.getLeaderboard());
    }
}, 16);

// ===== 排位系统 =====

// 查看排位
const ranking = pvp.getRanking('agent_1');
console.log(ranking);
// { points: 1200, rank: { name: '黄金', icon: '🥇' }, wins: 10, ... }

// 全球排行榜
const leaderboard = pvp.getLeaderboard(20);

// ===== 锦标赛 =====

// 创建锦标赛
const tourney = pvp.createTournament({
    name: '🏆 AI大师赛',
    format: 'single'
});

// 报名
tourney.register('agent_1', '阿尔法');
tourney.register('agent_2', '贝塔');
tourney.register('agent_3', '伽马');
tourney.register('agent_4', '德尔塔');

// 开始
tourney.start();

// 报告结果
tourney.reportMatch(0, 0, 'agent_1'); // 第0轮第0场，agent_1获胜

// 查看Bracket
console.log(tourney.getBracket());

// ===== 仪表盘 =====
console.log(pvp.getDashboard());
```

## 🧪 运行测试

```bash
npm test
```

## 📊 测试结果

```
🎉 所有测试通过! (15/15)
```

## 🎯 技能说明

| 技能 | 法力消耗 | 冷却 | 效果 |
|------|----------|------|------|
| 🔥 火球 | 20 | 3s | 发射火球，造成30点火焰伤害 |
| ❄️ 冰箭 | 15 | 2s | 发射冰箭，造成20点冰冻伤害，减速目标 |
| 💚 治疗 | 25 | 8s | 恢复40点生命值 |
| 🛡️ 护盾 | 30 | 10s | 获得护盾，减免50%伤害，持续3秒 |
| ✨ 传送 | 35 | 15s | 传送到随机位置 |
| ⚡ 闪电 | 40 | 5s | 范围伤害，8米内所有敌人受到50点雷伤 |

## 🏆 排位段位

| 段位 | 最低积分 | 图标 |
|------|----------|------|
| 青铜 | 0 | 🥉 |
| 白银 | 500 | 🥈 |
| 黄金 | 1200 | 🥇 |
| 铂金 | 2000 | 💎 |
| 钻石 | 3500 | 🔮 |
| 大师 | 5000 | 👑 |
| 传奇 | 8000 | 🌟 |

## 🎮 游戏模式

- **FFA (大逃杀)** - 最后的存活者获胜
- **Team (团队战)** - 两队对抗
- **Siege (围城)** - 攻守模式

## 🔧 与3D框架集成

```javascript
const { GameFramework } = require('ai-agent-3d-game-framework');
const { ArenaPVPSystem } = require('ai-agent-3d-arena-pvp');

const game = new GameFramework({ name: '🎮 PVP竞技场' });
const pvp = new ArenaPVPSystem();

// 创建游戏世界
const level = game.createLevel({
    name: '竞技场',
    environment: 'cave'
});
game.loadLevel(level.id);

// 创建PVP房间
pvp.createRoom('main_arena', { maxPlayers: 8 });

// 游戏循环
function gameLoop() {
    // 更新PVP系统
    pvp.update(0.016);
    
    // 同步到Three.js
    const room = pvp.getRoom('main_arena');
    if (room) {
        for (const player of room.players) {
            // 更新3D模型位置
        }
    }
    
    requestAnimationFrame(gameLoop);
}
```

## 📦 导出模块

- `ArenaRoom` - 竞技场房间类
- `ArenaPVPSystem` - PVP系统主类
- `RankingSystem` - 排位系统
- `Tournament` - 锦标赛管理

## 🎉 创新点

- 🎯 首个AI Agent专属的多人PVP系统
- 🧠 完整的技能树和战斗机制
- 📊科学的排位积分算法
- 🎪 支持锦标赛和循环赛
- 💾 完整的数据持久化

---

*让AI Agent也能享受竞技对战的乐趣！*
