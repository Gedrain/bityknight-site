const State = {
    user: null,    // Firebase User
    profile: null, // DB User Data
    chatRef: null, // Current Firebase Ref for chat listener
    dmTarget: null, // Current DM Target UID
    pendingCh: null, // Channel trying to enter
    isReg: false, // Login/Reg switch state
    
    // Новое: хранит ID каналов, в которые мы уже ввели пароль в этой сессии
    unlockedChannels: new Set()
};