/**
 * 🎮 AI Agent 3D Arena PVP System
 * 
 * 多人竞技场系统 - 支持实时PVP、排位赛、锦标赛
 * 专为AI Agent设计的多人对战框架
 */

class ArenaRoom {
    constructor(roomId, config = {}) {
        this.roomId = roomId;
        this.name = config.name || '竞技场';
        this.maxPlayers = config.maxPlayers || 4;
        this.gameMode = config.gameMode || 'ffa'; // ffa, team, siege
        this.map = config.map || 'arena_1';
        this.status = 'waiting'; // waiting, starting, playing, finished
        this.players = new Map();
        this.projectiles = [];
        this.startTime = null;
        this.matchDuration = config.matchDuration || 300; // 5分钟
        this.createdAt = Date.now();
        
        // 战斗统计
        this.kills = new Map();
        this.deaths = new Map();
        this.damage = new Map();
    }

    addPlayer(playerId, playerData) {
        if (this.players.size >= this.maxPlayers) {
            return { success: false, reason: '房间已满' };
        }
        
        this.players.set(playerId, {
            ...playerData,
            joinedAt: Date.now(),
            alive: true,
            health: playerData.maxHealth || 100,
            mana: playerData.maxMana || 50,
            position: { x: 0, y: 1, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stats: {
                kills: 0,
                deaths: 0,
                damage: 0,
                healing: 0
            },
            buffs: [],
            cooldowns: {}
        });
        
        this.kills.set(playerId, 0);
        this.deaths.set(playerId, 0);
        this.damage.set(playerId, 0);
        
        return { success: true };
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        this.players.delete(playerId);
        this.kills.delete(playerId);
        this.deaths.delete(playerId);
        this.damage.delete(playerId);
        
        // 清理该玩家的投射物
        this.projectiles = this.projectiles.filter(p => p.ownerId !== playerId);
        
        return player;
    }

    startMatch() {
        this.status = 'playing';
        this.startTime = Date.now();
        
        // 重置所有玩家状态
        for (const [playerId, player] of this.players) {
            player.alive = true;
            player.health = player.maxHealth || 100;
            player.mana = player.maxMana || 50;
            player.position = this.getSpawnPoint(playerId);
            player.stats = { kills: 0, deaths: 0, damage: 0, healing: 0 };
        }
        
        this.projectiles = [];
    }

    getSpawnPoint(playerId) {
        // 根据玩家ID生成不同的出生点
        const index = Array.from(this.players.keys()).indexOf(playerId);
        const angle = (index / this.players.size) * Math.PI * 2;
        const radius = 15;
        
        return {
            x: Math.cos(angle) * radius,
            y: 1,
            z: Math.sin(angle) * radius
        };
    }

    updatePlayer(playerId, updates) {
        const player = this.players.get(playerId);
        if (!player) return null;
        
        Object.assign(player, updates);
        return player;
    }

    handleDamage(attackerId, targetId, damage, damageType = 'physical') {
        const target = this.players.get(targetId);
        const attacker = this.players.get(attackerId);
        
        if (!target || !target.alive) return null;
        
        // 计算伤害
        let finalDamage = damage;
        
        // 伤害类型克制
        if (damageType === 'fire' && target.buffs.includes('wet')) {
            finalDamage *= 2;
        }
        
        // 护盾减伤
        if (target.buffs.includes('shield')) {
            finalDamage *= 0.5;
        }
        
        target.health -= finalDamage;
        
        if (attacker) {
            attacker.stats.damage += finalDamage;
            this.damage.set(attackerId, (this.damage.get(attackerId) || 0) + finalDamage);
        }
        
        // 检查死亡
        if (target.health <= 0) {
            target.alive = false;
            target.health = 0;
            target.deathsAt = Date.now();
            
            if (attacker) {
                attacker.stats.kills++;
                this.kills.set(attackerId, (this.kills.get(attackerId) || 0) + 1);
            }
            
            return {
                killed: true,
                killer: attackerId,
                victim: targetId,
                damage: finalDamage
            };
        }
        
        return {
            killed: false,
            target: targetId,
            health: target.health,
            damage: finalDamage
        };
    }

    addProjectile(projectile) {
        this.projectiles.push({
            ...projectile,
            id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: Date.now()
        });
    }

    updateProjectiles(deltaTime) {
        const speed = 30; // 单位/秒
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // 移动投射物
            proj.position.x += proj.velocity.x * deltaTime;
            proj.position.y += proj.velocity.y * deltaTime;
            proj.position.z += proj.velocity.z * deltaTime;
            
            // 检查碰撞
            for (const [playerId, player] of this.players) {
                if (playerId === proj.ownerId) continue;
                if (!player.alive) continue;
                
                const dx = proj.position.x - player.position.x;
                const dy = proj.position.y - player.position.y;
                const dz = proj.position.z - player.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (distance < 1) {
                    // 命中！
                    const result = this.handleDamage(proj.ownerId, playerId, proj.damage, proj.damageType);
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
            
            // 超时移除
            if (Date.now() - proj.createdAt > 5000) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    addBuff(playerId, buff, duration = 5000) {
        const player = this.players.get(playerId);
        if (!player) return false;
        
        player.buffs.push(buff);
        
        // 设置buff持续时间
        setTimeout(() => {
            const idx = player.buffs.indexOf(buff);
            if (idx > -1) player.buffs.splice(idx, 1);
        }, duration);
        
        return true;
    }

    useSkill(playerId, skillName) {
        const player = this.players.get(playerId);
        if (!player || !player.alive) return { success: false, reason: '玩家不存在或已死亡' };
        
        // 检查冷却
        if (player.cooldowns[skillName] && Date.now() < player.cooldowns[skillName]) {
            return { success: false, reason: '技能冷却中' };
        }
        
        // 技能定义
        const skills = {
            fireball: {
                manaCost: 20,
                damage: 30,
                damageType: 'fire',
                cooldown: 3000,
                projectile: true,
                speed: 25
            },
            icebolt: {
                manaCost: 15,
                damage: 20,
                damageType: 'ice',
                cooldown: 2000,
                projectile: true,
                speed: 30,
                slow: true
            },
            heal: {
                manaCost: 25,
                healing: 40,
                cooldown: 8000
            },
            shield: {
                manaCost: 30,
                cooldown: 10000,
                buff: 'shield',
                duration: 3000
            },
            teleport: {
                manaCost: 35,
                cooldown: 15000,
                effect: 'teleport'
            },
            lightning: {
                manaCost: 40,
                damage: 50,
                damageType: 'lightning',
                cooldown: 5000,
                aoe: true,
                radius: 8
            }
        };
        
        const skill = skills[skillName];
        if (!skill) return { success: false, reason: '技能不存在' };
        
        // 检查法力
        if (player.mana < skill.manaCost) {
            return { success: false, reason: '法力不足' };
        }
        
        player.mana -= skill.manaCost;
        player.cooldowns[skillName] = Date.now() + skill.cooldown;
        
        // 执行技能效果
        if (skill.healing) {
            player.health = Math.min(player.health + skill.healing, player.maxHealth || 100);
            player.stats.healing += skill.healing;
            return { success: true, type: 'heal', amount: skill.healing };
        }
        
        if (skill.buff) {
            this.addBuff(playerId, skill.buff, skill.duration);
            return { success: true, type: 'buff', buff: skill.buff };
        }
        
        if (skill.projectile) {
            // 创建投射物
            const dir = player.rotation;
            const velocity = {
                x: Math.sin(dir.y) * skill.speed,
                y: 0,
                z: Math.cos(dir.y) * skill.speed
            };
            
            this.addProjectile({
                ownerId: playerId,
                position: { ...player.position },
                velocity,
                damage: skill.damage,
                damageType: skill.damageType
            });
            
            return { success: true, type: 'projectile', skill: skillName };
        }
        
        if (skill.aoe) {
            // 范围伤害
            for (const [targetId, target] of this.players) {
                if (targetId === playerId || !target.alive) continue;
                
                const dx = target.position.x - player.position.x;
                const dz = target.position.z - player.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance <= skill.radius) {
                    this.handleDamage(playerId, targetId, skill.damage, skill.damageType);
                }
            }
            
            return { success: true, type: 'aoe', skill: skillName };
        }
        
        return { success: true };
    }

    checkMatchEnd() {
        if (this.status !== 'playing') return false;
        
        const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
        
        // 大逃杀模式：最后存活者获胜
        if (this.gameMode === 'ffa' && alivePlayers.length <= 1) {
            this.status = 'finished';
            return true;
        }
        
        // 团队模式：一队全灭
        if (this.gameMode === 'team') {
            const teams = {};
            for (const player of this.players.values()) {
                const team = player.team || 'red';
                teams[team] = teams[team] || 0;
                if (player.alive) teams[team]++;
            }
            
            const activeTeams = Object.values(teams).filter(n => n > 0);
            if (activeTeams.length === 1) {
                this.status = 'finished';
                return true;
            }
        }
        
        // 时间限制
        if (this.startTime && Date.now() - this.startTime > this.matchDuration * 1000) {
            this.status = 'finished';
            return true;
        }
        
        return false;
    }

    getLeaderboard() {
        const results = [];
        
        for (const [playerId, player] of this.players) {
            const score = player.stats.kills * 100 
                - player.stats.deaths * 50 
                + player.stats.damage / 10;
            
            results.push({
                playerId,
                name: player.name,
                score: Math.round(score),
                kills: player.stats.kills,
                deaths: player.stats.deaths,
                damage: Math.round(player.stats.damage),
                alive: player.alive,
                health: player.health
            });
        }
        
        return results.sort((a, b) => b.score - a.score);
    }

    getState() {
        return {
            roomId: this.roomId,
            name: this.name,
            status: this.status,
            gameMode: this.gameMode,
            map: this.map,
            players: Array.from(this.players.entries()).map(([id, p]) => ({
                id,
                name: p.name,
                alive: p.alive,
                health: p.health,
                mana: p.mana,
                position: p.position,
                rotation: p.rotation,
                buffs: p.buffs
            })),
            projectiles: this.projectiles.map(p => ({
                id: p.id,
                ownerId: p.ownerId,
                position: p.position,
                velocity: p.velocity
            })),
            matchTime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
            leaderboard: this.getLeaderboard()
        };
    }

    toJSON() {
        return {
            roomId: this.roomId,
            name: this.name,
            maxPlayers: this.maxPlayers,
            gameMode: this.gameMode,
            map: this.map,
            status: this.status,
            players: Array.from(this.players.keys()),
            createdAt: this.createdAt,
            startTime: this.startTime
        };
    }
}

class RankingSystem {
    constructor() {
        this.ranks = [
            { name: '青铜', minPoints: 0, icon: '🥉' },
            { name: '白银', minPoints: 500, icon: '🥈' },
            { name: '黄金', minPoints: 1200, icon: '🥇' },
            { name: '铂金', minPoints: 2000, icon: '💎' },
            { name: '钻石', minPoints: 3500, icon: '🔮' },
            { name: '大师', minPoints: 5000, icon: '👑' },
            { name: '传奇', minPoints: 8000, icon: '🌟' }
        ];
        
        this.playerRankings = new Map();
    }

    getRank(points) {
        for (let i = this.ranks.length - 1; i >= 0; i--) {
            if (points >= this.ranks[i].minPoints) {
                return this.ranks[i];
            }
        }
        return this.ranks[0];
    }

    updateRanking(playerId, matchResult) {
        const current = this.playerRankings.get(playerId) || {
            points: 1000,
            wins: 0,
            losses: 0,
            kills: 0,
            deaths: 0,
            matches: 0
        };
        
        current.matches++;
        current.kills += matchResult.kills;
        current.deaths += matchResult.deaths;
        
        // 计算得分变化
        let pointChange = 0;
        
        if (matchResult.place === 1) {
            pointChange = 100;
            current.wins++;
        } else if (matchResult.place <= 3) {
            pointChange = 50;
        } else if (matchResult.place <= 8) {
            pointChange = 20;
        } else if (matchResult.place > matchResult.totalPlayers / 2) {
            pointChange = -20;
        } else {
            pointChange = -50;
            current.losses++;
        }
        
        // 连胜奖励
        const winStreak = matchResult.wins - matchResult.losses;
        if (winStreak > 2) {
            pointChange += winStreak * 5;
        }
        
        current.points = Math.max(0, current.points + pointChange);
        
        this.playerRankings.set(playerId, current);
        
        return {
            before: this.getRank(current.points - pointChange),
            after: this.getRank(current.points),
            change: pointChange,
            totalPoints: current.points
        };
    }

    getLeaderboard(limit = 20) {
        const sorted = Array.from(this.playerRankings.entries())
            .map(([playerId, data]) => ({
                playerId,
                ...data,
                rank: this.getRank(data.points)
            }))
            .sort((a, b) => b.points - a.points)
            .slice(0, limit);
        
        return sorted;
    }

    getPlayerStats(playerId) {
        const data = this.playerRankings.get(playerId);
        if (!data) return null;
        
        return {
            ...data,
            rank: this.getRank(data.points),
            winRate: data.matches > 0 ? (data.wins / data.matches * 100).toFixed(1) : 0,
            kda: data.deaths > 0 ? (data.kills / data.deaths).toFixed(2) : data.kills.toString()
        };
    }

    toJSON() {
        return {
            rankings: Array.from(this.playerRankings.entries())
        };
    }

    static fromJSON(data) {
        const system = new RankingSystem();
        if (data && data.rankings) {
            system.playerRankings = new Map(data.rankings);
        }
        return system;
    }
}

class Tournament {
    constructor(config = {}) {
        this.tournamentId = `tourney_${Date.now()}`;
        this.name = config.name || '锦标赛';
        this.format = config.format || 'single'; // single, double, roundRobin
        this.status = 'registration'; // registration, running, finished
        this.players = [];
        this.rounds = [];
        this.currentRound = 0;
        this.winner = null;
        this.createdAt = Date.now();
    }

    register(playerId, playerName) {
        if (this.status !== 'registration') {
            return { success: false, reason: '报名已结束' };
        }
        
        if (this.players.find(p => p.id === playerId)) {
            return { success: false, reason: '已报名' };
        }
        
        this.players.push({
            id: playerId,
            name: playerName,
            seed: this.players.length + 1,
            wins: 0,
            losses: 0,
            score: 0
        });
        
        return { success: true, players: this.players.length };
    }

    start() {
        if (this.players.length < 2) {
            return { success: false, reason: '参赛人数不足' };
        }
        
        this.status = 'running';
        
        // 根据赛制生成对阵
        if (this.format === 'single') {
            this.generateSingleElimination();
        } else if (this.format === 'roundRobin') {
            this.generateRoundRobin();
        }
        
        return { success: true, rounds: this.rounds.length };
    }

    generateSingleElimination() {
        // 洗牌玩家
        const shuffled = [...this.players].sort(() => Math.random() - 0.5);
        
        // 计算轮数
        const rounds = Math.ceil(Math.log2(shuffled.length));
        const byes = Math.pow(2, rounds) - shuffled.length;
        
        this.rounds = [];
        
        for (let r = 0; r < rounds; r++) {
            const matches = [];
            const matchCount = Math.pow(2, rounds - r - 1);
            
            for (let m = 0; m < matchCount; m++) {
                const player1 = shuffled[m * 2] || null;
                const player2 = shuffled[m * 2 + 1] || (byes > 0 ? { id: 'bye', name: '轮空' } : null);
                
                matches.push({
                    matchId: `r${r}_m${m}`,
                    round: r,
                    match: m,
                    player1: player1?.id || null,
                    player2: player2?.id || null,
                    player1Name: player1?.name || 'TBD',
                    player2Name: player2?.name || 'TBD',
                    winner: player1 && !player2 ? player1.id : (player2 && !player1 ? player2.id : null),
                    status: !player1 || !player2 ? 'decided' : 'pending'
                });
            }
            
            this.rounds.push({
                round: r,
                name: r === rounds - 1 ? '决赛' : r === rounds - 2 ? '半决赛' : `第${r + 1}轮`,
                matches
            });
        }
    }

    generateRoundRobin() {
        const n = this.players.length;
        const rounds = n % 2 === 0 ? n - 1 : n;
        
        this.rounds = [];
        
        for (let r = 0; r < rounds; r++) {
            const matches = [];
            
            for (let i = 0; i < Math.floor(n / 2); i++) {
                const player1Index = (r + i) % (n - 1);
                const player2Index = (n - 1 - i + r) % (n - 1);
                
                if (i === 0 && n % 2 === 0) {
                    matches.push({
                        matchId: `r${r}_m${i}`,
                        round: r,
                        match: i,
                        player1: this.players[player1Index]?.id || null,
                        player2: this.players[n - 1]?.id || null,
                        player1Name: this.players[player1Index]?.name || 'TBD',
                        player2Name: this.players[n - 1]?.name || 'TBD',
                        status: 'pending'
                    });
                } else {
                    matches.push({
                        matchId: `r${r}_m${i}`,
                        round: r,
                        match: i,
                        player1: this.players[player1Index]?.id || null,
                        player2: this.players[player2Index]?.id || null,
                        player1Name: this.players[player1Index]?.name || 'TBD',
                        player2Name: this.players[player2Index]?.name || 'TBD',
                        status: 'pending'
                    });
                }
            }
            
            this.rounds.push({
                round: r,
                name: `第${r + 1}轮`,
                matches
            });
        }
    }

    reportMatch(round, match, winnerId) {
        const roundData = this.rounds[round];
        if (!roundData) return { success: false };
        
        const matchData = roundData.matches[match];
        if (!matchData) return { success: false };
        
        matchData.winner = winnerId;
        matchData.status = 'completed';
        
        // 更新玩家战绩
        const p1 = this.players.find(p => p.id === matchData.player1);
        const p2 = this.players.find(p => p.id === matchData.player2);
        
        if (p1) {
            if (winnerId === p1.id) {
                p1.wins++;
                if (p2) p2.losses++;
            } else {
                p1.losses++;
            }
        }
        
        if (p2) {
            if (winnerId === p2.id) {
                p2.wins++;
                if (p1) p1.losses++;
            } else {
                p2.losses++;
            }
        }
        
        // 晋级处理（单淘汰赛）
        if (this.format === 'single' && round < this.rounds.length - 1) {
            const nextRound = this.rounds[round + 1];
            const nextMatch = Math.floor(match / 2);
            const nextMatchData = nextRound.matches[nextMatch];
            
            if (match % 2 === 0) {
                nextMatchData.player1 = winnerId;
                nextMatchData.player1Name = this.players.find(p => p.id === winnerId)?.name || 'TBD';
            } else {
                nextMatchData.player2 = winnerId;
                nextMatchData.player2Name = this.players.find(p => p.id === winnerId)?.name || 'TBD';
            }
            
            if (nextMatchData.player1 && nextMatchData.player2) {
                nextMatchData.status = 'pending';
            }
        }
        
        // 检查是否全部完成
        const allCompleted = this.rounds.every(r => 
            r.matches.every(m => m.status === 'completed' || m.status === 'decided')
        );
        
        if (allCompleted) {
            this.status = 'finished';
            
            // 找出冠军
            if (this.format === 'single') {
                const final = this.rounds[this.rounds.length - 1].matches[0];
                this.winner = final.winner;
            } else {
                // 循环赛按胜率排名
                this.players.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
                this.winner = this.players[0]?.id;
            }
        }
        
        return { success: true, winner: winnerId };
    }

    getBracket() {
        return {
            tournamentId: this.tournamentId,
            name: this.name,
            format: this.format,
            status: this.status,
            players: this.players.length,
            rounds: this.rounds.map(r => ({
                name: r.name,
                matches: r.matches.map(m => ({
                    matchId: m.matchId,
                    player1: m.player1Name,
                    player2: m.player2Name,
                    winner: m.winner,
                    status: m.status
                }))
            })),
            winner: this.winner,
            standings: this.players.sort((a, b) => b.wins - a.wins || a.losses - b.losses)
        };
    }

    toJSON() {
        return {
            tournamentId: this.tournamentId,
            name: this.name,
            format: this.format,
            status: this.status,
            players: this.players,
            rounds: this.rounds,
            winner: this.winner,
            createdAt: this.createdAt
        };
    }
}

class ArenaPVPSystem {
    constructor(config = {}) {
        this.rooms = new Map();
        this.ranking = new RankingSystem();
        this.tournaments = new Map();
        this.playerRooms = new Map(); // playerId -> roomId
        this.config = {
            maxRooms: 100,
            defaultMatchDuration: 300,
            ...config
        };
        
        this.events = {
            playerJoin: [],
            playerLeave: [],
            matchStart: [],
            matchEnd: [],
            kill: [],
            tournamentStart: [],
            tournamentEnd: []
        };
    }

    // 事件系统
    on(event, callback) {
        if (this.events[event]) {
            this.events[event].push(callback);
        }
    }

    emit(event, data) {
        if (this.events[event]) {
            for (const callback of this.events[event]) {
                callback(data);
            }
        }
    }

    // 房间管理
    createRoom(roomId, config = {}) {
        if (this.rooms.size >= this.config.maxRooms) {
            return { success: false, reason: '服务器房间已满' };
        }
        
        if (this.rooms.has(roomId)) {
            return { success: false, reason: '房间ID已存在' };
        }
        
        const room = new ArenaRoom(roomId, {
            matchDuration: this.config.defaultMatchDuration,
            ...config
        });
        
        this.rooms.set(roomId, room);
        
        return { success: true, room: room.toJSON() };
    }

    joinRoom(roomId, playerId, playerData) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, reason: '房间不存在' };
        }
        
        if (room.status !== 'waiting') {
            return { success: false, reason: '比赛已开始' };
        }
        
        // 离开之前的房间
        this.leaveRoom(playerId);
        
        const result = room.addPlayer(playerId, playerData);
        
        if (result.success) {
            this.playerRooms.set(playerId, roomId);
            this.emit('playerJoin', { roomId, playerId, playerData });
        }
        
        return result;
    }

    leaveRoom(playerId) {
        const roomId = this.playerRooms.get(playerId);
        if (!roomId) return null;
        
        const room = this.rooms.get(roomId);
        if (room) {
            const player = room.removePlayer(playerId);
            this.emit('playerLeave', { roomId, playerId, player });
            
            // 房间为空则删除
            if (room.players.size === 0) {
                this.rooms.delete(roomId);
            }
        }
        
        this.playerRooms.delete(playerId);
        return { success: true };
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    getPlayerRoom(playerId) {
        const roomId = this.playerRooms.get(playerId);
        return roomId ? this.rooms.get(roomId) : null;
    }

    listRooms(filter = {}) {
        return Array.from(this.rooms.values())
            .filter(room => {
                if (filter.status && room.status !== filter.status) return false;
                if (filter.gameMode && room.gameMode !== filter.gameMode) return false;
                if (filter.hasSpace && room.players.size >= room.maxPlayers) return false;
                return true;
            })
            .map(room => ({
                roomId: room.roomId,
                name: room.name,
                status: room.status,
                gameMode: room.gameMode,
                players: room.players.size,
                maxPlayers: room.maxPlayers
            }));
    }

    // 比赛控制
    startMatch(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, reason: '房间不存在' };
        }
        
        if (room.players.size < 1) {
            return { success: false, reason: '至少需要1名玩家' };
        }
        
        room.startMatch();
        this.emit('matchStart', { roomId, players: Array.from(room.players.keys()) });
        
        return { success: true };
    }

    updatePlayer(roomId, playerId, updates) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        return room.updatePlayer(playerId, updates);
    }

    attack(roomId, attackerId, targetId, damage, damageType = 'physical') {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        const result = room.handleDamage(attackerId, targetId, damage, damageType);
        
        if (result && result.killed) {
            this.emit('kill', {
                roomId,
                killer: attackerId,
                victim: targetId,
                matchTime: room.matchTime
            });
        }
        
        return result;
    }

    useSkill(roomId, playerId, skillName) {
        const room = this.rooms.get(roomId);
        if (!room) return { success: false, reason: '房间不存在' };
        
        return room.useSkill(playerId, skillName);
    }

    // 游戏循环
    update(deltaTime) {
        for (const room of this.rooms.values()) {
            if (room.status === 'playing') {
                room.updateProjectiles(deltaTime);
                
                if (room.checkMatchEnd()) {
                    this.endMatch(room.roomId);
                }
            }
        }
    }

    endMatch(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        const leaderboard = room.getLeaderboard();
        
        // 更新排位
        const rankingUpdates = [];
        for (const entry of leaderboard) {
            const update = this.ranking.updateRanking(entry.playerId, {
                kills: entry.kills,
                deaths: entry.deaths,
                place: leaderboard.indexOf(entry) + 1,
                totalPlayers: leaderboard.length,
                wins: entry.kills,
                losses: entry.deaths
            });
            rankingUpdates.push({ playerId: entry.playerId, ...update });
        }
        
        room.status = 'finished';
        this.emit('matchEnd', { roomId, leaderboard, rankingUpdates });
        
        return {
            leaderboard,
            rankingUpdates,
            winner: leaderboard[0]?.playerId
        };
    }

    // 排位系统
    getRanking(playerId) {
        return this.ranking.getPlayerStats(playerId);
    }

    getLeaderboard(limit = 20) {
        return this.ranking.getLeaderboard(limit);
    }

    // 锦标赛系统
    createTournament(config = {}) {
        const tournament = new Tournament(config);
        this.tournaments.set(tournament.tournamentId, tournament);
        return tournament;
    }

    registerTournament(tournamentId, playerId, playerName) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament) return { success: false, reason: '锦标赛不存在' };
        
        return tournament.register(playerId, playerName);
    }

    startTournament(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament) return { success: false, reason: '锦标赛不存在' };
        
        const result = tournament.start();
        
        if (result.success) {
            this.emit('tournamentStart', { tournamentId, name: tournament.name });
        }
        
        return result;
    }

    reportTournamentMatch(tournamentId, round, match, winnerId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament) return { success: false };
        
        const result = tournament.reportMatch(round, match, winnerId);
        
        if (result.success && tournament.status === 'finished') {
            this.emit('tournamentEnd', {
                tournamentId,
                winner: result.winner,
                standings: tournament.players
            });
        }
        
        return result;
    }

    getTournament(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        return tournament ? tournament.getBracket() : null;
    }

    listTournaments(filter = {}) {
        return Array.from(this.tournaments.values())
            .filter(t => {
                if (filter.status && t.status !== filter.status) return false;
                return true;
            })
            .map(t => ({
                tournamentId: t.tournamentId,
                name: t.name,
                format: t.format,
                status: t.status,
                players: t.players.length,
                createdAt: t.createdAt
            }));
    }

    // 存档
    toJSON() {
        return {
            rooms: Array.from(this.rooms.entries()).map(([id, room]) => room.toJSON()),
            ranking: this.ranking.toJSON(),
            tournaments: Array.from(this.tournaments.entries()).map(([id, t]) => t.toJSON())
        };
    }

    static fromJSON(data) {
        const system = new ArenaPVPSystem();
        
        if (data && data.ranking) {
            system.ranking = RankingSystem.fromJSON(data.ranking);
        }
        
        // 恢复房间和锦标赛（简化处理）
        // 完整实现需要反序列化房间状态
        
        return system;
    }

    // 仪表盘
    getDashboard() {
        return {
            activeRooms: this.rooms.size,
            totalPlayers: Array.from(this.rooms.values()).reduce((sum, r) => sum + r.players.size, 0),
            playing: Array.from(this.rooms.values()).filter(r => r.status === 'playing').length,
            waiting: Array.from(this.rooms.values()).filter(r => r.status === 'waiting').length,
            tournaments: this.tournaments.size,
            topRankings: this.ranking.getLeaderboard(5)
        };
    }
}

// 导出
module.exports = {
    ArenaRoom,
    ArenaPVPSystem,
    RankingSystem,
    Tournament
};
