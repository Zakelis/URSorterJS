class Hit {
    constructor(playerName, dmg, p1, p2, p3, p4, p5, bossName) {
        this.playerName = playerName;
        this.dmg = dmg;
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
        this.p4 = p4;
        this.p5 = p5;
        this.bossName = bossName;
    }

    // Hit JSON formatting
    getInfoInHitRoute(playerHitCount, currDmg, hitIndex, isLast, bossHP) {
        const hitDmgPercentage = +(this.dmg / bossHP * 100).toFixed(3);
        const hpLeft = Math.max(bossHP - currDmg, 0);
        const hpLeftPercentage = +(Math.max(hpLeft / bossHP * 100, 0)).toFixed(3);
        const isLastText = isLast ? "KILL" : "";

        return {
            hit_index: hitIndex,
            player: this.playerName,
            team: [this.p1, this.p2, this.p3, this.p4, this.p5],
            damage: this.dmg,
            damage_percentage: hitDmgPercentage,
            hp_left: hpLeft,
            hp_left_percentage: hpLeftPercentage,
            hits_left: playerHitCount,
            kill_status: isLastText
        };
    }

    dumpHitStatusInHitRoute(playerHitCount, currDmg, hitIndex, isLast, bossHP) {
        return this.getInfoInHitRoute(playerHitCount, currDmg, hitIndex, isLast, bossHP);
    }

    getInfo() {
        return `${this.playerName} hit against ${this.bossName} : ${this.dmg} with comp : ${this.returnCompString()}`;
    }

    dumpInfo() {
        console.log(this.getInfo());
    }

    returnCompString() {
        return `${this.p1}/${this.p2}/${this.p3}/${this.p4}/${this.p5}`;
    }

    // Nikkes already in an assigned hit cannot be used for next hits
    isUsingConflictualComp(otherHit) {
        const thisSet = new Set([this.p1, this.p2, this.p3, this.p4, this.p5]);
        const otherSet = new Set([otherHit.p1, otherHit.p2, otherHit.p3, otherHit.p4, otherHit.p5]);

        for (const nikke of otherSet) {
            if (thisSet.has(nikke)) {
                return true;
            }
        }
        return false;
    }
}

module.exports = { Hit };