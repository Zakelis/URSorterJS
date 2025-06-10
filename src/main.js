const SheetParser = require('./SheetParser');
const {Computations} = require('./Computations');

function main() {
    // Placeholder data, replace with wanted JSON as needed
    const parsedSheetData = SheetParser.parseCSVToJSON('../data/sheetData.csv');

    // Mocks JSON formatting is as following :
    //console.log(parsedSheetData)

    const bossDataJSON =
        {
            "bosses":
                [
                    {
                        "name": "Thermite B",
                        "hp": "21,255,027,600"
                    },
                    {
                        "name":
                            "Mace",
                        "hp":
                            "21,255,027,600",
                    }
                    ,
                    {
                        "name":
                            "Alexander",
                        "hp":
                            "47,553,215,600",
                    }
                    ,
                    {
                        "name":
                            "Rb Fingers",
                        "hp":
                            "21,255,027,600",
                    }
                    ,
                    {
                        "name":
                            "Harvester",
                        "hp":
                            "47,553,215,600",
                    }
                ]
        }

    const computations = new Computations(bossDataJSON["bosses"]);
    computations.feedPlayerHits(parsedSheetData["mocks"]);
    computations.genSolutions();
}

if (require.main === module) {
    main();
}