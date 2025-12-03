const State = {
    user: null,    // Firebase User
    profile: null, // DB User Data
    chatRef: null, // Current Firebase Ref for chat listener
    dmTarget: null, // Current DM Target UID
    pendingCh: null, // Channel trying to enter
    isReg: false, // Login/Reg switch state
    
    // Хранит режим чата ('channel' или 'dm'), чтобы кнопка назад знала куда идти
    chatMode: 'channels', 

    // Хранит ID каналов, в которые мы уже ввели пароль в этой сессии
    unlockedChannels: new Set()
};