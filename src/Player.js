const { Hit } = require('./Hit');
const Utilities = require('./Utilities');

class Player {
    constructor(name, b1Name, b2Name, b3Name, b4Name, b5Name) {
        this.name = name;
        this.synchro = 0;
        this.allHits = [];
        this.hits = [];
        this.bossesNames = [b1Name, b2Name, b3Name, b4Name, b5Name];
        this.meanOfHitsWeights = 1;
        this.hitsLeft = 3;
    }

    feedAllHits(hitLines) {
        for (const bossName of this.bossesNames) {
            this.allHits.push([bossName, []]);
            this.hits.push([bossName, []]);
        }

        for (const parsedHit of hitLines) {
            if (this.name === parsedHit[0]) {
                this.feedHit(parsedHit);
            }
        }
    }

    feedHit(hitLine) {
        const dmg = parseInt(hitLine[1].replace(/,/g, ""), 10) * 1_000_000;
        const p1 = hitLine[2];
        const p2 = hitLine[3];
        const p3 = hitLine[4];
        const p4 = hitLine[5];
        const p5 = hitLine[6];
        const bossName = hitLine[7];
        const hit = new Hit(this.name, dmg, p1, p2, p3, p4, p5, bossName);

        this.bossesNames.forEach((bName, i) => {
            if (bossName === bName) {
                this.allHits[i][1].push(hit);
                this.hits[i][1].push(hit);
            }
        });
    }

    dumpHitsByStrongestHit() {
        const sortedHits = this.getHits().sort((a, b) => b.dmg - a.dmg);
        this.dumpHitsFromList(sortedHits);
    }

    dumpBossHitsByStrongestHit(bossName) {
        const bossHits = this.getBossHits(bossName);
        const sortedHits = bossHits.sort((a, b) => b.dmg - a.dmg);

        console.log("Dumping strongest hits for player on boss", bossName);
        sortedHits.forEach(hit => hit.dumpInfo());
    }

    dumpBossHits(bossName) {
        const bossHits = this.getBossHits(bossName);

        console.log("Dumping hits for player on boss", bossName);
        bossHits.forEach(hit => hit.dumpInfo());
    }

    dumpHitsFromList(hitList) {
        console.log("Dumping all hits from list for player", this.name);
        hitList.forEach(hit => hit.dumpInfo());
    }

    dumpHits() {
        console.log("Dumping all hits for player", this.name);
        this.hits.forEach(boss => {
            this.dumpBossHits(boss[0]);
        });

        console.log("Adjusted mean of hits weights is", this.meanOfHitsWeights);
    }

    getNumberOfBossHits(bossName) {
        for (let i = 0; i < this.bossesNames.length; i++) {
            if (bossName === this.bossesNames[i]) {
                return this.hits[i][1].length;
            }
        }
        return 0;
    }

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

    adjustMeanOfHitsWeights() {
        const allHits = this.getHits();
        const total = allHits.reduce((sum, hit) => sum + hit.playerWeight, 0);
        this.meanOfHitsWeights = total / this.getNumberOfAllHits();
    }

    adjustHitsWeights() {
        let highestHit = 0;

        this.hits.forEach(([_, hitList]) => {
            hitList.forEach(hit => {
                if (hit.dmg > highestHit) {
                    highestHit = hit.dmg;
                }
            });
        });

        this.hits.forEach(([_, hitList]) => {
            hitList.forEach(hit => {
                hit.playerWeight = hit.dmg / highestHit;
            });
        });

        this.adjustMeanOfHitsWeights();
    }
}

module.exports = { Player };