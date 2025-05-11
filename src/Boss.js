const Utilities = require('./Utilities');

class Boss {
    constructor(name, hp) {
        this.name = name;
        this.hp = hp;
        this.availableHits = [];
        this.finalHits = [];
    }

    generateHitRouteData(players, errorMarginPercentage, maxOverkillPercentage) {
        const routeData = {
            boss_name: this.name,
            final_target_hp: this.hp,
            error_margin_percentage: +(errorMarginPercentage * 100 - 100).toFixed(1),
            max_allowed_overkill_percentage: +(maxOverkillPercentage * 100 - 100).toFixed(1),
            hits: []
        };

        let currDmg = 0;
        let isLast = false;
        let playerHitCount = 3;

        this.finalHits.forEach((hit, hitIndex) => {
            isLast = hitIndex === this.finalHits.length - 1;
            currDmg += hit.dmg;
            const player = players.find(p => p.name === hit.playerName);
            if (player) playerHitCount = player.hitsLeft;

            const hitInfo = hit.dumpHitStatusInHitRoute(playerHitCount, currDmg, hitIndex + 1, isLast, this.hp);
            routeData.hits.push(hitInfo);
        });

        const overkillDmg = Math.abs(this.hp - currDmg);
        const overkillDmgPercentage = +(overkillDmg / this.hp * 100).toFixed(3);
        routeData.overkill_damage = {
            damage: overkillDmg,
            percentage: overkillDmgPercentage
        };

        return routeData;
    }

    getClosestValidHitFromAnotherPlayer(combination, hitsLeft, currHit, players) {
        const playerName = currHit.playerName;
        for (let i = 0; i < hitsLeft.length; i++) {
            const hit = hitsLeft[i];
            if (hit.playerName !== playerName &&
                this.canPlayerHit(hit, players) &&
                !this.hasPlayerAlreadyHit(combination, hit)) {
                return [i, hit];
            }
        }
        return null;
    }

    canPlayerHit(hit, playerList) {
        const player = playerList.find(p => p.name === hit.playerName);
        return player ? player.hitsLeft > 0 : false;
    }

    hasPlayerAlreadyHit(combination, currHit) {
        return combination.some(hit => hit.playerName === currHit.playerName);
    }

    determineLastHits(hitsLeft, HP) {
        //console.log(`Starting LAST hits computation for boss: ${this.name}, remaining HP: ${HP}`);
        let sum = 0;
        const lastHits = [];

        for (const hit of hitsLeft) {
            if (sum + hit.dmg <= HP * 1.5) {
                lastHits.push(hit);
                sum += hit.dmg;
                if (sum > HP) break;
            }
        }
        return lastHits;
    }

    findClosestCombination(players, maxOverkillPercentage) {
        const totalPossible = this.availableHits.reduce((acc, hit) => acc + hit.dmg, 0);
        if (totalPossible < this.hp) {
            console.log("Not reachable");
            return;
        }

        let sum = 0;
        const combination = [];

        for (let i = 0; i < this.availableHits.length; i++) {
            const hit = this.availableHits[i];
            if (!this.canPlayerHit(hit, players) || this.hasPlayerAlreadyHit(combination, hit)) continue;

            if (sum + hit.dmg <= this.hp) {
                const nextHit = this.availableHits[i + 1];
                if (nextHit && (sum + hit.dmg + nextHit.dmg > this.hp)) {
                    if (hit.playerName === nextHit.playerName) continue;
                    if (this.hasPlayerAlreadyHit(combination, nextHit)) continue;

                    const overflow = (sum + hit.dmg + nextHit.dmg) / this.hp;
                    if (overflow < maxOverkillPercentage) {
                        combination.push(hit, nextHit);
                        this.finalHits = Utilities.getReversedList(combination);
                        return this.finalHits;
                    }
                    if (overflow > maxOverkillPercentage) continue;

                    let remainingHits = Utilities.filterSubList(this.availableHits, combination)
                        .filter(h => this.canPlayerHit(h, players) && !this.hasPlayerAlreadyHit(combination, h));

                    remainingHits = remainingHits.sort((a, b) => b.playerWeight - a.playerWeight);

                    const remainingHP = this.hp - sum;
                    const lastHits = this.determineLastHits(remainingHits, remainingHP);
                    combination.push(...lastHits);
                    this.finalHits = Utilities.getReversedList(combination);
                    return this.finalHits;
                }
                if (hit.bossWeight > 0.01) {
                    combination.push(hit);
                    sum += hit.dmg;
                }
            }

            if (sum >= this.hp) {
                this.finalHits = Utilities.getReversedList(combination);
                return this.finalHits;
            }
        }

        this.finalHits = Utilities.getReversedList(combination);
        return this.finalHits;
    }

    dumpAvailableHits() {
        this.availableHits.forEach(hit => hit.dumpInfo());
    }

    genHits(unsortedHits) {
        this.availableHits = unsortedHits.sort((a, b) => b.dmg - a.dmg);
    }
}

module.exports = { Boss };