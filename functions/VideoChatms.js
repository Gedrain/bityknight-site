// Логика записи квадратных видео-сообщений
window.VideoChat = {
    recorder: null,
    chunks: [],
    stream: null,
    isPreviewing: false,
    isRecording: false,
    timerInterval: null,

    // 1. Открыть режим записи (включает камеру)
    openRecorder: async () => {
        try {
            // Запрашиваем квадратное видео (aspectRatio: 1)
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    aspectRatio: 1, 
                    width: { ideal: 480 },
                    height: { ideal: 480 },
                    facingMode: "user"
                }, 
                audio: true 
            });
            
            VideoChat.stream = stream;
            VideoChat.isPreviewing = true;

            // Скрываем обычный инпут, показываем UI видео
            document.getElementById('chat-input-controls').classList.add('hidden');
            document.getElementById('video-msg-ui').classList.remove('hidden');

            // Включаем превью
            const videoEl = document.getElementById('v-msg-preview');
            videoEl.srcObject = stream;
            videoEl.play();

        } catch (e) {
            console.error(e);
            UI.toast("Camera access denied", "error");
        }
    },

    // 2. Закрыть/Отменить запись
    closeRecorder: () => {
        if (VideoChat.stream) {
            VideoChat.stream.getTracks().forEach(t => t.stop());
            VideoChat.stream = null;
        }
        VideoChat.isPreviewing = false;
        VideoChat.isRecording = false;
        VideoChat.chunks = [];
        clearInterval(VideoChat.timerInterval);

        const videoEl = document.getElementById('v-msg-preview');
        if(videoEl) videoEl.srcObject = null;

        document.getElementById('video-msg-ui').classList.add('hidden');
        document.getElementById('chat-input-controls').classList.remove('hidden');
        
        // Сброс UI
        const btn = document.getElementById('btn-v-record');
        if(btn) btn.classList.remove('recording');
        document.getElementById('v-msg-timer').innerText = "0:00";
    },

    // 3. Начать или Остановить запись
    toggleRecord: () => {
        if (VideoChat.isRecording) {
            VideoChat.stopAndSend();
        } else {
            VideoChat.startRecording();
        }
    },

    startRecording: () => {
        if (!VideoChat.stream) return;
        
        VideoChat.chunks = [];
        // Пробуем разные кодеки для совместимости
        let options = { mimeType: 'video/webm;codecs=vp8,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm' };
        }

        VideoChat.recorder = new MediaRecorder(VideoChat.stream, options);

        VideoChat.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) VideoChat.chunks.push(e.data);
        };

        VideoChat.recorder.start();
        VideoChat.isRecording = true;

        // UI обновления
        document.getElementById('btn-v-record').classList.add('recording');
        
        // Таймер (макс 60 сек как в ТГ)
        let sec = 0;
        const timerEl = document.getElementById('v-msg-timer');
        VideoChat.timerInterval = setInterval(() => {
            sec++;
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            timerEl.innerText = `${m}:${s < 10 ? '0'+s : s}`;
            
            if(sec >= 60) VideoChat.stopAndSend();
        }, 1000);
    },

    stopAndSend: () => {
        if (!VideoChat.recorder || !VideoChat.isRecording) return;
        
        VideoChat.recorder.onstop = () => {
            const blob = new Blob(VideoChat.chunks, { type: 'video/webm' });
            
            // Конвертация в Base64 и отправка
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64 = reader.result;
                // Отправляем через Chat модуль (4-й аргумент - video)
                Chat.pushMessage(null, '', null, base64);
                UI.toast("Video Sent", "success");
                VideoChat.closeRecorder();
            };
        };

        VideoChat.recorder.stop();
        VideoChat.isRecording = false;
        clearInterval(VideoChat.timerInterval);
    }
};