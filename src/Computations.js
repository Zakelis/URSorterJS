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
        this.bossesNamesOrderForOutput = []; // Keep fixed display order
        this.errorMarginPercentage = 1.0;
        this.maxOverkillPercentage = 1.05;
        this.allHitRoutes = []

        this.loadBossData(bossData);
    }

    loadBossData(bossData) {
        for (const boss of bossData) {
            const bossName = boss["name"];
            this.bossesNamesOrderForOutput.push(bossName);
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

    dumpBestHitRouteData()
    {
        for (const boss of this.allHitRoutes[0].hitRoute)
        {
            console.log(boss);
        }
    }

    dumpHitRouteStats(index){
        console.log(this.bosses.length, "bosses defeated with", this.allHitRoutes[index].totalHitNumber, "hits", "with solution index", this.allHitRoutes[index].solutionIndex);
        console.log("Total bosses HP :", this.allHitRoutes[index].totalBossHP, "--- Total overkill damage :", this.allHitRoutes[index].totalOverkillDamage, "(" + this.allHitRoutes[index].totalOverkillPercentage + "%)");
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

    genAllHitRoutes(baseHitRoute)
    {
        const results = []
        const backtrackNextHitRoutes = function (currentHitRoutes, remainingHitRoutes) {
            if (remainingHitRoutes.length === 0) {
                results.push(currentHitRoutes);
                return;
            }

            for (let i = 0; i < remainingHitRoutes.length; i++) {
                const next = currentHitRoutes.concat(remainingHitRoutes[i]);
                const rest = remainingHitRoutes.slice(0, i).concat(remainingHitRoutes.slice(i + 1));
                backtrackNextHitRoutes(next, rest);
            }
        };

        backtrackNextHitRoutes([], baseHitRoute);
        return results;
    }

    generateAllHitRoutesWithStats()
    {
        const allHitRoutes = this.genAllHitRoutes(this.bosses)
        const results = [];
        let solutionIndex = 0;

        for (const hitRoute of allHitRoutes)
        {
            let totalOverkillDamage = 0;
            let totalHitNumber = 0;
            let totalBossHP = 0;

            let jsonOutput = {
            bosses: []
            };

            this.pregenHitRoute();

            for (const boss of hitRoute) {
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
            }

            results.push({
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
        // Generate ALL hit routes (5! = 120 passes)
        // Keep the one that generates the less amount of overkill damage and hits number if possible
        this.allHitRoutes = this.generateAllHitRoutesWithStats();

        this.allHitRoutes.sort(function (a, b) {
            // Hit route takes higher priority if :
            // 1) Total overkill damage is less than 5% worse (= few million damage) than current best hit route but if at least one hit can be saved
            // 2) If the number of hits are the same, smaller total overkill damage wins

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

        // Filter duplicated hit routes, if any
        const dupes = new Set();
        this.allHitRoutes = this.allHitRoutes.filter(hitRoute => {
            const key = `${hitRoute.totalOverkillDamage}-${hitRoute.totalHitNumber}}`;
            if (dupes.has(key)) {
                return false;
            }
            dupes.add(key);
            return true;
        });

        //console.log("Number of unique solutions after filtering", this.allHitRoutes.length);
        // TODO RESORT THE boss output in hit routes to the passed bosses JSON order for consistency
    }

    genSolutions() {
        this.genBestHitRoute();

        let jsonOutput = {
            runtime_date: new Date().toISOString().replace('T', ' ').split('.')[0] + " UTC+0",
            best_solution: this.allHitRoutes[0]
        };

        if (this.allHitRoutes.length > 1)
        {
            jsonOutput.alt_solution1 = this.allHitRoutes[1];
        }

        if (this.allHitRoutes.length > 2)
        {
            jsonOutput.alt_solution2 = this.allHitRoutes[2];
        }

        // Debug for validation purposes
        /*this.dumpHitRouteStats(0); // Best solution
        this.dumpBestHitRouteData();
        this.dumpHitRouteStats(1); // Second best solution
        this.dumpHitRouteStats((this.allHitRoutes.length / 2).toFixed(0)); // Middle solution
        this.dumpHitRouteStats(this.allHitRoutes.length - 1); // worst solution*/

        // Print the final properly formatted JSON output
        //
        console.log(JSON.stringify(jsonOutput, null, 4));
    }
}

module.exports = { Computations };