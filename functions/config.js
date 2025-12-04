const SUPER_ADMIN = "packemaker@mail.ru";

const CFG = {
    fb: {
  apiKey: "AIzaSyBagVxcT2ZW2-E1r7G3Pdg_XymWDtzzsRA",
  authDomain: "nekoid22.firebaseapp.com",
  databaseURL: "https://nekoid22-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "nekoid22",
  storageBucket: "nekoid22.firebasestorage.app",
  messagingSenderId: "701422144000",
  appId: "1:701422144000:web:f42c5597115b991323e6e5",
  measurementId: "G-1S7FYTNF4D"

    }
};

// Инициализация Firebase
firebase.initializeApp(CFG.fb);
const db = firebase.database();
const auth = firebase.auth();