document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  const mainContent = document.getElementById('main-content');
  const video = document.getElementById('bgVideo');

  // Ждём клика по экрану
  document.body.addEventListener('click', () => {
    // Убираем загрузочный экран
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
      mainContent.classList.remove('hidden');
      
      // Включаем звук и запускаем видео
      video.muted = false;
      video.play().catch(err => {
        console.warn("Не удалось воспроизвести видео автоматически:", err);
        // Можно добавить кнопку "Разрешить звук", если браузер блокирует
      });
    }, 800);
  }, { once: true }); // Срабатывает только один раз
});