// Estado global da aplicação com observável
const AppState = {
    currentMode: 'funcao',
    currentFunction: 'x^2',
    currentPlot: null,
    isProcessing: false,
    isDarkMode: true,
    showLegend: true,
    isTeacherMode: false,
    showStepByStep: false,
    history: [],
    userProgress: { exercises: [], concepts: [] },
    deferredPrompt: null,
    analytics: {
        sessions: 0,
        functionsCalculated: 0,
        exercisesAttempted: 0,
        lastVisit: null,
        events: []
    },
    updateTimeout: null,
    calculationCache: new Map(),
    
    // Observadores para reatividade
    observers: new Set(),
    
    // Métodos reativos
    set(key, value) {
        this[key] = value;
        this.notifyObservers(key, value);
    },
    
    subscribe(observer) {
        this.observers.add(observer);
    },
    
    unsubscribe(observer) {
        this.observers.delete(observer);
    },
    
    notifyObservers(key, value) {
        this.observers.forEach(observer => observer(key, value));
    }
};

// Inicialização da aplicação aprimorada
class CalculusVisionApp {
    constructor() {
        this.utils = window.Utils;
        this.calculator = window.Calculator;
        this.graph = window.Graph;
        this.storage = window.Storage;
        this.ui = window.UI;
        this.exercises = window.Exercises;
        this.export = window.Export;
        this.pwa = window.PWA;
        
        // Performance tracking
        this.performance = {
            startTime: null,
            calculationTimes: [],
            renderTimes: []
        };
        
        // Otimizações
        this.debounceTimers = new Map();
        this.idleCallback = null;
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Iniciar tracking de performance
            this.performance.startTime = performance.now();
            
            // Carregar dados do localStorage
            await this.loadSavedData();
            
            // Inicializar componentes da UI
            await this.initializeUI();
            
            // Configurar event listeners otimizados
            this.setupOptimizedEventListeners();
            
            // Configurar PWA
            await this.setupPWA();
            
            // Inicializar analytics
            this.initAnalytics();
            
            // Inicializar com função padrão (deferida para idle time)
            this.scheduleIdleTask(() => {
                this.calculateAndPlot();
            });
            
            // Monitorar performance
            this.setupPerformanceMonitoring();
            
            console.log('CalculusVision Pro v2.1.0 inicializado com sucesso!');
            
        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
            this.utils.showNotification('Erro ao inicializar a aplicação', 'error');
        }
    }

    async loadSavedData() {
        try {
            AppState.history = JSON.parse(localStorage.getItem('calculusHistory')) || [];
            AppState.userProgress = JSON.parse(localStorage.getItem('userProgress')) || { 
                exercises: [], 
                concepts: [] 
            };
            
            const savedTheme = localStorage.getItem('calculusTheme');
            if (savedTheme === 'light') {
                AppState.isDarkMode = false;
                this.updateThemeUI();
            }
            
            const savedMode = localStorage.getItem('calculusMode');
            if (savedMode === 'teacher') {
                this.setModeType('teacher');
            }
        } catch (error) {
            console.warn('Erro ao carregar dados salvos:', error);
        }
    }

    async initializeUI() {
        // Configurar tema
        this.updateThemeUI();
        
        // Configurar modo
        this.updateModeUI();
        
        // Configurar tabs
        this.setCalcMode(AppState.currentMode);
        
        // Atualizar histórico
        this.updateHistoryDisplay();
        
        // Atualizar progresso
        this.updateProgress();
        
        // Inicializar tooltips
        this.initializeTooltips();
        
        // Configurar animações de entrada
        this.setupEntranceAnimations();
    }

    setupOptimizedEventListeners() {
        // Usar event delegation para melhor performance
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        document.addEventListener('input', this.handleGlobalInput.bind(this));
        document.addEventListener('change', this.handleGlobalChange.bind(this));
        
        // Eventos específicos que precisam de tratamento especial
        this.setupSpecificEventListeners();
    }

    setupSpecificEventListeners() {
        // Teclado matemático - usar event delegation
        const keyboardContainer = document.getElementById('keyboard-container');
        if (keyboardContainer) {
            keyboardContainer.addEventListener('click', (e) => {
                const symbolBtn = e.target.closest('[data-symbol]');
                if (symbolBtn) {
                    this.insertSymbol(symbolBtn.dataset.symbol);
                }
                
                if (e.target.closest('#backspace-btn')) {
                    this.backspace();
                }
            });
        }
        
        // Slider do ponto com requestAnimationFrame para suavidade
        const slider = document.getElementById('x-slider');
        if (slider) {
            let isDragging = false;
            let rafId = null;
            
            const updateSlider = () => {
                this.updatePointValue(slider.value);
                rafId = null;
            };
            
            slider.addEventListener('input', () => {
                if (!isDragging) {
                    isDragging = true;
                }
                
                if (rafId) {
                    cancelAnimationFrame(rafId);
                }
                
                rafId = requestAnimationFrame(updateSlider);
            });
            
            slider.addEventListener('change', () => {
                isDragging = false;
                this.updatePointValue(slider.value);
            });
        }
        
        // Observar mudanças no tema para otimizar gráfico
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('change', () => {
                this.debounce('theme', () => this.toggleTheme(), 100);
            });
        }
    }

    handleGlobalClick(e) {
        // Delegar eventos de clique
        const target = e.target;
        
        // Modo professor/aluno
        if (target.closest('#mode-toggle')) {
            e.stopPropagation();
            this.toggleMode();
            return;
        }
        
        if (target.closest('[data-mode]')) {
            const mode = target.closest('[data-mode]').dataset.mode;
            this.setModeType(mode);
            return;
        }
        
        // Tabs
        const tabBtn = target.closest('[data-tab]');
        if (tabBtn) {
            this.setCalcMode(tabBtn.dataset.tab);
            return;
        }
        
        // Botões de ponto rápido
        const pointBtn = target.closest('[data-point]');
        if (pointBtn) {
            this.setPoint(parseFloat(pointBtn.dataset.point));
            return;
        }
        
        // Exemplos
        const exampleBtn = target.closest('[data-example]');
        if (exampleBtn) {
            this.useExample(exampleBtn.dataset.example);
            return;
        }
        
        // Histórico
        const historyBtn = target.closest('[data-history-index]');
        if (historyBtn) {
            const index = historyBtn.dataset.historyIndex;
            this.useHistoryItem(index);
            return;
        }
        
        // Botões de controle do gráfico
        if (target.closest('#fullscreen-btn')) {
            this.graph.toggleFullscreen();
            return;
        }
        
        if (target.closest('#export-btn')) {
            this.showExportOptions();
            return;
        }
        
        if (target.closest('#reset-view-btn')) {
            this.graph.resetView();
            return;
        }
        
        if (target.closest('#legend-toggle')) {
            this.graph.toggleLegend();
            return;
        }
        
        // Botões principais
        if (target.closest('#calculate-btn')) {
            this.calculateAndPlot();
            return;
        }
        
        if (target.closest('#clear-btn')) {
            this.clearFunction();
            return;
        }
        
        if (target.closest('#examples-btn')) {
            this.showExamples();
            return;
        }
        
        if (target.closest('#history-btn')) {
            this.showHistory();
            return;
        }
        
        if (target.closest('#step-toggle')) {
            this.toggleStepByStep();
            return;
        }
        
        if (target.closest('#feedback-btn')) {
            this.showFeedbackModal();
            return;
        }
        
        if (target.closest('#keyboard-toggle')) {
            this.toggleKeyboard();
            return;
        }
        
        // Fechar modais
        if (target.closest('.modal-close')) {
            this.hideModal(target.closest('.modal'));
            return;
        }
        
        // Fechar dropdown de modo
        if (!target.closest('.relative') && !target.closest('#mode-dropdown')) {
            document.getElementById('mode-dropdown').classList.add('hidden');
        }
    }

    handleGlobalInput(e) {
        // Input da função com debounce
        if (e.target.id === 'func-input') {
            this.debounce('function-input', () => {
                if (e.target.value.trim() && AppState.currentMode === 'funcao') {
                    this.previewFunction(e.target.value);
                }
            }, 300);
            
            // Enter para calcular
            if (e.key === 'Enter') {
                this.calculateAndPlot();
            }
        }
        
        // Controles de integração
        if (e.target.id === 'integral-a' || e.target.id === 'integral-b') {
            this.debounce('integral-input', () => {
                if (AppState.currentMode === 'integral' && AppState.currentFunction) {
                    this.updatePlot();
                }
            }, 500);
        }
    }

    handleGlobalChange(e) {
        // Checkboxes de visualização
        if (e.target.matches('#common-options input, #limit-options input')) {
            this.debounce('options-change', () => this.updatePlot(), 200);
        }
        
        // Checkbox de integral imprópria
        if (e.target.id === 'improper-integral') {
            if (AppState.currentMode === 'integral') {
                this.updatePlot();
            }
        }
        
        // Checkbox de feedback
        if (e.target.id === 'feedback-contact') {
            // Nada especial, apenas manter o estado
        }
    }

    debounce(key, fn, delay) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            fn();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }

    scheduleIdleTask(fn) {
        if ('requestIdleCallback' in window) {
            this.idleCallback = requestIdleCallback(
                () => fn(),
                { timeout: 1000 }
            );
        } else {
            setTimeout(fn, 100);
        }
    }

    // Métodos principais otimizados
    calculateAndPlot() {
        const funcInput = document.getElementById('func-input');
        if (!funcInput) return;
        
        const expression = funcInput.value.trim();
        if (!expression) {
            this.utils.showNotification('Digite uma função para calcular', 'error');
            return;
        }

        // Verificar cache
        const cacheKey = `plot_${expression}_${AppState.currentMode}`;
        if (AppState.calculationCache.has(cacheKey)) {
            const cached = AppState.calculationCache.get(cacheKey);
            this.renderCachedResult(cached);
            return;
        }

        AppState.currentFunction = expression;
        this.addToHistory(expression);
        
        // Mostrar feedback visual imediato
        this.showCalculationFeedback();
        
        // Usar Web Workers se disponível para cálculos pesados
        if (window.Worker && expression.length > 20) {
            this.calculateWithWorker(expression);
        } else {
            // Cálculo síncrono para expressões simples
            setTimeout(() => {
                try {
                    const startTime = performance.now();
                    this.processFunction();
                    const endTime = performance.now();
                    
                    // Track performance
                    this.performance.calculationTimes.push(endTime - startTime);
                    this.trackPerformance();
                    
                    // Cache do resultado
                    const result = this.getCurrentResult();
                    AppState.calculationCache.set(cacheKey, result);
                    
                    // Limitar cache
                    if (AppState.calculationCache.size > 20) {
                        const firstKey = AppState.calculationCache.keys().next().value;
                        AppState.calculationCache.delete(firstKey);
                    }
                    
                } catch (error) {
                    this.utils.hideLoading();
                    this.utils.showNotification(error.message, 'error');
                }
            }, 10);
        }
        
        // Track event
        this.trackEvent('function_calculated', {
            function: expression,
            mode: AppState.currentMode,
            length: expression.length
        });
    }

    showCalculationFeedback() {
        // Feedback visual durante o cálculo
        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando...';
            calculateBtn.disabled = true;
        }
        
        // Mostrar indicador de progresso
        this.utils.showLoading('Processando...', false);
        
        // Animar o gráfico
        const plotDiv = document.getElementById('plot');
        if (plotDiv) {
            plotDiv.classList.add('pulse-animation');
        }
    }

    hideCalculationFeedback() {
        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.innerHTML = '<i class="fas fa-play"></i> Calcular e Plotar';
            calculateBtn.disabled = false;
        }
        
        const plotDiv = document.getElementById('plot');
        if (plotDiv) {
            plotDiv.classList.remove('pulse-animation');
        }
    }

    calculateWithWorker(expression) {
        // Implementação básica de Web Worker (precisa do arquivo worker.js)
        if (!this.worker) {
            this.worker = new Worker('js/calculator-worker.js');
            
            this.worker.onmessage = (e) => {
                const { type, data } = e.data;
                
                if (type === 'result') {
                    this.processWorkerResult(data);
                } else if (type === 'progress') {
                    this.updateProgressBar(data.progress);
                } else if (type === 'error') {
                    this.utils.hideLoading();
                    this.utils.showNotification(data.message, 'error');
                }
            };
            
            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                this.utils.hideLoading();
                this.utils.showNotification('Erro no cálculo', 'error');
            };
        }
        
        // Enviar dados para o worker
        this.worker.postMessage({
            type: 'calculate',
            data: {
                expression: expression,
                mode: AppState.currentMode,
                point: parseFloat(document.getElementById('x-slider').value),
                options: this.getCurrentOptions()
            }
        });
    }

    processWorkerResult(result) {
        try {
            // Processar resultado do worker
            this.graph.plotGraph(result.data, result.annotations);
            this.renderAnalysis(result.analysis);
            
            // Marcar conceito como aprendido
            this.markConceptLearned(AppState.currentMode);
            
            this.utils.hideLoading();
            this.hideCalculationFeedback();
            
        } catch (error) {
            this.utils.hideLoading();
            this.utils.showNotification('Erro ao processar resultado', 'error');
        }
    }

    processFunction() {
        if (!AppState.currentFunction) return;
        
        const startTime = performance.now();
        
        try {
            const a = parseFloat(document.getElementById('x-slider').value);
            const data = [];
            const annotations = [];
            
            // Criar função
            const f = this.utils.createFunction(AppState.currentFunction);
            if (!f) throw new Error('Função inválida');
            
            // Gerar pontos com adaptive sampling
            const points = this.generateAdaptivePoints(f);
            data.push({
                x: points.x,
                y: points.y,
                name: 'f(x)',
                type: 'scatter',
                mode: 'lines',
                line: {color: '#6366f1', width: 3},
                hovertemplate: 'x: %{x:.3f}<br>f(x): %{y:.3f}<extra></extra>'
            });
            
            // Análise baseada no modo
            let analysisHTML = '';
            switch(AppState.currentMode) {
                case 'derivada':
                    analysisHTML = this.analyzeDerivativeAdvanced(AppState.currentFunction, f, a, data, annotations);
                    break;
                case 'integral':
                    const integralA = parseFloat(document.getElementById('integral-a').value);
                    const integralB = parseFloat(document.getElementById('integral-b').value);
                    const isImproper = document.getElementById('improper-integral').checked;
                    analysisHTML = this.analyzeIntegralAdvanced(AppState.currentFunction, f, integralA, integralB, data, annotations, isImproper);
                    break;
                case 'limite':
                    analysisHTML = this.analyzeLimitAdvanced(AppState.currentFunction, f, a, data, annotations);
                    break;
                default:
                    analysisHTML = this.analyzeFunctionAdvanced(AppState.currentFunction, f, a);
            }
            
            // Análise adicional
            if (document.getElementById('show-extrema')?.checked || document.getElementById('show-inflection')?.checked) {
                const extremaAnalysis = this.calculator.analyzeExtremaAndConcavity(AppState.currentFunction);
                this.addExtremaToGraph(extremaAnalysis, data);
                analysisHTML += this.generateExtremaHTMLAdvanced(extremaAnalysis);
            }
            
            // Ponto de estudo
            this.addStudyPoint(f, a, data);
            
            // Plotar gráfico
            this.graph.plotGraph(data, annotations);
            
            // Atualizar análise
            this.renderAnalysis(analysisHTML);
            
            // Conteúdo adicional
            this.renderAdditionalContent();
            
            const endTime = performance.now();
            this.trackRenderTime(endTime - startTime);
            
        } catch (error) {
            throw new Error(`Erro na função: ${error.message}`);
        }
    }

    generateAdaptivePoints(f, minX = -5, maxX = 5, maxPoints = 500) {
        const x = [];
        const y = [];
        
        // Amostragem inicial uniforme
        const initialStep = (maxX - minX) / 100;
        
        for (let xi = minX; xi <= maxX; xi += initialStep) {
            try {
                const yi = f(xi);
                if (isFinite(yi)) {
                    x.push(xi);
                    y.push(yi);
                } else {
                    x.push(null);
                    y.push(null);
                }
            } catch (e) {
                x.push(null);
                y.push(null);
            }
        }
        
        // Refinar onde a função muda rapidamente
        if (x.length < maxPoints) {
            for (let i = 1; i < x.length - 1; i++) {
                if (x[i] !== null && x[i-1] !== null && x[i+1] !== null) {
                    const derivative = Math.abs((y[i+1] - y[i-1]) / (x[i+1] - x[i-1]));
                    
                    if (derivative > 10) {
                        // Adicionar mais pontos em regiões de alta derivada
                        const newX = (x[i] + x[i+1]) / 2;
                        try {
                            const newY = f(newX);
                            if (isFinite(newY)) {
                                x.splice(i+1, 0, newX);
                                y.splice(i+1, 0, newY);
                                i++; // Pular o ponto adicionado
                            }
                        } catch (e) {
                            // Ignorar
                        }
                    }
                }
            }
        }
        
        return { x, y };
    }

    analyzeDerivativeAdvanced(expression, f, a, data, annotations) {
        try {
            const result = this.calculator.calculateDerivative(expression, a);
            
            // Adicionar reta tangente
            if (document.getElementById('show-tangent')?.checked) {
                const tangentData = this.graph.generateTangentData(expression, a);
                data.push(...tangentData);
                
                // Adicionar normal se solicitado
                if (document.getElementById('show-normal')?.checked) {
                    const normalData = this.generateNormalData(expression, a);
                    data.push(...normalData);
                }
            }
            
            // Adicionar círculo osculador se curvatura disponível
            if (result.curvature && result.curvature.radius < 10) {
                const osculatingCircle = this.generateOsculatingCircle(expression, a, result.curvature.radius);
                data.push(...osculatingCircle);
            }
            
            return this.renderDerivativeAnalysis(result, a);
            
        } catch (e) {
            return `<div class="text-red-500">Erro no cálculo da derivada: ${e.message}</div>`;
        }
    }

    analyzeIntegralAdvanced(expression, f, a, b, data, annotations, isImproper = false) {
        try {
            const result = this.calculator.calculateIntegral(expression, a, b, { improper: isImproper });
            
            // Mostrar área
            if (document.getElementById('show-area')?.checked) {
                const areaData = this.graph.generateAreaData(expression, [a, b]);
                data.push(...areaData);
                
                // Adicionar retângulos de Riemann se solicitado
                if (document.getElementById('show-riemann')?.checked) {
                    const riemannData = this.generateRiemannSum(expression, a, b);
                    data.push(...riemannData);
                }
            }
            
            return this.renderIntegralAnalysis(result, a, b);
            
        } catch (e) {
            return `<div class="text-red-500">Erro no cálculo da integral: ${e.message}</div>`;
        }
    }

    analyzeLimitAdvanced(expression, f, a, data, annotations) {
        try {
            const result = this.calculator.calculateLimit(expression, a, 'both', true);
            
            // Adicionar visualização epsilon-delta
            if (document.getElementById('show-epsilon-delta')?.checked) {
                const epsilonDelta = this.generateEpsilonDeltaVisualization(expression, a, result);
                data.push(...epsilonDelta);
                annotations.push(...this.generateEpsilonDeltaAnnotations(a, result));
            }
            
            return this.renderLimitAnalysis(result, a);
            
        } catch (e) {
            return `<div class="text-red-500">Erro no cálculo do limite: ${e.message}</div>`;
        }
    }

    analyzeFunctionAdvanced(expression, f, a) {
        const fa = f(a);
        const analysis = this.calculator.analyzeExtremaAndConcavity(expression);
        
        return `
            <div class="space-y-6">
                <div class="gradient-card p-4">
                    <div class="text-center mb-3">
                        <div class="text-sm text-slate-500 mb-1">Valor da função</div>
                        <div class="math-symbol text-xl font-bold">
                            f(${a.toFixed(2)})
                        </div>
                    </div>
                    
                    <div class="bg-emerald-50 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-emerald-700">
                            ${this.utils.formatNumber(fa)}
                        </div>
                        <div class="mt-2 text-sm text-slate-600">
                            <i class="fas fa-chart-line mr-1"></i>
                            Ponto: (${a.toFixed(2)}, ${this.utils.formatNumber(fa)})
                        </div>
                    </div>
                </div>
                
                ${this.generateFunctionInsights(expression, a, fa, analysis)}
            </div>
        `;
    }

    generateFunctionInsights(expression, a, fa, analysis) {
        let insights = '';
        
        // Insights baseados na análise
        if (analysis.criticalPoints.length > 0) {
            const nearestCritical = analysis.criticalPoints.reduce((nearest, point) => {
                const distance = Math.abs(point.x - a);
                return distance < Math.abs(nearest.x - a) ? point : nearest;
            });
            
            insights += `
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                    <h4 class="font-bold text-blue-800 mb-2">
                        <i class="fas fa-bullseye mr-2"></i>
                        Ponto Crítico Próximo
                    </h4>
                    <div class="text-sm text-blue-700">
                        Há um ${nearestCritical.type} em x = ${nearestCritical.x.toFixed(2)}
                        ${Math.abs(nearestCritical.x - a) < 1 ? '(muito próximo!)' : ''}
                    </div>
                </div>
            `;
        }
        
        // Insights sobre comportamento
        const f = this.utils.createFunction(expression);
        const left = f(a - 0.1);
        const right = f(a + 0.1);
        
        if (isFinite(left) && isFinite(right)) {
            const increasing = right > left;
            insights += `
                <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                    <h4 class="font-bold text-purple-800 mb-2">
                        <i class="fas fa-chart-line mr-2"></i>
                        Comportamento Local
                    </h4>
                    <div class="text-sm text-purple-700">
                        A função está ${increasing ? 'crescendo' : 'decrescendo'} nas proximidades deste ponto.
                    </div>
                </div>
            `;
        }
        
        return insights ? `<div class="space-y-4">${insights}</div>` : '';
    }

    addExtremaToGraph(analysis, data) {
        if (document.getElementById('show-extrema')?.checked) {
            analysis.criticalPoints.forEach(point => {
                data.push({
                    x: [point.x],
                    y: [point.value],
                    name: `Ponto ${point.type}`,
                    mode: 'markers',
                    marker: {
                        size: 12,
                        color: point.type === 'mínimo' ? '#10b981' : 
                               point.type === 'máximo' ? '#f43f5e' : '#f59e0b',
                        symbol: point.type === 'mínimo' ? 'triangle-down' :
                                point.type === 'máximo' ? 'triangle-up' : 'diamond',
                        line: {color: 'white', width: 2}
                    }
                });
            });
        }
        
        if (document.getElementById('show-inflection')?.checked) {
            analysis.inflectionPoints.forEach(point => {
                data.push({
                    x: [point.x],
                    y: [point.value],
                    name: 'Ponto de Inflexão',
                    mode: 'markers',
                    marker: {
                        size: 10,
                        color: '#8b5cf6',
                        symbol: 'cross',
                        line: {color: 'white', width: 2}
                    }
                });
            });
        }
    }

    generateExtremaHTMLAdvanced(analysis) {
        let html = '';
        
        if (analysis.criticalPoints.length > 0) {
            html += `
                <div class="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg mt-4">
                    <h4 class="font-bold text-emerald-800 mb-2">
                        <i class="fas fa-chart-line mr-2"></i>
                        Análise de Extremos
                    </h4>
                    <div class="text-sm text-emerald-700">
                        <p class="mb-2"><strong>${analysis.criticalPoints.length} ponto(s) crítico(s) encontrado(s):</strong></p>
                        <div class="grid grid-cols-2 gap-2">
            `;
            
            analysis.criticalPoints.forEach(point => {
                html += `
                    <div class="p-2 bg-white rounded border">
                        <div class="font-medium ${point.type === 'mínimo' ? 'text-green-600' : 
                                                 point.type === 'máximo' ? 'text-red-600' : 'text-amber-600'}">
                            ${point.type.toUpperCase()}
                        </div>
                        <div class="text-xs">
                            x = ${point.x.toFixed(3)}<br>
                            f(x) = ${point.value.toFixed(3)}
                        </div>
                    </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (analysis.intervals.increasing.length > 0 || analysis.intervals.decreasing.length > 0) {
            html += `
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mt-4">
                    <h4 class="font-bold text-blue-800 mb-2">
                        <i class="fas fa-arrow-trend-up mr-2"></i>
                        Intervalos de Monotonia
                    </h4>
                    <div class="text-sm text-blue-700">
            `;
            
            if (analysis.intervals.increasing.length > 0) {
                html += `
                    <p class="mb-1"><strong>Crescente em:</strong></p>
                    <div class="flex flex-wrap gap-1 mb-2">
                        ${analysis.intervals.increasing.map(interval => 
                            `<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                [${interval.start}, ${interval.end}]
                            </span>`
                        ).join('')}
                    </div>
                `;
            }
            
            if (analysis.intervals.decreasing.length > 0) {
                html += `
                    <p class="mb-1"><strong>Decrescente em:</strong></p>
                    <div class="flex flex-wrap gap-1">
                        ${analysis.intervals.decreasing.map(interval => 
                            `<span class="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                [${interval.start}, ${interval.end}]
                            </span>`
                        ).join('')}
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    addStudyPoint(f, a, data) {
        try {
            const fa = f(a);
            data.push({
                x: [a],
                y: [fa],
                name: `Ponto (${a.toFixed(1)}, ${fa.toFixed(2)})`,
                mode: 'markers+text',
                marker: {
                    size: 12,
                    color: '#f43f5e',
                    line: {color: 'white', width: 2}
                },
                text: [`(${a.toFixed(1)}, ${fa.toFixed(2)})`],
                textposition: 'top right',
                hovertemplate: `Ponto de estudo<br>x: ${a.toFixed(3)}<br>f(x): ${fa.toFixed(3)}<extra></extra>`
            });
        } catch (e) {
            // Pode não ser definido nesse ponto
        }
    }

    renderAnalysis(html) {
        const container = document.getElementById('analysis-output');
        if (!container) return;
        
        // Animar entrada
        container.style.opacity = '0';
        container.innerHTML = html;
        
        requestAnimationFrame(() => {
            container.style.transition = 'opacity 0.3s ease';
            container.style.opacity = '1';
        });
        
        // Inicializar MathJax se disponível
        if (window.MathJax) {
            MathJax.typesetPromise([container]);
        }
    }

    renderAdditionalContent() {
        // Gerar passo a passo
        if (AppState.showStepByStep && AppState.isTeacherMode) {
            const a = parseFloat(document.getElementById('x-slider').value);
            const steps = this.calculator.generateDerivativeSteps(AppState.currentFunction, a);
            this.displayStepByStepEnhanced(steps);
        }
        
        // Gerar explicação conceitual
        if (AppState.isTeacherMode) {
            const explanations = this.generateConceptExplanationAdvanced(AppState.currentMode);
            this.displayConceptExplanationEnhanced(explanations);
        }
        
        // Gerar perguntas orientadoras
        const questions = this.generateGuidingQuestionsAdvanced(AppState.currentMode, a);
        this.displayGuidingQuestionsEnhanced(questions);
        
        // Mostrar cálculos simbólicos
        this.showSymbolicCalculationsEnhanced(AppState.currentFunction);
    }

    displayStepByStepEnhanced(steps) {
        const container = document.getElementById('step-by-step-content');
        if (!container) return;
        
        container.innerHTML = '';
        
        steps.forEach(step => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step-by-step';
            stepDiv.innerHTML = `
                <div class="flex items-start">
                    <div class="step-number">${step.step}</div>
                    <div class="flex-1">
                        <div class="font-bold text-indigo-700 mb-1 flex items-center gap-2">
                            <i class="fas fa-${step.icon || 'circle'} text-indigo-400"></i>
                            ${step.title}
                        </div>
                        <div class="text-sm">${step.content}</div>
                    </div>
                </div>
            `;
            container.appendChild(stepDiv);
        });
        
        document.getElementById('step-by-step-container').classList.remove('hidden');
    }

    generateConceptExplanationAdvanced(mode) {
        const explanations = [];
        
        switch(mode) {
            case 'derivada':
                explanations.push(
                    'A derivada representa a <strong>taxa de variação instantânea</strong>. Em física, é velocidade; em economia, é custo marginal.',
                    'Geometricamente, é a <strong>inclinação da reta tangente</strong>. Derivada positiva = função crescente; negativa = decrescente.',
                    'Pontos onde a derivada é zero são <strong>críticos</strong>: podem ser máximos, mínimos ou pontos de sela.',
                    'A segunda derivada indica <strong>concavidade</strong>: positiva = côncava para cima; negativa = para baixo.'
                );
                break;
                
            case 'integral':
                explanations.push(
                    'A integral definida calcula a <strong>área líquida</strong> sob a curva. Áreas acima do eixo são positivas, abaixo são negativas.',
                    'O <strong>Teorema Fundamental do Cálculo</strong> conecta derivadas e integrais: são operações inversas.',
                    'Integrais impróprias lidam com intervalos infinitos ou descontinuidades. Convergem se o limite existe.',
                    'Em física, integrais calculam trabalho, energia, centro de massa e muitos outros conceitos.'
                );
                break;
                
            case 'limite':
                explanations.push(
                    'Limites descrevem <strong>comportamento de aproximação</strong>, não necessariamente valores exatos.',
                    'Uma função é contínua se limite e valor coincidem: $\\lim_{x→a} f(x) = f(a)$.',
                    'Limites infinitos indicam <strong>assíntotas verticais</strong>. Limites em infinito indicam comportamento assintótico.',
                    'A definição ε-δ formaliza a ideia intuitiva de "tão próximo quanto quisermos".'
                );
                break;
        }
        
        return explanations.map((exp, i) => ({
            text: exp,
            icon: ['lightbulb', 'chart-line', 'calculator', 'rocket'][i % 4]
        }));
    }

    displayConceptExplanationEnhanced(explanations) {
        const container = document.getElementById('concept-explanation-content');
        if (!container) return;
        
        container.innerHTML = '';
        
        explanations.forEach((exp, index) => {
            const expDiv = document.createElement('div');
            expDiv.className = 'concept-explanation';
            expDiv.innerHTML = `
                <div class="flex items-start">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                        <i class="fas fa-${exp.icon} text-amber-600"></i>
                    </div>
                    <div class="flex-1">
                        <div class="text-sm leading-relaxed">${exp.text}</div>
                    </div>
                </div>
            `;
            container.appendChild(expDiv);
        });
        
        document.getElementById('concept-explanation-container').classList.remove('hidden');
    }

    // Métodos auxiliares para renderização
    renderDerivativeAnalysis(result, a) {
        return `
            <div class="space-y-6">
                <div class="gradient-card p-4">
                    <div class="text-center mb-3">
                        <div class="text-sm text-slate-500 mb-1">Derivada no ponto</div>
                        <div class="math-symbol text-xl font-bold">
                            f'(${a.toFixed(2)})
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-emerald-50 p-4 rounded-lg">
                            <div class="text-sm text-emerald-600 mb-1">Valor numérico</div>
                            <div class="text-2xl font-bold text-emerald-700">
                                ${this.utils.formatNumber(result.numeric)}
                            </div>
                            <div class="mt-2 text-sm text-slate-600">
                                <i class="fas fa-calculator mr-1"></i>
                                f'(x) = ${result.symbolic}
                            </div>
                        </div>
                        
                        ${result.secondDerivative !== null ? `
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <div class="text-sm text-blue-600 mb-1">Segunda derivada</div>
                            <div class="text-xl font-bold text-blue-700">
                                f''(${a.toFixed(2)}) = ${this.utils.formatNumber(result.secondDerivative)}
                            </div>
                            <div class="mt-1 text-xs text-slate-600">
                                ${result.secondDerivative > 0 ? 'Concavidade para cima' : 
                                  result.secondDerivative < 0 ? 'Concavidade para baixo' : 
                                  'Possível ponto de inflexão'}
                            </div>
                        </div>` : ''}
                        
                        ${result.curvature ? `
                        <div class="bg-purple-50 p-4 rounded-lg">
                            <div class="text-sm text-purple-600 mb-1">Curvatura</div>
                            <div class="text-lg font-bold text-purple-700">
                                κ = ${result.curvature.value.toFixed(4)}
                            </div>
                            <div class="text-xs text-slate-600">
                                Raio: ${result.curvature.radius.toFixed(2)} unidades
                            </div>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
                    <h4 class="font-bold text-indigo-800 mb-2">
                        <i class="fas fa-ruler-combined mr-2"></i>
                        Reta Tangente
                    </h4>
                    <div class="text-sm text-indigo-700">
                        ${result.tangentEquation}
                    </div>
                </div>
            </div>
        `;
    }

    // Outros métodos auxiliares de renderização...
    renderIntegralAnalysis(result, a, b) {
        // Implementação similar para integrais
        return `
            <div class="space-y-6">
                <div class="gradient-card p-4">
                    <div class="text-center mb-3">
                        <div class="text-sm text-slate-500 mb-1">Integral Definida</div>
                        <div class="math-symbol text-xl font-bold">
                            ∫<sub>${a.toFixed(2)}</sub><sup>${b.toFixed(2)}</sup> f(x) dx
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-emerald-50 p-4 rounded-lg">
                            <div class="text-sm text-emerald-600 mb-1">Resultado (${result.method})</div>
                            <div class="text-2xl font-bold text-emerald-700">
                                ${this.utils.formatNumber(result.numeric)}
                            </div>
                            ${result.errorEstimate ? `
                            <div class="mt-1 text-xs text-slate-600">
                                Estimativa de erro: ±${result.errorEstimate.toFixed(6)}
                            </div>` : ''}
                        </div>
                        
                        ${result.symbolic ? `
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <div class="text-sm text-blue-600 mb-1">Primitiva</div>
                            <div class="text-sm font-mono text-blue-700">
                                F(x) = ${result.symbolic} + C
                            </div>
                        </div>` : ''}
                        
                        ${result.properties ? `
                        <div class="bg-amber-50 p-4 rounded-lg">
                            <div class="text-sm text-amber-600 mb-1">Propriedades</div>
                            <div class="text-xs text-amber-700 space-y-1">
                                ${result.properties.symmetric ? '<div>✓ Simétrica no intervalo</div>' : ''}
                                ${result.properties.odd ? '<div>✓ Função ímpar</div>' : ''}
                                ${result.properties.even ? '<div>✓ Função par</div>' : ''}
                                ${result.properties.positive ? '<div>✓ Predominantemente positiva</div>' : ''}
                                ${result.properties.negative ? '<div>✓ Predominantemente negativa</div>' : ''}
                            </div>
                        </div>` : ''}
                    </div>
                </div>
                
                ${result.convergence ? `
                <div class="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg">
                    <h4 class="font-bold text-amber-800 mb-2">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        Análise de Convergência
                    </h4>
                    <div class="text-sm text-amber-700">
                        <div class="mb-2">${result.convergence.tests.join('<br>')}</div>
                        ${result.convergence.converges !== null ? `
                        <div class="font-medium">
                            ${result.convergence.converges ? '✓ Parece convergente' : '⚠ Pode divergir'}
                        </div>` : ''}
                    </div>
                </div>` : ''}
            </div>
        `;
    }

    // Otimizações de performance
    setupPerformanceMonitoring() {
        // Monitorar FPS
        if (typeof performance !== 'undefined') {
            let frameCount = 0;
            let lastTime = performance.now();
            
            const checkFPS = () => {
                frameCount++;
                const currentTime = performance.now();
                
                if (currentTime - lastTime >= 1000) {
                    const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                    
                    if (fps < 30) {
                        console.warn(`Baixo FPS: ${fps}. Considerando otimizações.`);
                        this.enablePerformanceMode();
                    }
                    
                    frameCount = 0;
                    lastTime = currentTime;
                }
                
                requestAnimationFrame(checkFPS);
            };
            
            requestAnimationFrame(checkFPS);
        }
    }

    enablePerformanceMode() {
        // Reduzir qualidade gráfica
        if (this.graph.currentPlot) {
            Plotly.relayout(this.graph.currentPlot, {
                'plotGlPixelRatio': 1
            });
        }
        
        // Limitar animações
        document.body.classList.add('performance-mode');
        
        // Limpar cache antigo
        this.calculator.clearCache();
        AppState.calculationCache.clear();
    }

    trackRenderTime(time) {
        this.performance.renderTimes.push(time);
        
        // Manter apenas os últimos 100 tempos
        if (this.performance.renderTimes.length > 100) {
            this.performance.renderTimes.shift();
        }
        
        // Log se renderização for muito lenta
        if (time > 100) {
            console.warn(`Renderização lenta: ${time.toFixed(1)}ms`);
        }
    }

    trackPerformance() {
        if (this.performance.calculationTimes.length >= 10) {
            const avgCalcTime = this.performance.calculationTimes.reduce((a, b) => a + b, 0) / 
                               this.performance.calculationTimes.length;
            const avgRenderTime = this.performance.renderTimes.length > 0 ? 
                                 this.performance.renderTimes.reduce((a, b) => a + b, 0) / 
                                 this.performance.renderTimes.length : 0;
            
            console.log(`Performance: Cálculo=${avgCalcTime.toFixed(1)}ms, Render=${avgRenderTime.toFixed(1)}ms`);
        }
    }

    // Métodos de utilidade
    initializeTooltips() {
        // Inicializar tooltips para elementos com data-tooltip
        document.querySelectorAll('[data-tooltip]').forEach(el => {
            el.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = el.dataset.tooltip;
                document.body.appendChild(tooltip);
                
                const rect = el.getBoundingClientRect();
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.top = `${rect.top - 30}px`;
                
                el._tooltip = tooltip;
            });
            
            el.addEventListener('mouseleave', () => {
                if (el._tooltip) {
                    el._tooltip.remove();
                    el._tooltip = null;
                }
            });
        });
    }

    setupEntranceAnimations() {
        // Animar entrada dos elementos
        const animateElements = document.querySelectorAll('.glass-card, .gradient-card');
        animateElements.forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, i * 50);
        });
    }

    previewFunction(expression) {
        // Preview rápido da função
        const previewDiv = document.getElementById('function-preview');
        if (!previewDiv) return;
        
        try {
            const f = this.utils.createFunction(expression);
            const samplePoints = [-2, -1, 0, 1, 2];
            const values = samplePoints.map(x => {
                try {
                    const y = f(x);
                    return isFinite(y) ? y.toFixed(2) : '∞';
                } catch (e) {
                    return '?';
                }
            });
            
            previewDiv.innerHTML = `
                <div class="text-xs text-slate-500">Preview:</div>
                <div class="text-sm font-mono">
                    ${samplePoints.map((x, i) => 
                        `f(${x}) = ${values[i]}`
                    ).join(' | ')}
                </div>
            `;
            previewDiv.classList.remove('hidden');
            
        } catch (e) {
            previewDiv.classList.add('hidden');
        }
    }

    getCurrentOptions() {
        return {
            showDerivative: document.getElementById('show-derivative')?.checked || false,
            showTangent: document.getElementById('show-tangent')?.checked || false,
            showArea: document.getElementById('show-area')?.checked || false,
            showExtrema: document.getElementById('show-extrema')?.checked || false,
            showInflection: document.getElementById('show-inflection')?.checked || false
        };
    }

    getCurrentResult() {
        return {
            expression: AppState.currentFunction,
            mode: AppState.currentMode,
            timestamp: new Date().toISOString()
        };
    }

    // Métodos existentes atualizados (mantendo compatibilidade)
    updatePointValue(value = null) {
        const slider = document.getElementById('x-slider');
        const display = document.getElementById('a-value');
        const point = value !== null ? parseFloat(value) : parseFloat(slider.value);
        
        if (display) {
            display.textContent = point.toFixed(1);
            
            // Animar mudança
            display.classList.add('scale-110');
            setTimeout(() => display.classList.remove('scale-110'), 200);
        }
        
        // Atualização otimizada do gráfico
        if (AppState.currentFunction && this.graph.currentPlot) {
            if (AppState.updateTimeout) {
                clearTimeout(AppState.updateTimeout);
            }
            
            AppState.updateTimeout = setTimeout(() => {
                this.updatePlotWithPointOptimized(point);
            }, 50);
        }
    }

    updatePlotWithPointOptimized(point) {
        // Usar requestAnimationFrame para suavidade
        requestAnimationFrame(() => {
            try {
                const f = this.utils.createFunction(AppState.currentFunction);
                const fa = f(point);
                
                // Atualizar apenas o ponto no gráfico
                if (this.graph.currentPlot) {
                    this.graph.updatePointOnPlot(point, fa);
                }
                
                // Atualizar cálculos relevantes
                this.updateRelevantCalculations(point);
                
            } catch (error) {
                console.warn('Não foi possível atualizar ponto:', error);
            }
        });
    }

    updateRelevantCalculations(point) {
        // Atualizar apenas cálculos que dependem do ponto
        switch(AppState.currentMode) {
            case 'derivada':
                this.updateDerivativeCalculation(point);
                break;
            case 'limite':
                this.updateLimitCalculation(point);
                break;
            default:
                this.updateFunctionValue(point);
        }
    }

    // ... (manter outros métodos existentes com pequenas otimizações)

    // Cleanup
    cleanup() {
        // Cancelar timeouts
        if (AppState.updateTimeout) {
            clearTimeout(AppState.updateTimeout);
        }
        
        // Cancelar idle callback
        if (this.idleCallback && 'cancelIdleCallback' in window) {
            cancelIdleCallback(this.idleCallback);
        }
        
        // Limpar workers
        if (this.worker) {
            this.worker.terminate();
        }
        
        // Limpar event listeners
        document.removeEventListener('click', this.handleGlobalClick);
        document.removeEventListener('input', this.handleGlobalInput);
        document.removeEventListener('change', this.handleGlobalChange);
        
        // Limpar tooltips
        document.querySelectorAll('[data-tooltip]').forEach(el => {
            if (el._tooltip) {
                el._tooltip.remove();
            }
        });
    }
}

// Exportar para uso global
window.CalculusVisionApp = CalculusVisionApp;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.calculusApp = new CalculusVisionApp();
});

// Limpar recursos ao descarregar a página
window.addEventListener('beforeunload', () => {
    if (window.calculusApp) {
        window.calculusApp.cleanup();
    }
});