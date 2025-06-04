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
        this.allHitRoutes = []
        this.bestHitRoute = []

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
            const playerName = hit["player"];
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

    dumpHitsUsedInRoute() {
        for (const [index, hit] of this.hitsDone.entries()) {
            console.log(index, ":");
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
            this.decrementPlayerHitCount(bossHits[i].playerName);
        }
    }

    appendToIgnoredHits(bossHits) {
        for (const hit of bossHits) {
            this.hitsDone.push(hit);
        }
    }

    dumpHitRouteStats(index){
        console.log(this.bosses.length, "bosses defeated with", this.allHitRoutes[index].totalHitNumber, "hits", "with solution number", this.allHitRoutes[index].solutionIndex);
        console.log("Total bosses HP :", this.allHitRoutes[index].totalBossHP, "--- Overkill damage :", this.allHitRoutes[index].totalOverkillDamage, "(" + this.allHitRoutes[index].totalOverkillPercentage + "%)");
    }

    dumpBestHitRouteStats() {
        console.log(this.bosses.length, "bosses defeated with", this.bestHitRoute.totalHitNumber, "hits", "with solution number", this.bestHitRoute.solutionIndex);
        console.log("Total bosses HP :", this.bestHitRoute.totalBossHP, "--- Overkill damage :", this.bestHitRoute.totalOverkillDamage, "(" + this.bestHitRoute.totalOverkillPercentage + "%)");
    }

    resetHitsDone(){
        this.hitsDone = []
    }

    pregenHitRoute() {
        this.resetHitsDone();
        for (const boss of this.bosses)
        {
            boss.resetHitRoute();
        }
        for (const player of this.players)
        {
            player.resetHitCount();
        }
    }

    permute(array)
    {
        const results = []
        const backtrack = function (current, remaining) {
            if (remaining.length === 0) {
                results.push(current);
                return;
            }

            for (let i = 0; i < remaining.length; i++) {
                const next = current.concat(remaining[i]);
                const rest = remaining.slice(0, i).concat(remaining.slice(i + 1));
                backtrack(next, rest);
            }
        };

        backtrack([], array);
        return results;
    }

    generateAllCombinationsWithStats()
    {
        const permutations = this.permute(this.bosses)
        const results = [];
        let solutionIndex = 0;

        for (const permutation of permutations)
        {
            /*console.log("DUMP PERMUTATION");
            console.log(permutation);*/
            let totalOverkillDamage = 0;
            let totalHitNumber = 0;
            let totalBossHP = 0;

            let jsonOutput = {
            runtime_date: new Date().toISOString().replace('T', ' ').split('.')[0] + " UTC+0",
            bosses: []
            };

            this.pregenHitRoute();

            if (solutionIndex === 0 || solutionIndex === 64) {
                console.log("SOLUTION NUMBER", solutionIndex);
            }

            for (const boss of permutation) {
                /*console.log("DUMP PERMUTATION BOSS");
                console.log(boss);*/
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

                totalBossHP += boss.hp;
                totalOverkillDamage += boss.overkillDamage;
                totalHitNumber += boss.finalHits.length;
                if (solutionIndex === 0 || solutionIndex === 64) {
                    boss.dumpHitRouteStats();
                }
            }

            results.push({
                runtime_date: jsonOutput.runtime_date,
                hitRoute: jsonOutput.bosses,
                totalBossHP: totalBossHP,
                totalOverkillDamage: totalOverkillDamage,
                totalOverkillPercentage: ((totalOverkillDamage / totalBossHP) * 100).toFixed(3),
                totalHitNumber: totalHitNumber,
                solutionIndex: solutionIndex
            })
            solutionIndex++;
        }

        // TODO : Add safeguard (with maxed stats ?) if one or more bosses can't be solved with a hit route
        return results;
    }

    genBestHitRoute()
    {
        // Generate ALL hit routes (5! = 120)
        // Keep the one that generates the less amount of overkill damage + hits number if possible
        this.allHitRoutes = this.generateAllCombinationsWithStats();
        this.allHitRoutes.sort(function (a, b) {
            // Hit route takes higher prio if :
            // - Total overkill damage is less than 5% worse than current best hit route but at least one hit can be saved
            // - If the number of hits are the same, smaller overkill damage takes prio

            if (a.totalHitNumber < b.totalHitNumber) {
                if (a.totalOverkillDamage < b.totalOverkillDamage * 1.05)
                {
                    return -1;
                }
                else {
                    return 1;
                }
            }

            if (a.totalHitNumber === b.totalHitNumber) {
                return a.totalOverkillDamage - b.totalOverkillDamage;
            }

            return 1;
        });

        const seen = new Set();
        this.allHitRoutes = this.allHitRoutes.filter(hitRoute => {
            const key = `${hitRoute.totalOverkillDamage}-${hitRoute.totalHitNumber}}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });

        //console.log("Number of unique solutions after filtering", this.allHitRoutes.length);
        // TODO RESORT THE boss output in hit routes to the passed bosses JSON order for consistency
        this.bestHitRoute = this.allHitRoutes[0];
    }

    genSolutions() {
        this.genBestHitRoute();

        // Debug for validation purposes
        /*this.dumpBestHitRouteStats(); // Best solution
        this.dumpHitRouteStats(1); // 2nd best solution
        this.dumpHitRouteStats((this.allHitRoutes.length / 2).toFixed(0)); // Middle solution
        this.dumpHitRouteStats(this.allHitRoutes.length - 1); // worst solution*/

        // Print the final properly formatted JSON output
        console.log(JSON.stringify(this.bestHitRoute, null, 4));
    }
}

module.exports = { Computations };