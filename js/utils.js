// Funções utilitárias gerais
const Utils = {
    // Debounce para otimizar performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Formatar números
    formatNumber(num, decimals = 3) {
        if (isNaN(num)) return 'NaN';
        if (!isFinite(num)) return num > 0 ? '∞' : '-∞';
        return Number(num.toFixed(decimals)).toString();
    },

    // Validar expressão matemática
    validateExpression(expression) {
        if (!expression.trim()) {
            throw new Error('Digite uma expressão matemática');
        }

        // Verificar caracteres perigosos
        const dangerousChars = /[;{}()\n\r\t]/;
        if (dangerousChars.test(expression)) {
            throw new Error('Expressão contém caracteres inválidos');
        }

        try {
            // Testar se a expressão é válida no math.js
            const testScope = { x: 1 };
            math.evaluate(expression, testScope);
            return true;
        } catch (error) {
            throw new Error(`Expressão inválida: ${error.message}`);
        }
    },

    // Criar função a partir de expressão
    createFunction(expression) {
        try {
            this.validateExpression(expression);
            const node = math.parse(expression);
            return (x) => {
                try {
                    return node.evaluate({ x: x });
                } catch (e) {
                    return NaN;
                }
            };
        } catch (error) {
            throw error;
        }
    },

    // Mostrar notificação
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
            type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
            'bg-blue-100 text-blue-800 border border-blue-300'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${
                    type === 'success' ? 'check-circle' :
                    type === 'error' ? 'exclamation-circle' :
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle'
                } mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);
    },

    // Mostrar/ocultar loading
    showLoading(message = 'Processando...') {
        document.getElementById('loading-message').textContent = message;
        document.getElementById('loading-overlay').style.display = 'flex';
    },

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }
};

// Exportar para uso global
window.Utils = Utils;