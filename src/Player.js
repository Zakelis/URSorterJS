const { Hit } = require('./Hit');
const Utilities = require('./Utilities');

class Player {
    constructor(name, b1Name, b2Name, b3Name, b4Name, b5Name) {
        this.name = name;
        this.allHits = [];
        this.hits = [];
        this.bossesNames = [b1Name, b2Name, b3Name, b4Name, b5Name];
        this.hitsLeft = 3;
    }

    resetHitCount() {
        this.hitsLeft = 3;
    }

    feedAllHits(hitLines) {
        for (const bossName of this.bossesNames) {
            this.allHits.push([bossName, []]);
            this.hits.push([bossName, []]);
        }

        for (const parsedHit of hitLines) {
            if (this.name === parsedHit["player"]) {
                this.feedHit(parsedHit);
            }
        }
    }

    feedHit(hitLine) {
        const dmg = hitLine["damage"] * 1_000_000;
        const p1 = hitLine["p1"];
        const p2 = hitLine["p2"];
        const p3 = hitLine["p3"];
        const p4 = hitLine["p4"];
        const p5 = hitLine["p5"];
        const bossName = hitLine["boss"];
        const hit = new Hit(this.name, dmg, p1, p2, p3, p4, p5, bossName);

        this.bossesNames.forEach((bName, i) => {
            if (bossName === bName) {
                this.allHits[i][1].push(hit);
                this.hits[i][1].push(hit);
            }
        });
    }

    dumpBossHits(bossName) {
        const bossHits = this.getBossHits(bossName);

        console.log("Dumping hits for player on boss", bossName);
        bossHits.forEach(hit => hit.dumpInfo());
    }

    // Debug
    dumpHits() {
        console.log("Dumping all hits for player", this.name);
        this.hits.forEach(boss => {
            this.dumpBossHits(boss[0]);
        });

        console.log("Adjusted mean of hits weights is", this.meanOfHitsWeights);
    }

    // Debug
    getNumberOfAllHits() {
        return this.getHits().length;
    }

    getBossHits(bossName) {
        for (let i = 0; i < this.bossesNames.length; i++) {
            if (bossName === this.bossesNames[i]) {
                return this.hits[i][1];
            }
        }
        return [];
    }

    getHits() {
        const allHitsList = [];
        for (const [_, hitList] of this.hits) {
            allHitsList.push(...hitList);
        }
        return allHitsList;
    }
}

module.exports = { Player };