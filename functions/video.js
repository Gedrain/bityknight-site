const Video = {
    localVideoTrack: null,
    localScreenTrack: null,
    isVideoEnabled: false,
    isScreenSharing: false,
    
    init: () => {
        console.log("Video Module Loaded");
    },

    // --- УПРАВЛЕНИЕ КАМЕРОЙ ---
    toggleCamera: async () => {
        if (!Voice.client || !Voice.currentChannel) {
            UI.toast("Connect to voice first", "error");
            return;
        }

        // Конфликт: если включена демонстрация, сначала выключаем её
        if (Video.isScreenSharing) {
            await Video.toggleScreenShare(); 
        }

        try {
            if (Video.isVideoEnabled) {
                // ВЫКЛЮЧЕНИЕ КАМЕРЫ
                if (Video.localVideoTrack) {
                    await Voice.client.unpublish(Video.localVideoTrack);
                    Video.localVideoTrack.stop();
                    Video.localVideoTrack.close();
                    Video.localVideoTrack = null;
                }
                
                Video.isVideoEnabled = false;
                Video.updateUI();
                UI.toast("Camera Disabled", "msg");
                
                // Скрываем локальное превью
                document.getElementById('video-local-preview').classList.add('hidden');
                document.getElementById('call-interface').classList.remove('video-active');

            } else {
                // ВКЛЮЧЕНИЕ КАМЕРЫ
                Video.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                await Voice.client.publish([Video.localVideoTrack]);
                
                Video.isVideoEnabled = true;
                Video.updateUI();
                UI.toast("Camera Enabled", "success");

                // Показываем локальное превью (PIP)
                const localDiv = document.getElementById('video-local-preview');
                localDiv.classList.remove('hidden');
                Video.localVideoTrack.play(localDiv);
                
                document.getElementById('call-interface').classList.add('video-active');
            }
        } catch (e) {
            console.error(e);
            UI.toast("Camera Error: " + e.message, "error");
        }
    },

    // --- ДЕМОНСТРАЦИЯ ЭКРАНА ---
    toggleScreenShare: async () => {
        if (!Voice.client || !Voice.currentChannel) {
            UI.toast("Connect to voice first", "error");
            return;
        }

        // Конфликт: если включена камера, выключаем её
        if (Video.isVideoEnabled) {
            await Video.toggleCamera(); 
        }

        try {
            if (Video.isScreenSharing) {
                // ВЫКЛЮЧЕНИЕ ЭКРАНА
                if (Video.localScreenTrack) {
                    await Voice.client.unpublish(Video.localScreenTrack);
                    Video.localScreenTrack.stop();
                    Video.localScreenTrack.close();
                    Video.localScreenTrack = null;
                }
                Video.isScreenSharing = false;
                Video.updateUI();
                UI.toast("Screen Share Stopped", "msg");

            } else {
                // ВКЛЮЧЕНИЕ ЭКРАНА
                Video.localScreenTrack = await AgoraRTC.createScreenVideoTrack({
                    encoderConfig: "1080p_1", // Хорошее качество
                    optimizationMode: "detail" // Оптимизация для текста
                });

                // Обработчик системной кнопки "Закрыть доступ"
                Video.localScreenTrack.on("track-ended", () => {
                    Video.toggleScreenShare(); // Вызываем свою функцию очистки
                });

                await Voice.client.publish([Video.localScreenTrack]);
                
                Video.isScreenSharing = true;
                Video.updateUI();
                UI.toast("Screen Share Active", "success");
            }

        } catch (e) {
            console.warn("Screen share cancelled", e);
            if (e.code !== "PERMISSION_DENIED") {
                 UI.toast("Screen Share Failed", "error");
            }
        }
    },

    // Обновление иконок кнопок
    updateUI: () => {
        const camBtn = document.getElementById('btn-ci-cam');
        const screenBtn = document.getElementById('btn-ci-screen');
        
        const camIcon = Video.isVideoEnabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
        
        if(camBtn) {
            camBtn.innerHTML = camIcon;
            camBtn.classList.toggle('active', Video.isVideoEnabled);
        }

        if(screenBtn) {
            screenBtn.classList.toggle('active', Video.isScreenSharing);
            screenBtn.style.color = Video.isScreenSharing ? '#00ff9d' : '#fff';
        }
    },

    // Рендер удаленного пользователя
    renderRemote: (user) => {
        const container = document.getElementById('video-remote-container');
        
        // Создаем контейнер, если нет
        let vidDiv = document.getElementById(`vid-${user.uid}`);
        if(!vidDiv) {
            vidDiv = document.createElement('div');
            vidDiv.id = `vid-${user.uid}`;
            vidDiv.className = 'remote-video-card'; // Стилизуем карточку
            // Стили для карточки внутри video-remote-box
            vidDiv.style.flex = "1 1 300px"; 
            vidDiv.style.maxWidth = "100%";
            vidDiv.style.height = "100%";
            vidDiv.style.maxHeight = "100%";
            container.appendChild(vidDiv);
        }

        user.videoTrack.play(vidDiv);
        document.getElementById('call-interface').classList.add('video-active');
    },

    // Полная очистка при выходе из канала
    cleanup: async () => {
        if (Video.localVideoTrack) {
            Video.localVideoTrack.stop();
            Video.localVideoTrack.close();
        }
        if (Video.localScreenTrack) {
            Video.localScreenTrack.stop();
            Video.localScreenTrack.close();
        }
        
        Video.localVideoTrack = null;
        Video.localScreenTrack = null;
        Video.isVideoEnabled = false;
        Video.isScreenSharing = false;
        
        Video.updateUI();
        
        // Очистка DOM элементов
        document.getElementById('video-remote-container').innerHTML = '';
        document.getElementById('video-local-preview').innerHTML = '';
        document.getElementById('video-local-preview').classList.add('hidden');
        document.getElementById('call-interface').classList.remove('video-active');
    }
};

document.addEventListener('DOMContentLoaded', Video.init);