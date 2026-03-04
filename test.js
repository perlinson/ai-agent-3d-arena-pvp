/**
 * 🎮 AI Agent 3D Arena PVP System - Tests
 */

const assert = require('assert');
const { ArenaRoom, ArenaPVPSystem, RankingSystem, Tournament } = require('./index.js');

console.log('🧪 开始测试 AI Agent 3D Arena PVP System...\n');

// 测试1: 创建竞技场房间
console.log('📋 测试1: 创建竞技场房间');
const room = new ArenaRoom('arena_1', {
    name: '测试竞技场',
    maxPlayers: 4,
    gameMode: 'ffa'
});
assert(room.roomId === 'arena_1');
assert(room.status === 'waiting');
console.log('✅ 房间创建成功\n');

// 测试2: 玩家加入房间
console.log('📋 测试2: 玩家加入房间');
const joinResult = room.addPlayer('player_1', {
    id: 'player_1',
    name: '🔵 玩家1',
    maxHealth: 100,
    maxMana: 50
});
assert(joinResult.success === true);
assert(room.players.size === 1);

const joinResult2 = room.addPlayer('player_2', {
    id: 'player_2',
    name: '🔴 玩家2',
    maxHealth: 100,
    maxMana: 50
});
assert(joinResult2.success === true);
assert(room.players.size === 2);
console.log('✅ 玩家加入成功\n');

// 测试3: 房间满员
console.log('📋 测试3: 房间满员测试');
room.maxPlayers = 2;
const fullResult = room.addPlayer('player_3', { id: 'player_3', name: '玩家3' });
assert(fullResult.success === false);
assert(fullResult.reason === '房间已满');
console.log('✅ 房间满员处理正确\n');

// 测试4: 开始比赛
console.log('📋 测试4: 开始比赛');
room.status = 'waiting';
room.maxPlayers = 4;
room.startMatch();
assert(room.status === 'playing');
assert(room.startTime !== null);
assert(room.players.get('player_1').alive === true);
console.log('✅ 比赛开始成功\n');

// 测试5: 伤害系统
console.log('📋 测试5: 伤害系统');
const damageResult = room.handleDamage('player_1', 'player_2', 30);
assert(damageResult.killed === false);
assert(damageResult.target === 'player_2');
assert(damageResult.health === 70);
console.log('✅ 伤害计算正确\n');

// 测试6: 击杀
console.log('📋 测试6: 击杀系统');
room.updatePlayer('player_2', { health: 100 });
const killResult = room.handleDamage('player_1', 'player_2', 150);
assert(killResult.killed === true);
assert(killResult.killer === 'player_1');
assert(room.players.get('player_2').alive === false);
assert(room.players.get('player_1').stats.kills === 1);
console.log('✅ 击杀系统正常\n');

// 测试7: 技能系统
console.log('📋 测试7: 技能系统');
room.updatePlayer('player_1', { mana: 50, rotation: { x: 0, y: 0, z: 0 } });

// 测试火球术
const fireballResult = room.useSkill('player_1', 'fireball');
assert(fireballResult.success === true);
assert(fireballResult.type === 'projectile');
assert(room.projectiles.length === 1);
console.log('✅ 火球术释放成功\n');

// 测试法力不足
const noManaResult = room.useSkill('player_1', 'lightning');
assert(noManaResult.success === false);
assert(noManaResult.reason === '法力不足');
console.log('✅ 法力检查正常\n');

// 测试治疗术
room.updatePlayer('player_1', { health: 30, mana: 50 });
const healResult = room.useSkill('player_1', 'heal');
assert(healResult.success === true);
assert(healResult.type === 'heal');
assert(room.players.get('player_1').health === 70);
console.log('✅ 治疗术生效\n');

// 测试8: 投射物更新
console.log('📋 测试8: 投射物更新');
room.updateProjectiles(0.1);
assert(room.projectiles.length === 1); // 火球还在
console.log('✅ 投射物更新正常\n');

// 测试9: BUFF系统
console.log('📋 测试9: BUFF系统');
room.updatePlayer('player_1', { mana: 50 });
const shieldResult = room.useSkill('player_1', 'shield');
assert(shieldResult.success === true);
assert(shieldResult.type === 'buff');
assert(room.players.get('player_1').buffs.includes('shield'));
console.log('✅ BUFF系统正常\n');

// 测试10: 排行榜
console.log('📋 测试10: 排行榜');
const leaderboard = room.getLeaderboard();
assert(leaderboard.length === 2);
assert(leaderboard[0].playerId === 'player_1'); // 1杀
console.log('✅ 排行榜计算正确\n');

// 测试11: 排位系统
console.log('📋 测试11: 排位系统');
const ranking = new RankingSystem();

const update1 = ranking.updateRanking('player_a', {
    kills: 5,
    deaths: 2,
    place: 1,
    totalPlayers: 10,
    wins: 1,
    losses: 0
});
assert(update1.change > 0); // 获胜加分
assert(update1.totalPoints > 1000);

const update2 = ranking.updateRanking('player_b', {
    kills: 1,
    deaths: 5,
    place: 10,
    totalPlayers: 10,
    wins: 0,
    losses: 1
});
assert(update2.change < 0); // 失败减分
console.log('✅ 排位系统正常\n');

// 测试12: 锦标赛系统
console.log('📋 测试12: 锦标赛系统');
const tournament = new Tournament({
    name: '🏆 春季大师赛',
    format: 'single'
});

tournament.register('p1', '玩家1');
tournament.register('p2', '玩家2');
tournament.register('p3', '玩家3');
tournament.register('p4', '玩家4');
assert(tournament.players.length === 4);

const startResult = tournament.start();
assert(startResult.success === true);
assert(startResult.rounds === 2); // 4人需要2轮
console.log('✅ 锦标赛创建成功\n');

// 测试13: 锦标赛匹配报告
console.log('📋 测试13: 锦标赛匹配报告');
const bracket = tournament.getBracket();
assert(bracket.rounds.length === 2);
assert(bracket.rounds[0].matches.length === 2);
console.log('✅ 锦标赛Bracket生成正确\n');

// 测试14: PVP系统整合
console.log('📋 测试14: PVP系统整合');
const pvpSystem = new ArenaPVPSystem();

// 创建房间
const createResult = pvpSystem.createRoom('room1', { name: '主竞技场', gameMode: 'ffa' });
assert(createResult.success === true);

// 加入房间
const joinRoomResult = pvpSystem.joinRoom('room1', 'agent_1', {
    id: 'agent_1',
    name: '🤖 AI Agent 1',
    maxHealth: 100,
    maxMana: 50
});
assert(joinRoomResult.success === true);

const joinRoomResult2 = pvpSystem.joinRoom('room1', 'agent_2', {
    id: 'agent_2',
    name: '🤖 AI Agent 2',
    maxHealth: 100,
    maxMana: 50
});
assert(joinRoomResult2.success === true);

// 开始比赛
const startMatchResult = pvpSystem.startMatch('room1');
assert(startMatchResult.success === true);

// 使用技能
const skillResult = pvpSystem.useSkill('room1', 'agent_1', 'fireball');
assert(skillResult.success === true);

// 获取房间状态
const roomState = pvpSystem.getRoom('room1');
assert(roomState.status === 'playing');
console.log('✅ PVP系统整合正常\n');

// 测试15: 仪表盘
console.log('📋 测试15: 仪表盘');
const dashboard = pvpSystem.getDashboard();
assert(dashboard.activeRooms === 1);
assert(dashboard.totalPlayers === 2);
assert(dashboard.playing === 1);
console.log('✅ 仪表盘数据正确\n');

console.log('='.repeat(50));
console.log('🎉 所有测试通过! (15/15)');
console.log('='.repeat(50));
