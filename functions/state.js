const State = {
    user: null,    // Текущий пользователь {uid: '...', email: '...'}
    profile: null, // Полные данные пользователя
    
    activeSubscription: null, // Хранит функцию отписки от чата
    
    dmTarget: null, // ID собеседника в ЛС
    pendingCh: null, // Канал, в который пытаемся войти (для ввода пароля)
    isReg: false, // Режим регистрации/входа
    
    chatMode: 'channels', // 'channels' или 'dm'
    currentChannelId: null,

    // Хранит ID каналов, куда мы ввели пароль
    unlockedChannels: new Set()
};