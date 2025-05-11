function writeCurrentUTCTime() {
    const now = new Date();
    const utcNow = new Date(now.toISOString()); // ISO string is always in UTC
    const formatted = utcNow.toISOString().replace('T', ' ').split('.')[0] + ' UTC+0';
    console.log(`Runtime Date : ${formatted}`);
}

function getReversedList(list) {
    return [...list].reverse();
}

function filterSubList(ref, toKeep) {
    const toKeepSet = new Set(toKeep);
    return ref.filter(elem => !toKeepSet.has(elem));
}

function getLastListItem(list) {
    return list.length > 0 ? list[list.length - 1] : null;
}

function getFirstListItem(list) {
    return list.length > 0 ? list[0] : null;
}

function getNthListItem(list, n) {
    return list.length > n ? list[n] : null;
}

module.exports = {
    writeCurrentUTCTime,
    getReversedList,
    filterSubList,
    getLastListItem,
    getFirstListItem,
    getNthListItem
};