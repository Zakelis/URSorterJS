const fs = require('fs');
const path = require('path');

// TODO : Remove this crap when args will be passed as JSON

function parseBossDataCSV(filePath) {
    const data = ["bosses", []];
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const lines = raw.split(/\r?\n/);

        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const parts = line.split(',');

            if (lineNumber >= 2 && lineNumber <= 6) {
                if (parts.length >= 7) {
                    const bossName = parts[0];
                    const tier1HP = parseInt(parts[4].replace(/,/g, ''));
                    data[1].push([bossName, tier1HP]);
                }
            }
        });

        return data;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error(`File '${filePath}' was not found.`);
        } else {
            console.error(`An exception occurred: ${err.message}`);
        }
    }
}

function parseCSV(filePath) {
    const data = [];
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const lines = raw.split(/\r?\n/);

        for (let i = 1; i < lines.length; i++) { // Skip header
            const line = lines[i];
            if (line.trim() !== '') {
                const row = line.split(',');
                data.push(row);
            }
        }

        return data;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error(`File '${filePath}' was not found.`);
        } else {
            console.error(`An exception occurred : ${err.message}`);
        }
    }
}

function parseCSVToJSON(filePath) {

    const data = [];
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');

        const lines = raw.trim().split("\n");
        const result = {mocks: []};

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const values = line.split(",");
            result.mocks.push({
                player: values[0],
                damage: values[1],
                p1: values[2],
                p2: values[3],
                p3: values[4],
                p4: values[5],
                p5: values[6],
                boss: values[7]
            });
        }

        return result;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error(`File '${filePath}' was not found.`);
        } else {
            console.error(`An exception occurred : ${err.message}`);
        }
    }
}

module.exports = {
    parseCSV,
    parseCSVToJSON,
    parseBossDataCSV
};