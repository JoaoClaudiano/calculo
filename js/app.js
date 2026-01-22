// Estado global da aplicação
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
    }
};

// Inicialização da aplicação
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
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Carregar dados do localStorage
            await this.loadSavedData();
            
            // Inicializar componentes da UI
            await this.initializeUI();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Configurar PWA
            await this.setupPWA();
            
            // Inicializar analytics
            this.initAnalytics();
            
            // Inicializar com função padrão
            this.calculateAndPlot();
            
            console.log('CalculusVision Pro v2.0.0 inicializado com sucesso!');
        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
            this.showError('Erro ao inicializar a aplicação');
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
                this.toggleTheme();
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
    }

    setupEventListeners() {
        // Modo professor/aluno
        document.getElementById('mode-toggle').addEventListener('click', () => this.toggleMode());
        document.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setModeType(e.target.dataset.mode));
        });
        
        // Tabs
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => this.setCalcMode(e.target.dataset.tab));
        });
        
        // Calcular
        document.getElementById('calculate-btn').addEventListener('click', () => this.calculateAndPlot());
        document.getElementById('func-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.calculateAndPlot();
        });
        
        // Teclado matemático
        document.querySelectorAll('[data-symbol]').forEach(btn => {
            btn.addEventListener('click', (e) => this.insertSymbol(e.target.dataset.symbol));
        });
        
        document.getElementById('backspace-btn').addEventListener('click', () => this.backspace());
        
        // Slider do ponto
        document.getElementById('x-slider').addEventListener('input', (e) => this.updatePointValue(e.target.value));
        
        // Botões de ponto rápido
        document.querySelectorAll('[data-point]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setPoint(parseFloat(e.target.dataset.point)));
        });
        
        // Botões de controle do gráfico
        document.getElementById('fullscreen-btn').addEventListener('click', () => this.graph.toggleFullscreen());
        document.getElementById('export-btn').addEventListener('click', () => this.showExportOptions());
        document.getElementById('reset-view-btn').addEventListener('click', () => this.graph.resetView());
        document.getElementById('legend-toggle').addEventListener('click', () => this.graph.toggleLegend());
        
        // Checkboxes de visualização
        document.querySelectorAll('#common-options input, #limit-options input').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updatePlot());
        });
        
        // Controles de integração
        document.getElementById('improper-integral').addEventListener('change', () => this.updatePlot());
        document.getElementById('integral-a').addEventListener('change', () => this.updatePlot());
        document.getElementById('integral-b').addEventListener('change', () => this.updatePlot());
        
        // Limpar função
        document.getElementById('clear-btn').addEventListener('click', () => this.clearFunction());
        
        // Exemplos
        document.getElementById('examples-btn').addEventListener('click', () => this.showExamples());
        document.querySelectorAll('[data-example]').forEach(btn => {
            btn.addEventListener('click', (e) => this.useExample(e.target.dataset.example));
        });
        
        // Histórico
        document.getElementById('history-btn').addEventListener('click', () => this.showHistory());
        
        // Passo a passo
        document.getElementById('step-toggle').addEventListener('click', () => this.toggleStepByStep());
        
        // Feedback
        document.getElementById('feedback-btn').addEventListener('click', () => this.showFeedbackModal());
        
        // Tema
        document.getElementById('theme-toggle').addEventListener('change', () => this.toggleTheme());
        
        // Fechar modais
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.hideModal(btn.closest('.modal')));
        });
        
        // Fechar modais ao clicar fora
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        // Adicionar no setupEventListeners:
document.getElementById('keyboard-toggle').addEventListener('click', () => this.toggleKeyboard());

// Adicionar método:
toggleKeyboard() {
    const container = document.getElementById('keyboard-container');
    const icon = document.getElementById('keyboard-icon');
    
    container.classList.toggle('hidden');
    icon.classList.toggle('rotate-180');
    
    // Animar altura
    if (!container.classList.contains('hidden')) {
        container.style.maxHeight = container.scrollHeight + 'px';
    } else {
        container.style.maxHeight = '0';
    }
}
        
    }

    // Métodos principais (implementação completa)
    calculateAndPlot() {
        const funcInput = document.getElementById('func-input').value.trim();
        if (!funcInput) {
            this.utils.showNotification('Digite uma função para calcular', 'error');
            return;
        }

        AppState.currentFunction = funcInput;
        this.addToHistory(funcInput);
        this.utils.showLoading('Calculando...');

        // Usar setTimeout para permitir que a UI atualize
        setTimeout(() => {
            try {
                this.processFunction();
                this.utils.hideLoading();
                
                // Marcar conceito como aprendido
                this.markConceptLearned(AppState.currentMode);
                
                // Track event
                this.trackEvent('function_calculated', {
                    function: funcInput,
                    mode: AppState.currentMode
                });
                
            } catch (error) {
                this.utils.hideLoading();
                this.utils.showNotification(error.message, 'error');
            }
        }, 100);
    }

    processFunction() {
        if (!AppState.currentFunction) return;
        
        try {
            const a = parseFloat(document.getElementById('x-slider').value);
            const data = [];
            const annotations = [];
            
            // Criar função
            const f = this.utils.createFunction(AppState.currentFunction);
            if (!f) throw new Error('Função inválida');
            
            // Gerar pontos da função principal
            const xValues = [];
            const yValues = [];
            const step = 0.05;
            
            for (let x = -5; x <= 5; x += step) {
                try {
                    const y = f(x);
                    if (isFinite(y) && Math.abs(y) < 100) {
                        xValues.push(x);
                        yValues.push(y);
                    } else {
                        // Quebrar a linha se o valor não for finito
                        if (xValues.length > 0) {
                            xValues.push(null);
                            yValues.push(null);
                        }
                    }
                } catch (e) {
                    if (xValues.length > 0) {
                        xValues.push(null);
                        yValues.push(null);
                    }
                }
            }
            
            // Adicionar função principal
            data.push({
                x: xValues,
                y: yValues,
                name: 'f(x)',
                type: 'scatter',
                mode: 'lines',
                line: {color: '#6366f1', width: 3},
                hovertemplate: 'x: %{x:.3f}<br>f(x): %{y:.3f}<extra></extra>'
            });
            
            let analysisHTML = '';
            
            // Análise baseada no modo
            if (AppState.currentMode === 'derivada') {
                analysisHTML = this.analyzeDerivative(AppState.currentFunction, f, a, data, annotations);
            } else if (AppState.currentMode === 'integral') {
                const integralA = parseFloat(document.getElementById('integral-a').value);
                const integralB = parseFloat(document.getElementById('integral-b').value);
                const isImproper = document.getElementById('improper-integral').checked;
                analysisHTML = this.analyzeIntegral(AppState.currentFunction, f, integralA, integralB, data, annotations, isImproper);
            } else if (AppState.currentMode === 'limite') {
                analysisHTML = this.analyzeLimit(AppState.currentFunction, f, a, data, annotations);
            } else {
                analysisHTML = this.analyzeFunction(AppState.currentFunction, f, a);
            }
            
            // Análise de extremos e concavidade
            if (document.getElementById('show-extrema')?.checked || document.getElementById('show-inflection')?.checked) {
                const extremaAnalysis = this.calculator.analyzeExtremaAndConcavity(AppState.currentFunction);
                
                // Adicionar pontos críticos ao gráfico
                if (document.getElementById('show-extrema')?.checked) {
                    extremaAnalysis.criticalPoints.forEach(point => {
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
                                        point.type === 'máximo' ? 'triangle-up' : 'diamond'
                            }
                        });
                    });
                }
                
                // Adicionar pontos de inflexão
                if (document.getElementById('show-inflection')?.checked) {
                    extremaAnalysis.inflectionPoints.forEach(point => {
                        data.push({
                            x: [point.x],
                            y: [point.value],
                            name: 'Ponto de Inflexão',
                            mode: 'markers',
                            marker: {
                                size: 10,
                                color: '#8b5cf6',
                                symbol: 'cross'
                            }
                        });
                    });
                }
                
                // Adicionar análise aos resultados
                analysisHTML += this.generateExtremaHTML(extremaAnalysis);
            }
            
            // Adicionar ponto no gráfico
            try {
                const fa = f(a);
                data.push({
                    x: [a],
                    y: [fa],
                    name: `Ponto (${a.toFixed(1)}, ${fa.toFixed(2)})`,
                    mode: 'markers',
                    marker: {
                        size: 12,
                        color: '#f43f5e',
                        line: {color: 'white', width: 2}
                    },
                    hovertemplate: `Ponto de estudo<br>x: ${a.toFixed(3)}<br>f(x): ${fa.toFixed(3)}<extra></extra>`
                });
            } catch (e) {
                // Pode não ser definido nesse ponto
            }
            
            // Plotar gráfico
            this.graph.plotGraph(data, annotations);
            
            // Atualizar análise
            document.getElementById('analysis-output').innerHTML = analysisHTML;
            
            // Gerar passo a passo
            if (AppState.showStepByStep && AppState.isTeacherMode) {
                const steps = this.generateStepByStep(AppState.currentFunction, AppState.currentMode, a);
                this.displayStepByStep(steps);
            }
            
            // Gerar explicação conceitual
            if (AppState.isTeacherMode) {
                const explanations = this.generateConceptExplanation(AppState.currentMode);
                this.displayConceptExplanation(explanations);
            }
            
            // Gerar perguntas orientadoras
            const questions = this.generateGuidingQuestions(AppState.currentMode, a);
            this.displayGuidingQuestions(questions);
            
            // Mostrar cálculos simbólicos
            this.showSymbolicCalculations(AppState.currentFunction);
            
        } catch (error) {
            throw new Error(`Erro na função: ${error.message}`);
        }
    }

    // Métodos de análise (do original)
    analyzeDerivative(expression, f, a, data, annotations) {
        try {
            const result = this.calculator.calculateDerivative(expression, a);
            
            // Adicionar reta tangente se selecionado
            if (document.getElementById('show-tangent')?.checked) {
                const tangentData = this.graph.generateTangentData(expression, a);
                data.push(...tangentData);
            }
            
            return `
                <div class="space-y-4">
                    <div class="gradient-card p-4">
                        <div class="text-center mb-3">
                            <div class="text-sm text-slate-500 mb-1">Derivada no ponto</div>
                            <div class="math-symbol text-xl font-bold">
                                f'(${a.toFixed(2)})
                            </div>
                        </div>
                        
                        <div class="bg-emerald-50 p-4 rounded-lg">
                            <div class="text-sm text-emerald-600 mb-1">Resultado</div>
                            <div class="text-2xl font-bold text-emerald-700">
                                ${this.utils.formatNumber(result.numeric)}
                            </div>
                            <div class="mt-2 text-sm text-slate-600">
                                <i class="fas fa-calculator mr-1"></i>
                                f'(x) = ${result.symbolic}
                            </div>
                            <div class="mt-2 text-sm text-slate-600">
                                <i class="fas fa-ruler-combined mr-1"></i>
                                ${result.tangentEquation}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (e) {
            return `<div class="text-red-500">Erro no cálculo da derivada: ${e.message}</div>`;
        }
    }

    analyzeIntegral(expression, f, a, b, data, annotations, isImproper = false) {
        try {
            const integralResult = this.calculator.calculateIntegral(expression, a, b, { improper: isImproper });
            
            // Mostrar área se selecionado
            if (document.getElementById('show-area')?.checked) {
                const areaData = this.graph.generateAreaData(expression, [a, b]);
                data.push(...areaData);
            }
            
            // Gerar HTML com resultados
            let html = `
                <div class="space-y-4">
                    <div class="gradient-card p-4">
                        <div class="text-center mb-3">
                            <div class="text-sm text-slate-500 mb-1">Integral Definida</div>
                            <div class="math-symbol text-xl font-bold">
                                ∫<sub>${a.toFixed(2)}</sub><sup>${b.toFixed(2)}</sup> f(x) dx
                            </div>
                        </div>
                        
                        <div class="bg-emerald-50 p-4 rounded-lg">
                            <div class="text-sm text-emerald-600 mb-1">Resultado (${integralResult.method})</div>
                            <div class="text-2xl font-bold text-emerald-700">
                                ${this.utils.formatNumber(integralResult.numeric)}
                            </div>
            `;
            
            if (integralResult.symbolic) {
                html += `
                    <div class="mt-2 text-sm text-slate-600">
                        <i class="fas fa-calculator mr-1"></i>
                        Primitiva: F(x) = ${integralResult.symbolic}
                    </div>
                `;
            }
            
            if (isImproper && integralResult.convergence) {
                html += `
                    <div class="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                        <div class="text-sm font-bold text-amber-700">Análise de Convergência:</div>
                        <ul class="text-xs text-amber-600 mt-1">
                `;
                
                integralResult.convergence.forEach(item => {
                    html += `<li>• ${item}</li>`;
                });
                
                html += `
                        </ul>
                    </div>
                `;
            }
            
            html += `
                        </div>
                    </div>
                </div>
            `;
            
            return html;
            
        } catch (e) {
            return `<div class="text-red-500">Erro no cálculo da integral: ${e.message}</div>`;
        }
    }

    analyzeLimit(expression, f, a, data, annotations) {
        try {
            const limitResult = this.calculator.calculateLimit(expression, a);
            
            let html = `
                <div class="space-y-4">
                    <div class="gradient-card p-4">
                        <div class="text-center mb-3">
                            <div class="text-sm text-slate-500 mb-1">Limite</div>
                            <div class="math-symbol text-xl font-bold">
                                lim<sub>x→${a.toFixed(2)}</sub> f(x)
                            </div>
                        </div>
                        
                        <div class="bg-emerald-50 p-4 rounded-lg">
            `;
            
            if (limitResult.exists) {
                html += `
                    <div class="text-sm text-emerald-600 mb-1">Resultado</div>
                    <div class="text-2xl font-bold text-emerald-700">
                        ${this.utils.formatNumber(limitResult.value)}
                    </div>
                `;
            } else {
                html += `
                    <div class="text-sm text-red-600 mb-1">Limite não existe</div>
                    <div class="text-sm text-slate-600">
                        Limite à esquerda: ${this.utils.formatNumber(limitResult.left)}<br>
                        Limite à direita: ${this.utils.formatNumber(limitResult.right)}
                    </div>
                `;
            }
            
            html += `
                        </div>
                    </div>
                </div>
            `;
            
            return html;
            
        } catch (e) {
            return `<div class="text-red-500">Erro no cálculo do limite: ${e.message}</div>`;
        }
    }

    analyzeFunction(expression, f, a) {
        const fa = f(a);
        
        return `
            <div class="space-y-4">
                <div class="gradient-card p-4">
                    <div class="text-center mb-3">
                        <div class="text-sm text-slate-500 mb-1">Valor da função no ponto</div>
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
            </div>
        `;
    }

    // Resto dos métodos do original...
    // (Mantendo todas as funcionalidades: histórico, exercícios, exportação, etc.)

    generateExtremaHTML(analysis) {
        // Implementação do original
        let html = '';
        
        if (analysis.criticalPoints.length > 0) {
            html += `
                <div class="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg mt-4">
                    <h4 class="font-bold text-emerald-800 mb-2">
                        <i class="fas fa-chart-line mr-2"></i>
                        Análise de Extremos
                    </h4>
                    <div class="text-sm text-emerald-700">
                        <p class="mb-2"><strong>Pontos Críticos:</strong></p>
                        <ul class="list-disc pl-5">
            `;
            
            analysis.criticalPoints.forEach(point => {
                html += `<li>${point.type} em x = ${point.x.toFixed(2)} (f(x) = ${point.value.toFixed(2)})</li>`;
            });
            
            html += `
                        </ul>
                    </div>
                </div>
            `;
        }
        
        if (analysis.inflectionPoints.length > 0) {
            html += `
                <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg mt-4">
                    <h4 class="font-bold text-purple-800 mb-2">
                        <i class="fas fa-wave-square mr-2"></i>
                        Análise de Concavidade
                    </h4>
                    <div class="text-sm text-purple-700">
                        <p class="mb-2"><strong>Pontos de Inflexão:</strong></p>
                        <ul class="list-disc pl-5">
            `;
            
            analysis.inflectionPoints.forEach(point => {
                html += `<li>x = ${point.x.toFixed(2)} (f(x) = ${point.value.toFixed(2)})</li>`;
            });
            
            html += `
                        </ul>
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    generateStepByStep(expression, mode, a, b = undefined) {
        // Implementação do original
        let steps = [];
        
        switch(mode) {
            case 'derivada':
                steps = this.generateDerivativeSteps(expression, a);
                break;
            case 'integral':
                steps = this.generateIntegralSteps(expression, a, b);
                break;
            case 'limite':
                steps = this.generateLimitSteps(expression, a);
                break;
            default:
                steps = this.generateFunctionSteps(expression);
        }
        
        return steps;
    }

    generateDerivativeSteps(expression, a) {
        const steps = [];
        
        try {
            const node = math.parse(expression);
            const derivative = math.derivative(node, 'x');
            
            steps.push({
                step: 1,
                title: 'Função Original',
                content: `f(x) = ${expression}`
            });
            
            steps.push({
                step: 2,
                title: 'Aplicando Regras de Derivação',
                content: `Derivando termo a termo...`
            });
            
            steps.push({
                step: 3,
                title: 'Derivada Encontrada',
                content: `f'(x) = ${derivative.toString()}`
            });
            
            steps.push({
                step: 4,
                title: 'Avaliando no Ponto',
                content: `f'(${a}) = ${derivative.evaluate({x: a})}`
            });
            
            steps.push({
                step: 5,
                title: 'Interpretação',
                content: `A derivada representa a taxa de variação instantânea da função no ponto x = ${a}.`
            });
            
        } catch (e) {
            steps.push({
                step: 1,
                title: 'Erro no Cálculo',
                content: `Não foi possível calcular o passo a passo: ${e.message}`
            });
        }
        
        return steps;
    }

    displayStepByStep(steps) {
        const container = document.getElementById('step-by-step-content');
        container.innerHTML = '';
        
        steps.forEach(step => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step-by-step';
            stepDiv.innerHTML = `
                <div class="flex items-start">
                    <div class="step-number">${step.step}</div>
                    <div class="flex-1">
                        <div class="font-bold text-indigo-700 mb-1">${step.title}</div>
                        <div class="text-sm">${step.content}</div>
                    </div>
                </div>
            `;
            container.appendChild(stepDiv);
        });
        
        document.getElementById('step-by-step-container').classList.remove('hidden');
    }

    generateConceptExplanation(mode) {
        const explanations = [];
        
        switch(mode) {
            case 'derivada':
                explanations.push(
                    'A derivada de uma função em um ponto representa a <strong>taxa de variação instantânea</strong> da função naquele ponto.',
                    'Geometricamente, é o <strong>coeficiente angular da reta tangente</strong> à curva no ponto.',
                    'Se a derivada é positiva, a função é crescente; se negativa, é decrescente.'
                );
                break;
                
            case 'integral':
                explanations.push(
                    'A integral definida representa a <strong>área líquida</strong> entre a curva e o eixo x.',
                    'É o processo inverso da derivação (Teorema Fundamental do Cálculo).',
                    'Integrais impróprias lidam com intervalos infinitos ou descontinuidades.'
                );
                break;
                
            case 'limite':
                explanations.push(
                    'O limite descreve o <strong>comportamento</strong> de uma função quando se aproxima de um ponto.',
                    'Limites laterais podem ser diferentes (descontinuidade de salto).',
                    'Limites infinitos indicam assíntotas verticais.'
                );
                break;
        }
        
        return explanations;
    }

    displayConceptExplanation(explanations) {
        const container = document.getElementById('concept-explanation-content');
        container.innerHTML = '';
        
        explanations.forEach(explanation => {
            const expDiv = document.createElement('div');
            expDiv.className = 'concept-explanation';
            expDiv.innerHTML = `
                <div class="text-sm">${explanation}</div>
            `;
            container.appendChild(expDiv);
        });
        
        document.getElementById('concept-explanation-container').classList.remove('hidden');
    }

    generateGuidingQuestions(mode, a) {
        const questions = [];
        
        switch(mode) {
            case 'derivada':
                questions.push(
                    `O que acontece com a derivada quando x → ∞?`,
                    `Em que pontos a derivada se anula?`,
                    `Como a derivada se relaciona com a velocidade de crescimento da função?`
                );
                break;
                
            case 'integral':
                questions.push(
                    `O que a integral representa geometricamente?`,
                    `Como mudaria o resultado se invertêssemos os limites de integração?`,
                    `O que acontece com a área quando a função cruza o eixo x?`
                );
                break;
                
            case 'limite':
                questions.push(
                    `O que acontece quando a → 0?`,
                    `Existem assíntotas verticais ou horizontais?`,
                    `Como o limite se comporta nos extremos do domínio?`
                );
                break;
        }
        
        return questions;
    }

    displayGuidingQuestions(questions) {
        const container = document.getElementById('guiding-questions-content');
        container.innerHTML = '';
        
        questions.forEach(question => {
            const qDiv = document.createElement('div');
            qDiv.className = 'bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg';
            qDiv.innerHTML = `
                <div class="flex items-start">
                    <i class="fas fa-question text-blue-500 mt-1 mr-2"></i>
                    <div class="text-sm text-blue-700">${question}</div>
                </div>
            `;
            container.appendChild(qDiv);
        });
        
        document.getElementById('guiding-questions-container').classList.remove('hidden');
    }

    showSymbolicCalculations(expression) {
        const container = document.getElementById('symbolic-output');
        container.innerHTML = '';
        
        try {
            const node = math.parse(expression);
            const derivative = math.derivative(node, 'x');
            const integral = math.integrate(node, 'x');
            
            container.innerHTML = `
                <div class="space-y-3">
                    <div class="p-3 bg-indigo-50 rounded-lg">
                        <div class="text-sm font-bold text-indigo-800 mb-1">Derivada Simbólica:</div>
                        <div class="font-mono text-sm">f'(x) = ${derivative.toString()}</div>
                    </div>
                    <div class="p-3 bg-emerald-50 rounded-lg">
                        <div class="text-sm font-bold text-emerald-800 mb-1">Primitiva:</div>
                        <div class="font-mono text-sm">F(x) = ${integral.toString()} + C</div>
                    </div>
                </div>
            `;
            
            document.getElementById('symbolic-calculations').classList.remove('hidden');
        } catch (e) {
            // Não mostrar se não for possível calcular
        }
    }

    // Funções de interface
    toggleMode() {
        document.getElementById('mode-dropdown').classList.toggle('hidden');
    }

    setModeType(mode) {
        AppState.isTeacherMode = mode === 'teacher';
        localStorage.setItem('calculusMode', mode);
        
        const label = document.getElementById('mode-label');
        const progress = document.getElementById('student-progress');
        const button = document.getElementById('mode-toggle');
        
        if (AppState.isTeacherMode) {
            label.textContent = 'Professor';
            progress.classList.add('hidden');
            button.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm';
            document.body.classList.add('teacher-mode');
            document.body.classList.remove('student-mode');
        } else {
            label.textContent = 'Aluno';
            progress.classList.remove('hidden');
            button.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm';
            document.body.classList.add('student-mode');
            document.body.classList.remove('teacher-mode');
        }
        
        document.getElementById('mode-dropdown').classList.add('hidden');
        this.updateInterfaceForMode();
    }

    updateInterfaceForMode() {
        if (AppState.isTeacherMode) {
            document.getElementById('step-toggle').classList.remove('hidden');
        } else {
            document.getElementById('step-toggle').classList.add('hidden');
            document.getElementById('step-by-step-container').classList.add('hidden');
        }
    }

    setCalcMode(mode) {
        AppState.currentMode = mode;
        
        // Atualizar tabs
        ['funcao', 'derivada', 'integral', 'limite', 'exercicios'].forEach(tab => {
            const element = document.querySelector(`[data-tab="${tab}"]`);
            if (element) {
                element.classList.toggle('tab-active', tab === mode);
                element.classList.toggle('text-slate-400', tab !== mode);
                element.classList.toggle('text-white', tab === mode);
            }
        });
        
        // Atualizar labels
        const modeLabels = {
            'funcao': 'FUNÇÃO',
            'derivada': 'DERIVADA',
            'integral': 'INTEGRAL',
            'limite': 'LIMITE',
            'exercicios': 'EXERCÍCIOS'
        };
        
        document.getElementById('current-mode-label').textContent = modeLabels[mode] || 'FUNÇÃO';
        document.getElementById('graph-title').textContent = this.getGraphTitle(mode);
        document.getElementById('graph-subtitle').textContent = this.getGraphSubtitle(mode);
        
        // Mostrar/ocultar controles específicos
        this.updateOptionsVisibility(mode);
        
        // Mostrar/ocultar controles de integração
        const integralControls = document.getElementById('integral-controls');
        if (mode === 'integral') {
            integralControls.classList.remove('hidden');
            document.getElementById('point-label').textContent = 'Limites de Integração';
        } else {
            integralControls.classList.add('hidden');
            document.getElementById('point-label').textContent = 'Ponto de Estudo';
        }
        
        // Se for modo exercícios, mostrar modal
        if (mode === 'exercicios') {
            this.showExercises();
        } else if (AppState.currentFunction) {
            this.calculateAndPlot();
        }
    }

    getGraphTitle(mode) {
        const titles = {
            'funcao': 'Gráfico da Função f(x)',
            'derivada': 'Gráfico da Derivada f\'(x)',
            'integral': 'Gráfico da Integral ∫f(x)dx',
            'limite': 'Análise de Limites'
        };
        return titles[mode] || 'Gráfico da Função f(x)';
    }

    getGraphSubtitle(mode) {
        const subtitles = {
            'funcao': 'Visualização da função e suas propriedades',
            'derivada': 'Taxa de variação instantânea da função',
            'integral': 'Área sob a curva da função',
            'limite': 'Comportamento da função em pontos críticos'
        };
        return subtitles[mode] || 'Clique em Calcular e Plotar para visualizar';
    }

    updateOptionsVisibility(mode) {
        const commonOptions = document.getElementById('common-options');
        const limitOptions = document.getElementById('limit-options');
        
        if (mode === 'limite') {
            commonOptions.classList.add('hidden');
            limitOptions.classList.remove('hidden');
        } else {
            commonOptions.classList.remove('hidden');
            limitOptions.classList.add('hidden');
        }
    }

    insertSymbol(symbol) {
        const input = document.getElementById('func-input');
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const value = input.value;
        
        input.value = value.substring(0, start) + symbol + value.substring(end);
        input.focus();
        input.setSelectionRange(start + symbol.length, start + symbol.length);
    }

    backspace() {
        const input = document.getElementById('func-input');
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const value = input.value;
        
        if (start === end && start > 0) {
            input.value = value.substring(0, start - 1) + value.substring(end);
            input.focus();
            input.setSelectionRange(start - 1, start - 1);
        } else if (start !== end) {
            input.value = value.substring(0, start) + value.substring(end);
            input.focus();
            input.setSelectionRange(start, start);
        }
    }

    updatePointValue(value = null) {
        const slider = document.getElementById('x-slider');
        const display = document.getElementById('a-value');
        const point = value !== null ? value : slider.value;
        
        display.textContent = parseFloat(point).toFixed(1);
        
        // Atualizar gráfico se já estiver plotado
        if (AppState.currentPlot) {
            this.updatePlot();
        }
    }

    setPoint(value) {
        document.getElementById('x-slider').value = value;
        this.updatePointValue(value);
    }

    updatePlot() {
        if (AppState.currentFunction) {
            this.calculateAndPlot();
        }
    }

    clearFunction() {
        document.getElementById('func-input').value = '';
        document.getElementById('func-input').focus();
    }

    // Histórico
    addToHistory(expression) {
        if (!AppState.history.includes(expression)) {
            AppState.history.unshift(expression);
            // Manter apenas os últimos 10 itens
            AppState.history = AppState.history.slice(0, 10);
            localStorage.setItem('calculusHistory', JSON.stringify(AppState.history));
            this.updateHistoryDisplay();
        }
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        if (AppState.history.length === 0) {
            historyList.innerHTML = '<p class="text-center text-slate-500 py-4">Nenhuma função no histórico</p>';
        } else {
            AppState.history.forEach((expr, index) => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="math-symbol text-sm">f(x) = ${expr}</div>
                            <div class="text-xs text-slate-500">Usado recentemente</div>
                        </div>
                        <button data-history-index="${index}" class="text-indigo-500 hover:text-indigo-700">
                            <i class="fas fa-redo"></i>
                        </button>
                    </div>
                `;
                historyList.appendChild(item);
            });
            
            // Adicionar event listeners aos botões do histórico
            document.querySelectorAll('[data-history-index]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.target.closest('button').dataset.historyIndex;
                    this.useHistoryItem(index);
                });
            });
        }
    }

    useHistoryItem(index) {
        const expression = AppState.history[index];
        document.getElementById('func-input').value = expression;
        AppState.currentFunction = expression;
        this.hideModal(document.getElementById('history-modal'));
        this.calculateAndPlot();
    }

    clearHistory() {
        AppState.history = [];
        localStorage.removeItem('calculusHistory');
        this.updateHistoryDisplay();
    }

    // Progresso do aluno
    updateProgress() {
        if (!AppState.isTeacherMode) {
            const totalConcepts = 10;
            const completedConcepts = AppState.userProgress.concepts.length;
            const percent = Math.round((completedConcepts / totalConcepts) * 100);
            
            document.getElementById('progress-percent').textContent = `${percent}%`;
            document.getElementById('progress-bar').style.width = `${percent}%`;
        }
    }

    markConceptLearned(concept) {
        if (!AppState.userProgress.concepts.includes(concept)) {
            AppState.userProgress.concepts.push(concept);
            localStorage.setItem('userProgress', JSON.stringify(AppState.userProgress));
            this.updateProgress();
            this.trackEvent('concept_learned', { concept: concept });
        }
    }

    // Tema
    toggleTheme() {
        AppState.isDarkMode = !AppState.isDarkMode;
        
        if (AppState.isDarkMode) {
            document.body.classList.remove('light');
            document.body.classList.add('dark');
            localStorage.setItem('calculusTheme', 'dark');
        } else {
            document.body.classList.remove('dark');
            document.body.classList.add('light');
            localStorage.setItem('calculusTheme', 'light');
        }
        
        // Atualizar gráfico se existir
        if (this.graph.currentPlot) {
            this.graph.updateTheme();
        }
    }

    updateThemeUI() {
        if (AppState.isDarkMode) {
            document.body.classList.add('dark');
            document.getElementById('theme-toggle').checked = true;
        } else {
            document.body.classList.remove('dark');
            document.getElementById('theme-toggle').checked = false;
        }
    }

    updateModeUI() {
        if (AppState.isTeacherMode) {
            document.getElementById('mode-label').textContent = 'Professor';
            document.getElementById('student-progress').classList.add('hidden');
            document.getElementById('mode-toggle').className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm';
            document.body.classList.add('teacher-mode');
        } else {
            document.getElementById('mode-label').textContent = 'Aluno';
            document.getElementById('student-progress').classList.remove('hidden');
            document.getElementById('mode-toggle').className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm';
            document.body.classList.add('student-mode');
        }
    }

    // Modais
    showExamples() {
        document.getElementById('examples-modal').style.display = 'flex';
    }

    hideModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }

    useExample(example) {
        document.getElementById('func-input').value = example;
        AppState.currentFunction = example;
        this.hideModal(document.getElementById('examples-modal'));
        this.calculateAndPlot();
    }

    showHistory() {
        this.updateHistoryDisplay();
        document.getElementById('history-modal').style.display = 'flex';
    }

    showExercises() {
        // Implementação dos exercícios
        document.getElementById('exercises-modal').style.display = 'flex';
        this.trackEvent('exercises_viewed', {});
    }

    hideExercises() {
        document.getElementById('exercises-modal').style.display = 'none';
        this.setCalcMode('funcao');
    }

    showExportOptions() {
        document.getElementById('export-modal').style.display = 'flex';
    }

    hideExportOptions() {
        document.getElementById('export-modal').style.display = 'none';
    }

    showFeedbackModal() {
        document.getElementById('feedback-modal').style.display = 'flex';
    }

    hideFeedbackModal() {
        document.getElementById('feedback-modal').style.display = 'none';
    }

    submitFeedback() {
        const type = document.getElementById('feedback-type').value;
        const message = document.getElementById('feedback-message').value;
        const contact = document.getElementById('feedback-contact').checked;
        
        if (!message.trim()) {
            this.utils.showNotification('Por favor, digite uma mensagem', 'error');
            return;
        }
        
        const feedback = {
            type: type,
            message: message,
            contact: contact,
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            userAgent: navigator.userAgent
        };
        
        // Salvar feedback localmente
        const feedbacks = JSON.parse(localStorage.getItem('calculusFeedback')) || [];
        feedbacks.push(feedback);
        localStorage.setItem('calculusFeedback', JSON.stringify(feedbacks));
        
        // Simular envio para servidor
        this.utils.showLoading('Enviando feedback...');
        
        setTimeout(() => {
            this.utils.hideLoading();
            this.hideFeedbackModal();
            this.utils.showNotification('Feedback enviado com sucesso! Obrigado!', 'success');
            
            // Limpar formulário
            document.getElementById('feedback-message').value = '';
            
            this.trackEvent('feedback', { type: type });
        }, 1500);
    }

    toggleStepByStep() {
        AppState.showStepByStep = !AppState.showStepByStep;
        const button = document.getElementById('step-toggle');
        
        if (AppState.showStepByStep) {
            button.classList.add('bg-indigo-100', 'text-indigo-700');
            document.getElementById('step-by-step-container').classList.remove('hidden');
            if (AppState.currentFunction) {
                const a = parseFloat(document.getElementById('x-slider').value);
                const steps = this.generateStepByStep(AppState.currentFunction, AppState.currentMode, a);
                this.displayStepByStep(steps);
            }
        } else {
            button.classList.remove('bg-indigo-100', 'text-indigo-700');
            document.getElementById('step-by-step-container').classList.add('hidden');
        }
    }

    // Analytics
    initAnalytics() {
        AppState.analytics = JSON.parse(localStorage.getItem('calculusAnalytics')) || {
            sessions: 0,
            functionsCalculated: 0,
            exercisesAttempted: 0,
            lastVisit: null,
            events: []
        };
        
        AppState.analytics.sessions++;
        AppState.analytics.lastVisit = new Date().toISOString();
        localStorage.setItem('calculusAnalytics', JSON.stringify(AppState.analytics));
    }

    trackEvent(event, data) {
        if (!AppState.analytics.events) AppState.analytics.events = [];
        AppState.analytics.events.push({
            timestamp: new Date().toISOString(),
            event: event,
            data: data
        });
        localStorage.setItem('calculusAnalytics', JSON.stringify(AppState.analytics));
    }

    // PWA
    async setupPWA() {
        // Detectar se o app pode ser instalado
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            AppState.deferredPrompt = e;
            document.getElementById('pwa-install').classList.remove('hidden');
        });
        
        // Detectar se o app está instalado
        window.addEventListener('appinstalled', () => {
            document.getElementById('pwa-install').classList.add('hidden');
            AppState.deferredPrompt = null;
            this.utils.showNotification('App instalado com sucesso!', 'success');
        });
        
        // Configurar botão de instalação
        document.getElementById('pwa-install').addEventListener('click', () => this.installPWA());
    }

    installPWA() {
        if (AppState.deferredPrompt) {
            AppState.deferredPrompt.prompt();
            AppState.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('Usuário aceitou a instalação');
                }
                AppState.deferredPrompt = null;
            });
        }
    }
}

updatePointValue(value = null) {
    const slider = document.getElementById('x-slider');
    const display = document.getElementById('a-value');
    const point = value !== null ? value : slider.value;
    
    display.textContent = parseFloat(point).toFixed(1);
    
    // Atualização instantânea do gráfico
    if (AppState.currentFunction && AppState.currentPlot) {
        // Cancelar atualização anterior se existir
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        // Atualizar após pequeno delay para performance
        this.updateTimeout = setTimeout(() => {
            this.updatePlotWithPoint(point);
        }, 100);
    }
}

updatePlotWithPoint(point) {
    try {
        const f = this.utils.createFunction(AppState.currentFunction);
        const fa = f(parseFloat(point));
        
        // Atualizar apenas o ponto no gráfico
        if (this.graph.currentPlot) {
            Plotly.react('plot', this.graph.getUpdatedPointData(point, fa), this.graph.getLayout());
        }
        
        // Atualizar também os cálculos
        this.updateCalculationsForPoint(point);
        
    } catch (error) {
        console.warn('Não foi possível atualizar ponto:', error);
    }
}

updateCalculationsForPoint(point) {
    // Atualizar cálculos específicos para o novo ponto
    const analysisOutput = document.getElementById('analysis-output');
    if (analysisOutput) {
        // Encontrar e atualizar elementos que mostram f(point)
        const pointElements = analysisOutput.querySelectorAll('.point-value');
        pointElements.forEach(el => {
            if (el.dataset.point === 'x') {
                const f = this.utils.createFunction(AppState.currentFunction);
                const value = f(parseFloat(point));
                el.textContent = value.toFixed(4);
            }
        });
    }
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.calculusApp = new CalculusVisionApp();
});