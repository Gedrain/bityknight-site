// Адрес твоего VDS сервера
const SERVER_URL = "http://45.150.8.5/"; 

// Инициализация PocketBase
const pb = new PocketBase(SERVER_URL);

// Отключаем авто-отмену (чтобы чат не прерывался)
pb.autoCancellation(false);

// Глобальный доступ
window.pb = pb;
window.SERVER_URL = SERVER_URL;

console.log("NEKO PROTOCOL: Linked to Node " + SERVER_URL);