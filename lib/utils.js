exports.sleep = function (t) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), t * 1000);
    });
}