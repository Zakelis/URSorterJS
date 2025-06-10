const { Boss } = require('./Boss');
const { Player } = require('./Player');

class Computations {
    constructor(bossData) {
        this.players = [];
        this.hitsDone = [];

        this.bosses = [];
        // Hit route will not be computed by following the bosses order in game...
        // But keep the data ordered in the outputted JSON as in game to avoid confusion
        this.bossesNamesOrderForOutput = [];
        this.errorMarginPercentage = 1.0;
        // There is room for (not guaranteed) improvement by tweaking the value
        // Depends on the number of mocks and damage variety
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

    // Debug
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

    // Debug
    dumpBestHitRouteData()
    {
        for (const boss of this.allHitRoutes[0].hitRoute)
        {
            console.log(boss);
        }
    }

    // Debug
    dumpHitRouteStats(index){
        console.log(this.bosses.length, "bosses defeated with", this.allHitRoutes[index].totalHitNumber, "hits", "with solution index", this.allHitRoutes[index].solutionIndex);
        console.log("Total bosses HP :", this.allHitRoutes[index].totalBossHP, "--- Total overkill damage :", this.allHitRoutes[index].totalOverkillDamage, "(" + this.allHitRoutes[index].totalOverkillPercentage + "%)");
    }

    resetHitsDone(){
        this.hitsDone = []
    }

    // Cleanup existing hit route data before a new attempt at finding a better route
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

    // Generate all combinations of hit routes
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

    // Generate all hit routes and compute one solution for each one
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

            jsonOutput.bosses.sort((a, b) => this.bossesNamesOrderForOutput.indexOf(a.boss_name) - this.bossesNamesOrderForOutput.indexOf(b.boss_name));

            results.push({
                hitRoute: jsonOutput.bosses,
                totalBossHP: totalBossHP,
                totalOverkillDamage: totalOverkillDamage,
                totalOverkillPercentage: ((totalOverkillDamage / totalBossHP) * 100).toFixed(3),
                totalHitNumber: totalHitNumber,
                solutionIndex: solutionIndex // May be removed for real testing (debug for validation)
            })
            solutionIndex++;
        }

        // TODO : Add a failsafe (maxed overkill damage ?) if a solution can't be found for one hit route
        return results;
    }

    // Hit routes solutions (5! = 120 passes)
    // Filter from the best to the worst (overkill damage + number of hits)
    genBestHitRoute()
    {
        this.allHitRoutes = this.generateAllHitRoutesWithStats();

        this.allHitRoutes.sort(function (a, b) {
            // One hit route takes higher priority if :
            // 1) Total overkill damage is less than 5% worse (~= few million damage) than current best hit route but if at least one hit can be saved
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

        // It is highly unlikely that two hit routes having the same overkill damage and hits number have
        // variance in the used hits, so remove duplicates for easier access to alternative solutions
        const dupes = new Set();
        this.allHitRoutes = this.allHitRoutes.filter(hitRoute => {
            const key = `${hitRoute.totalOverkillDamage}-${hitRoute.totalHitNumber}}`;
            if (dupes.has(key)) {
                return false;
            }
            dupes.add(key);
            return true;
        });

        // TODO RESORT THE boss output in hit routes to the passed bosses JSON order for consistency
    }

    genSolutions() {
        this.genBestHitRoute();

        let jsonOutput = {
            runtime_date: new Date().toISOString().replace('T', ' ').split('.')[0] + " UTC+0",
            best_solution: this.allHitRoutes[0]
        };

        // TODO : Make the new fields creation dynamic w.r.t. X wanted best solutions variants
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
        this.dumpHitRouteStats(1); // Second best solution
        this.dumpHitRouteStats((this.allHitRoutes.length / 2).toFixed(0)); // Middle solution
        this.dumpHitRouteStats(this.allHitRoutes.length - 1); // Worst solution*/

        // Print the final properly formatted JSON output
        console.log(JSON.stringify(jsonOutput, null, 4));
    }
}

module.exports = { Computations };