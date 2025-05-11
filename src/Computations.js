const Utilities = require('./Utilities');
const { Boss } = require('./Boss');
const { Player } = require('./Player');
const { Hit } = require('./Hit');
const fs = require('fs');

class Computations {
    constructor(bossData) {
        this.players = [];
        this.hitsDone = [];

        this.bosses = [];
        this.errorMarginPercentage = 1.0;
        this.maxOverkillPercentage = 1.05;

        this.loadBossData(bossData);
    }

    loadBossData(bossData) {
        for (const boss of bossData) {
            const bossName = boss["name"];
            const baseHp = parseInt(boss["hp"].replace(/,/g, ""), 10);
            const hpAdjusted = baseHp * this.errorMarginPercentage;
            this.bosses.push(new Boss(bossName, hpAdjusted));
        }
    }

    feedPlayersArray(parsedHits) {
        const exploredPlayers = [];

        for (const hit of parsedHits) {
            const playerName = hit[0];
            if (!exploredPlayers.includes(playerName)) {
                exploredPlayers.push(playerName);
                const player = new Player(playerName, ...this.bosses.map(b => b.name));
                this.players.push(player);
            }
        }
    }

    feedAllStartingHits(parsedHits) {
        for (const player of this.players) {
            player.feedAllHits(parsedHits);
        }
    }

    feedPlayerHits(parsedHits) {
        this.feedPlayersArray(parsedHits);
        this.feedAllStartingHits(parsedHits);
    }

    updateHitPlayerWeight() {
        for (const player of this.players) {
            let lowestDmg = Infinity;
            let topDmg = 0;
            const hits = player.getHits();

            for (const hit of hits) {
                if (hit.dmg < lowestDmg) lowestDmg = hit.dmg;
                if (hit.dmg > topDmg) topDmg = hit.dmg;
            }

            for (const hit of hits) {
                hit.playerWeight = (hit.dmg - lowestDmg) / (topDmg - lowestDmg);
            }
        }
    }

    updateHitBossWeight(bossName) {
        let lowestDmg = Infinity;
        let topDmg = 0;

        for (const player of this.players) {
            const bossHits = player.getBossHits(bossName);
            for (const hit of bossHits) {
                if (hit.dmg < lowestDmg) lowestDmg = hit.dmg;
                if (hit.dmg > topDmg) topDmg = hit.dmg;
            }
        }

        for (const player of this.players) {
            const bossHits = player.getBossHits(bossName);
            for (const hit of bossHits) {
                hit.bossWeight = (hit.dmg - lowestDmg) / (topDmg - lowestDmg);
            }
        }
    }

    initBossHits(ignoredHits, boss) {
        const bossHits = [];

        for (const player of this.players) {
            const ignoredHitsOfPlayer = ignoredHits.filter(h => h.playerName === player.name);
            const hitList = player.getBossHits(boss.name);

            for (const hit of hitList) {
                let hasValidComp = true;

                for (const ignoredHit of ignoredHitsOfPlayer) {
                    if (hit.isUsingConflictualComp(ignoredHit)) {
                        hasValidComp = false;
                        break;
                    }
                }

                if (hasValidComp) {
                    bossHits.push(hit);
                }
            }
        }

        boss.genHits(bossHits);
    }

    computeOptimalHits(boss) {
        const bestCombination = boss.findClosestCombination(this.players, this.maxOverkillPercentage);

        let totalDmg = 0;
        for (const hit of bestCombination) {
            totalDmg += hit.dmg;
        }

        return bestCombination;
    }

    dumpIgnoredHits() {
        for (const hit of this.hitsDone) {
            hit.dumpInfo();
        }
    }

    decrementPlayerHitCount(playerName) {
        for (const player of this.players) {
            if (player.name === playerName) {
                player.hitsLeft -= 1;
            }
        }
    }

    updatePlayerHitCount(bossHits) {
        for (let i = 0; i < bossHits.length; i++) {
            if (i !== bossHits.length - 1) {
                this.decrementPlayerHitCount(bossHits[i].playerName);
            }
        }
    }

    appendToIgnoredHits(bossHits) {
        for (const hit of bossHits) {
            this.hitsDone.push(hit);
        }
    }

    genSolutions() {
        const jsonOutput = {
            runtime_date: new Date().toISOString().replace('T', ' ').split('.')[0] + " UTC+0",
            bosses: []
        };

        for (let bossIndex = 0; bossIndex < this.bosses.length; bossIndex++) {
            const boss = this.bosses[bossIndex];
            if (bossIndex <= 4) {
                this.initBossHits(this.hitsDone, boss);
                this.updateHitPlayerWeight();
                this.updateHitBossWeight(boss.name);
                const bossHits = this.computeOptimalHits(boss);
                this.updatePlayerHitCount(bossHits);
                this.appendToIgnoredHits(bossHits);

                jsonOutput.bosses.push(
                    boss.generateHitRouteData(
                        this.players,
                        this.errorMarginPercentage,
                        this.maxOverkillPercentage
                    )
                );
            }
        }
        // Print the final properly formatted JSON output
        console.log(JSON.stringify(jsonOutput, null, 4));
    }
}

module.exports = { Computations };