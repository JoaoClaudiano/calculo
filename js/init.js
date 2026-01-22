// Inicialização otimizada para mobile
document.addEventListener('DOMContentLoaded', function() {
    // Detectar dispositivo
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Ajustes específicos para mobile
        document.body.classList.add('mobile-device');
        
        // Melhorar toques
        document.querySelectorAll('button, input').forEach(el => {
            el.style.minHeight = '44px';
        });
    }
    
    // Inicializar tema
    const savedTheme = localStorage.getItem('calculusTheme') || 'dark';
    document.body.classList.add(savedTheme);
    document.getElementById('theme-toggle').checked = savedTheme === 'dark';
    
    // Inicializar modo
    const savedMode = localStorage.getItem('calculusMode') || 'student';
    if (savedMode === 'teacher') {
        document.body.classList.add('teacher-mode');
        document.getElementById('mode-label').textContent = 'Professor';
    }
    
    // Carregar MathJax para renderização Latex
    if (typeof MathJax !== 'undefined') {
        MathJax.Hub.Config({
            tex2jax: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true
            }
        });
    }
    
    // Inicializar app
    if (window.calculusApp) {
        setTimeout(() => {
            window.calculusApp.calculateAndPlot();
        }, 100);
    }
    
    // Configurar PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('Service Worker registrado'))
                .catch(err => console.log('Service Worker falhou:', err));
        });
    }
});