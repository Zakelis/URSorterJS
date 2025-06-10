const Utilities = require('./Utilities');

class Boss {
    constructor(name, hp) {
        this.name = name;
        this.hp = hp;
        this.availableHits = [];
        this.finalHits = [];
        this.overkillDamage = 0;
        this.overkillPercentage = 0;
    }

    resetHitRoute() {
        this.finalHits = []
        this.overkillDamage = 0;
        this.overkillPercentage = 0;
    }

    // Debug
    dumpHitRouteStats() {
        console.log("Boss killed in", this.finalHits.length, "hits :\n");
        for (const hit of this.finalHits)
        {
            hit.dumpInfo();
        }
        console.log("Overkill damage :", this.overkillDamage, "(" + this.overkillPercentage, "%)");
        console.log("\n");
    }

    // Hit route JSON formatting
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
            if (player)
            {
                playerHitCount = player.hitsLeft;
            }

            const hitInfo = hit.dumpHitStatusInHitRoute(playerHitCount, currDmg, hitIndex + 1, isLast, this.hp);
            routeData.hits.push(hitInfo);
        });

        this.overkillDamage = Math.abs(this.hp - currDmg);
        this.overkillPercentage = +(this.overkillDamage / this.hp * 100).toFixed(3);
        routeData.overkill_damage = {
            damage: this.overkillDamage,
            percentage: this.overkillPercentage
        };

        return routeData;
    }

    canPlayerHit(hit, playerList) {
        const player = playerList.find(p => p.name === hit.playerName);
        return player ? player.hitsLeft > 0 : false;
    }

    // TODO : It is unlikely that one player will hit the same level 1 boss more than one time, will keep an eye on this if the sorter can handle level 2 too
    hasPlayerAlreadyHit(combination, currHit) {
        return combination.some(hit => hit.playerName === currHit.playerName);
    }

    determineLastHits(hitsLeft, HP) {
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
        const totalPossibleDMG = this.availableHits.reduce((acc, hit) => acc + hit.dmg, 0);
        if (totalPossibleDMG < this.hp) {
            console.log("Not reachable");
            // TODO : Not likely to happen, will add a failsafe here
            return;
        }

        let sum = 0;
        const combination = [];

        // TODO : Pretty sure the hit backtracking can be improved... Priority when the JS refactor is done

        for (let i = 0; i < this.availableHits.length; i++) {
            const hit = this.availableHits[i];
            if (!this.canPlayerHit(hit, players) || this.hasPlayerAlreadyHit(combination, hit)) continue;

            if (sum + hit.dmg <= this.hp) {
                const nextHit = this.availableHits[i + 1];
                // TODO : Priority to element specialists can be done here
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

                    const remainingHP = this.hp - sum;
                    const lastHits = this.determineLastHits(remainingHits, remainingHP);
                    combination.push(...lastHits);
                    this.finalHits = Utilities.getReversedList(combination);
                    return this.finalHits;
                }
                else {
                    combination.push(hit);
                    sum += hit.dmg;
                }
            }
            // TODO : Can handle oneshots here
            // else if (sum + hit.dmg <= this.hp * maxOverkillPercentage) {
            //    Add hit and return
            // }

            if (sum >= this.hp) {
                this.finalHits = Utilities.getReversedList(combination);
                return this.finalHits;
            }
        }

        // Ordered from smallest to biggest hit, just a personal preference from previous URs
        this.finalHits = Utilities.getReversedList(combination);
        return this.finalHits;
    }

    // Debug
    dumpAvailableHits() {
        this.availableHits.forEach(hit => hit.dumpInfo());
    }

    // Sorting available hits from biggest to lowest damage
    genHits(unsortedHits) {
        this.availableHits = unsortedHits.sort((a, b) => b.dmg - a.dmg);
    }
}

module.exports = { Boss };