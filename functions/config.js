const SUPER_ADMIN = "packemaker@mail.ru";
const CFG = { fb: { apiKey: "AIzaSyC_7hrzPrnjd3-XFsqas-2vHUJAJEfWxoQ", authDomain: "nekochat-ba3a9.firebaseapp.com", databaseURL: "https://nekochat-ba3a9-default-rtdb.europe-west1.firebasedatabase.app", projectId: "nekochat-ba3a9", storageBucket: "nekochat-ba3a9.firebasestorage.app", messagingSenderId: "117042257678", appId: "1:117042257678:web:bec3bbcc1eac974901c15f" } };

firebase.initializeApp(CFG.fb);
const db = firebase.database();
const auth = firebase.auth();