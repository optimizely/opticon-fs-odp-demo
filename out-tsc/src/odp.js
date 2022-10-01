/**
 * zaiusReady
 * @returns a Promise that resolves when window.zaius is ready
 */
function odpReady() {
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            if (window.zaius) {
                window.odpClient = window.zaius;
                resolve();
                clearInt();
            }
        }, 10);
        const clearInt = () => {
            clearInterval(interval);
        };
    });
}
export { odpReady };
