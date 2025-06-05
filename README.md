# URSorterJS

## TODO :

~~- Finish transition between Python to JS~~
~~- Cleanup existing code~~
~~- Full JSON handling as args - See how mocks data can also be passed as JSON, as bosses data at the moment, SheetParser file should then be removed~~
~~- Hit route - Check for the lowest possible oneshot if any~~
~~- Rework everything for new UR rules - no forced boss order~~
- Refine damage computation algorithm if possible, it can be sharper

## Testing results evolution (March 2025 mocks data):

Initial result - 5% max overkill damage :
20 hits
Total bosses HP : 158871514000 --- Total overkill damage : 5616486000 (3.535%)

05/06/2025 - Taking in consideration all hit routes - 5% max overkill damage : 1 hit and 1.5b saved
5 bosses defeated with 19 hits with solution index 1
Total bosses HP : 158871514000 --- Total overkill damage : 3967486000 (2.497%)

05/06/2025 - Taking in consideration all hit routes - 2% max overkill damage :