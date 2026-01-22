// Módulo de cálculos matemáticos aprimorado
const Calculator = {
    // Cache para cálculos repetidos
    cache: new Map(),
    
    // Calcular derivada com cache
    calculateDerivative(expression, point, useCache = true) {
        const cacheKey = `derivative_${expression}_${point}`;
        
        if (useCache && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const node = math.parse(expression);
            const derivative = math.derivative(node, 'x');
            const valueAtPoint = derivative.evaluate({ x: point });
            
            // Calcular derivada segunda para análise de concavidade
            let secondDerivative = null;
            let curvature = null;
            try {
                const secondDeriv = math.derivative(derivative, 'x');
                secondDerivative = secondDeriv.evaluate({ x: point });
                curvature = this.calculateCurvature(expression, point);
            } catch (e) {
                // Ignorar erros na segunda derivada
            }
            
            const result = {
                symbolic: this.formatMathExpression(derivative.toString()),
                numeric: valueAtPoint,
                secondDerivative: secondDerivative,
                curvature: curvature,
                tangentEquation: this.getTangentEquation(expression, point),
                increasing: valueAtPoint > 0,
                decreasing: valueAtPoint < 0,
                stationary: Math.abs(valueAtPoint) < 0.0001
            };
            
            if (useCache) {
                this.cache.set(cacheKey, result);
                // Limitar cache a 50 entradas
                if (this.cache.size > 50) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
            }
            
            return result;
        } catch (error) {
            throw new Error(`Erro ao calcular derivada: ${error.message}`);
        }
    },

    // Calcular integral com múltiplos métodos
    calculateIntegral(expression, a, b, options = {}) {
        const cacheKey = `integral_${expression}_${a}_${b}_${options.improper || false}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const result = {
                method: 'numérica',
                symbolic: null,
                numeric: null,
                errorEstimate: null,
                improper: options.improper || false,
                convergence: null,
                methodsTried: []
            };

            // Tentar cálculo simbólico primeiro
            try {
                const node = math.parse(expression);
                const integral = math.integrate(node, 'x');
                result.symbolic = this.formatMathExpression(integral.toString());
                result.method = 'simbólica';
                result.methodsTried.push('simbólica');
                
                const valA = integral.evaluate({ x: a });
                const valB = integral.evaluate({ x: b });
                result.numeric = valB - valA;
                
            } catch (symError) {
                // Fallback para integração numérica com múltiplos métodos
                result.methodsTried = ['simpson', 'trapezoidal', 'monteCarlo'];
                const simpson = this.numericalIntegration(expression, a, b, 'simpson');
                const trapezoidal = this.numericalIntegration(expression, a, b, 'trapezoidal');
                
                // Usar média ponderada dos métodos
                result.numeric = (simpson * 0.6 + trapezoidal * 0.4);
                result.errorEstimate = Math.abs(simpson - trapezoidal);
                
                // Tentar Monte Carlo para verificação
                const monteCarlo = this.monteCarloIntegration(expression, a, b);
                if (Math.abs(result.numeric - monteCarlo) / Math.abs(result.numeric) < 0.1) {
                    result.numeric = (result.numeric + monteCarlo) / 2;
                }
            }

            if (options.improper) {
                result.convergence = this.analyzeImproperConvergence(expression, a, b);
            }

            // Verificar propriedades da integral
            result.properties = this.analyzeIntegralProperties(expression, a, b);
            
            this.cache.set(cacheKey, result);
            return result;
            
        } catch (error) {
            throw new Error(`Erro ao calcular integral: ${error.message}`);
        }
    },

    // Calcular limite com análise assintótica
    calculateLimit(expression, point, direction = 'both', useSeries = false) {
        const cacheKey = `limit_${expression}_${point}_${direction}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const f = Utils.createFunction(expression);
            const epsilon = 0.0001;
            let leftLimit, rightLimit, limit;
            let analysis = {};

            if (direction === 'left' || direction === 'both') {
                leftLimit = this.approachLimit(expression, point, 'left');
                analysis.leftApproach = this.analyzeApproach(expression, point, 'left');
            }

            if (direction === 'right' || direction === 'both') {
                rightLimit = this.approachLimit(expression, point, 'right');
                analysis.rightApproach = this.analyzeApproach(expression, point, 'right');
            }

            if (direction === 'both') {
                const tolerance = 0.001;
                const limitsExist = Math.abs(leftLimit - rightLimit) < tolerance;
                
                if (limitsExist) {
                    limit = (leftLimit + rightLimit) / 2;
                    analysis.type = 'exists';
                } else {
                    analysis.type = 'jump_discontinuity';
                    analysis.jumpSize = Math.abs(leftLimit - rightLimit);
                }
                
                // Análise de continuidade
                try {
                    const fAtPoint = f(point);
                    if (isFinite(fAtPoint)) {
                        if (limitsExist && Math.abs(fAtPoint - limit) < tolerance) {
                            analysis.continuity = 'continuous';
                        } else {
                            analysis.continuity = 'removable_discontinuity';
                        }
                    } else {
                        analysis.continuity = 'undefined';
                    }
                } catch (e) {
                    analysis.continuity = 'undefined';
                }
            }

            // Expansão em série de Taylor para análise mais precisa
            if (useSeries) {
                analysis.seriesExpansion = this.taylorExpansion(expression, point, 3);
            }

            const result = {
                left: leftLimit,
                right: rightLimit,
                value: limit,
                exists: direction === 'both' ? Math.abs(leftLimit - rightLimit) < 0.001 : true,
                analysis: analysis,
                asymptoticBehavior: this.analyzeAsymptoticBehavior(expression, point)
            };

            this.cache.set(cacheKey, result);
            return result;
            
        } catch (error) {
            throw new Error(`Erro ao calcular limite: ${error.message}`);
        }
    },

    // Métodos auxiliares aprimorados
    numericalIntegration(expression, a, b, method = 'simpson', n = 1000) {
        const f = Utils.createFunction(expression);
        const h = (b - a) / n;
        
        switch(method) {
            case 'simpson':
                let sumSimpson = f(a) + f(b);
                for (let i = 1; i < n; i++) {
                    const x = a + i * h;
                    sumSimpson += i % 2 === 0 ? 2 * f(x) : 4 * f(x);
                }
                return (h / 3) * sumSimpson;
                
            case 'trapezoidal':
                let sumTrapezoidal = (f(a) + f(b)) / 2;
                for (let i = 1; i < n; i++) {
                    const x = a + i * h;
                    sumTrapezoidal += f(x);
                }
                return h * sumTrapezoidal;
                
            case 'romberg':
                // Implementação do método de Romberg (extrapolação de Richardson)
                const R = [];
                const hValues = [];
                
                for (let i = 0; i < 5; i++) {
                    hValues.push((b - a) / Math.pow(2, i));
                    R[i] = [];
                    const nPoints = Math.pow(2, i);
                    let sum = 0;
                    
                    for (let j = 0; j <= nPoints; j++) {
                        const x = a + j * hValues[i];
                        const weight = (j === 0 || j === nPoints) ? 1 : 2;
                        sum += weight * f(x);
                    }
                    
                    R[i][0] = (hValues[i] / 2) * sum;
                    
                    for (let k = 1; k <= i; k++) {
                        R[i][k] = R[i][k-1] + (R[i][k-1] - R[i-1][k-1]) / (Math.pow(4, k) - 1);
                    }
                }
                
                return R[4][4];
                
            default:
                return this.numericalIntegration(expression, a, b, 'simpson', n);
        }
    },

    monteCarloIntegration(expression, a, b, samples = 10000) {
        const f = Utils.createFunction(expression);
        let sum = 0;
        let sumSquares = 0;
        
        // Encontrar máximo e mínimo no intervalo
        let max = -Infinity;
        let min = Infinity;
        const testPoints = 1000;
        
        for (let i = 0; i <= testPoints; i++) {
            const x = a + (i / testPoints) * (b - a);
            try {
                const y = f(x);
                if (isFinite(y)) {
                    max = Math.max(max, y);
                    min = Math.min(min, y);
                }
            } catch (e) {
                // Ignorar pontos problemáticos
            }
        }
        
        // Monte Carlo integration
        let hits = 0;
        const boundingBox = (b - a) * (max - min > 0 ? max - min : 1);
        
        for (let i = 0; i < samples; i++) {
            const x = a + Math.random() * (b - a);
            const y = min + Math.random() * (max - min);
            
            try {
                const fx = f(x);
                if (isFinite(fx)) {
                    if ((fx >= 0 && y >= 0 && y <= fx) || (fx < 0 && y < 0 && y >= fx)) {
                        hits++;
                    }
                }
            } catch (e) {
                // Ignorar pontos problemáticos
            }
        }
        
        return (hits / samples) * boundingBox;
    },

    analyzeImproperConvergence(expression, a, b) {
        const analysis = {
            tests: [],
            converges: null,
            type: 'proper'
        };
        
        const f = Utils.createFunction(expression);
        
        // Verificar limites infinitos
        if (!isFinite(a) || a === -Infinity) {
            analysis.type = 'infinite_lower';
            analysis.tests.push('Limite inferior infinito');
        }
        if (!isFinite(b) || b === Infinity) {
            analysis.type = analysis.type === 'proper' ? 'infinite_upper' : 'doubly_infinite';
            analysis.tests.push('Limite superior infinito');
        }
        
        // Testar convergência comparativa
        const testPoints = [0.1, 0.5, 1, 2, 5, 10];
        const values = [];
        
        for (const x of testPoints) {
            try {
                const y = f(x);
                if (isFinite(y)) {
                    values.push({ x, y });
                }
            } catch (e) {
                analysis.tests.push(`Ponto problemático em x ≈ ${x}`);
            }
        }
        
        // Testar comportamento assintótico
        if (values.length >= 3) {
            // Verificar se decresce rápido o suficiente para convergir
            const lastValues = values.slice(-3);
            const ratios = [];
            
            for (let i = 1; i < lastValues.length; i++) {
                const ratio = Math.abs(lastValues[i].y / lastValues[i-1].y);
                ratios.push(ratio);
            }
            
            const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
            analysis.converges = avgRatio < 0.5;
            analysis.convergenceRate = avgRatio;
        }
        
        return analysis;
    },

    analyzeIntegralProperties(expression, a, b) {
        const properties = {
            symmetric: false,
            odd: false,
            even: false,
            positive: true,
            negative: false,
            area: null
        };
        
        const f = Utils.createFunction(expression);
        
        // Testar simetria
        try {
            const fA = f(a);
            const fB = f(b);
            
            if (Math.abs(fA - fB) < 0.001) {
                properties.symmetric = true;
            }
            
            // Testar se é função ímpar (f(-x) = -f(x))
            const testX = 1;
            const fPos = f(testX);
            const fNeg = f(-testX);
            
            if (Math.abs(fPos + fNeg) < 0.001) {
                properties.odd = true;
            }
            
            // Testar se é função par (f(-x) = f(x))
            if (Math.abs(fPos - fNeg) < 0.001) {
                properties.even = true;
            }
            
            // Verificar sinal
            const midPoint = (a + b) / 2;
            const fMid = f(midPoint);
            properties.positive = fMid > 0;
            properties.negative = fMid < 0;
            
        } catch (e) {
            // Ignorar erros
        }
        
        return properties;
    },

    approachLimit(expression, point, direction, steps = 5) {
        const f = Utils.createFunction(expression);
        const increments = [0.1, 0.01, 0.001, 0.0001, 0.00001];
        let results = [];
        
        for (const epsilon of increments.slice(0, steps)) {
            try {
                const x = direction === 'left' ? point - epsilon : point + epsilon;
                const y = f(x);
                if (isFinite(y)) {
                    results.push(y);
                }
            } catch (e) {
                // Ignorar pontos problemáticos
            }
        }
        
        if (results.length === 0) return NaN;
        
        // Usar média ponderada (mais peso para valores com epsilon menor)
        let weightedSum = 0;
        let weightSum = 0;
        
        for (let i = 0; i < results.length; i++) {
            const weight = 1 / (i + 1); // Mais peso para valores mais próximos
            weightedSum += results[i] * weight;
            weightSum += weight;
        }
        
        return weightedSum / weightSum;
    },

    analyzeApproach(expression, point, direction) {
        const analysis = {
            values: [],
            convergence: 'unknown',
            oscillation: false,
            speed: 'normal'
        };
        
        const f = Utils.createFunction(expression);
        const increments = [0.5, 0.1, 0.05, 0.01, 0.005, 0.001, 0.0005, 0.0001];
        
        for (const epsilon of increments) {
            try {
                const x = direction === 'left' ? point - epsilon : point + epsilon;
                const y = f(x);
                if (isFinite(y)) {
                    analysis.values.push({ epsilon, value: y });
                }
            } catch (e) {
                // Ignorar pontos problemáticos
            }
        }
        
        if (analysis.values.length >= 3) {
            // Verificar oscilação
            let changesSign = 0;
            for (let i = 1; i < analysis.values.length; i++) {
                if (analysis.values[i].value * analysis.values[i-1].value < 0) {
                    changesSign++;
                }
            }
            analysis.oscillation = changesSign > analysis.values.length * 0.3;
            
            // Verificar velocidade de convergência
            const lastValues = analysis.values.slice(-3);
            const diffs = [];
            for (let i = 1; i < lastValues.length; i++) {
                diffs.push(Math.abs(lastValues[i].value - lastValues[i-1].value));
            }
            
            const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
            if (avgDiff < 0.001) {
                analysis.speed = 'fast';
                analysis.convergence = 'likely';
            } else if (avgDiff < 0.1) {
                analysis.speed = 'normal';
                analysis.convergence = 'likely';
            } else {
                analysis.speed = 'slow';
                analysis.convergence = 'uncertain';
            }
        }
        
        return analysis;
    },

    taylorExpansion(expression, point, order = 3) {
        try {
            const node = math.parse(expression);
            let expansion = '';
            let terms = [];
            
            for (let n = 0; n <= order; n++) {
                try {
                    let derivative = node;
                    for (let i = 0; i < n; i++) {
                        derivative = math.derivative(derivative, 'x');
                    }
                    
                    const derivativeAtPoint = derivative.evaluate({ x: point });
                    if (isFinite(derivativeAtPoint) && Math.abs(derivativeAtPoint) > 1e-10) {
                        const term = `(${derivativeAtPoint.toFixed(4)}/${this.factorial(n)})*(x-${point})^${n}`;
                        terms.push(term);
                    }
                } catch (e) {
                    // Derivada não pôde ser calculada
                    break;
                }
            }
            
            if (terms.length > 0) {
                expansion = terms.join(' + ');
                if (terms.length < order + 1) {
                    expansion += ' + ...';
                }
            }
            
            return expansion;
        } catch (e) {
            return 'Não foi possível calcular a expansão';
        }
    },

    analyzeAsymptoticBehavior(expression, point) {
        const analysis = {
            type: 'regular',
            verticalAsymptote: false,
            horizontalAsymptote: false,
            obliqueAsymptote: false,
            behavior: ''
        };
        
        const f = Utils.createFunction(expression);
        const testPoints = [point - 0.1, point - 0.01, point + 0.01, point + 0.1];
        const testLarge = [10, 100, 1000];
        
        // Testar para assíntotas verticais
        const valuesNear = [];
        for (const x of testPoints) {
            try {
                const y = f(x);
                if (!isFinite(y) || Math.abs(y) > 1e6) {
                    analysis.verticalAsymptote = true;
                    analysis.behavior += `Possível assíntota vertical em x → ${point}. `;
                } else {
                    valuesNear.push(y);
                }
            } catch (e) {
                analysis.verticalAsymptote = true;
            }
        }
        
        // Testar para assíntotas horizontais
        const valuesLarge = [];
        for (const x of testLarge) {
            try {
                const y = f(x);
                if (isFinite(y)) {
                    valuesLarge.push(y);
                }
            } catch (e) {
                // Ignorar
            }
        }
        
        if (valuesLarge.length >= 2) {
            // Verificar se converge para um valor
            const lastValues = valuesLarge.slice(-3);
            const avg = lastValues.reduce((a, b) => a + b, 0) / lastValues.length;
            const variance = lastValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / lastValues.length;
            
            if (variance < 0.01) {
                analysis.horizontalAsymptote = true;
                analysis.behavior += `Assíntota horizontal em y ≈ ${avg.toFixed(2)} quando x → ∞. `;
            }
        }
        
        return analysis;
    },

    calculateCurvature(expression, point) {
        try {
            const node = math.parse(expression);
            const fPrime = math.derivative(node, 'x');
            const fDoublePrime = math.derivative(fPrime, 'x');
            
            const yPrime = fPrime.evaluate({ x: point });
            const yDoublePrime = fDoublePrime.evaluate({ x: point });
            
            // Curvatura κ = |y''| / (1 + (y')²)^(3/2)
            const curvature = Math.abs(yDoublePrime) / Math.pow(1 + Math.pow(yPrime, 2), 1.5);
            
            return {
                value: curvature,
                radius: curvature > 0 ? 1 / curvature : Infinity,
                type: yDoublePrime > 0 ? 'concave_up' : yDoublePrime < 0 ? 'concave_down' : 'inflection'
            };
        } catch (e) {
            return null;
        }
    },

    formatMathExpression(expr) {
        // Melhor formatação para exibição
        return expr
            .replace(/\^/g, '^')
            .replace(/\*\*/g, '^')
            .replace(/\*/g, '·')
            .replace(/sin\(/g, 'sin(')
            .replace(/cos\(/g, 'cos(')
            .replace(/tan\(/g, 'tan(')
            .replace(/exp\(/g, 'e^')
            .replace(/log\(/g, 'ln(')
            .replace(/sqrt\(/g, '√(')
            .replace(/pi/g, 'π')
            .replace(/e\^\(/g, 'e^{')
            .replace(/\^\(/g, '^{')
            .replace(/\)\^/g, '}^{')
            .replace(/(\d)([a-zA-Zπ])/g, '$1·$2')
            .replace(/([a-zA-Zπ])(\d)/g, '$1·$2');
    },

    factorial(n) {
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    },

    // Análise de extremos e concavidade aprimorada
    analyzeExtremaAndConcavity(expression) {
        const cacheKey = `extrema_${expression}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const analysis = {
            criticalPoints: [],
            inflectionPoints: [],
            increasing: [],
            decreasing: [],
            concaveUp: [],
            concaveDown: [],
            localMaxima: [],
            localMinima: [],
            saddlePoints: [],
            intervals: {
                increasing: [],
                decreasing: [],
                concaveUp: [],
                concaveDown: []
            }
        };

        try {
            const node = math.parse(expression);
            const fPrime = math.derivative(node, 'x');
            const fDoublePrime = math.derivative(fPrime, 'x');
            
            // Usar amostragem adaptativa
            const step = 0.05;
            let previousYPrime = null;
            let previousYDoublePrime = null;
            
            for (let x = -5; x <= 5; x += step) {
                try {
                    const yPrime = fPrime.evaluate({ x: x });
                    const yDoublePrime = fDoublePrime.evaluate({ x: x });
                    
                    // Detectar mudanças de sinal para pontos críticos
                    if (previousYPrime !== null) {
                        if (yPrime * previousYPrime <= 0 && Math.abs(yPrime) < 0.2) {
                            // Possível ponto crítico, refinar busca
                            const criticalPoint = this.findCriticalPoint(expression, x - step, x);
                            if (criticalPoint) {
                                analysis.criticalPoints.push(criticalPoint);
                                
                                // Classificar o ponto crítico
                                if (criticalPoint.type === 'mínimo') {
                                    analysis.localMinima.push(criticalPoint);
                                } else if (criticalPoint.type === 'máximo') {
                                    analysis.localMaxima.push(criticalPoint);
                                } else {
                                    analysis.saddlePoints.push(criticalPoint);
                                }
                            }
                        }
                    }
                    
                    // Detectar pontos de inflexão
                    if (previousYDoublePrime !== null) {
                        if (yDoublePrime * previousYDoublePrime <= 0 && Math.abs(yDoublePrime) < 0.2) {
                            const inflectionPoint = this.findInflectionPoint(expression, x - step, x);
                            if (inflectionPoint) {
                                analysis.inflectionPoints.push(inflectionPoint);
                            }
                        }
                    }
                    
                    // Intervalos de crescimento/decrescimento
                    if (yPrime > 0) {
                        analysis.increasing.push(x);
                        this.addToInterval(analysis.intervals.increasing, x);
                    } else if (yPrime < 0) {
                        analysis.decreasing.push(x);
                        this.addToInterval(analysis.intervals.decreasing, x);
                    }
                    
                    // Concavidade
                    if (yDoublePrime > 0) {
                        analysis.concaveUp.push(x);
                        this.addToInterval(analysis.intervals.concaveUp, x);
                    } else if (yDoublePrime < 0) {
                        analysis.concaveDown.push(x);
                        this.addToInterval(analysis.intervals.concaveDown, x);
                    }
                    
                    previousYPrime = yPrime;
                    previousYDoublePrime = yDoublePrime;
                    
                } catch (e) {
                    // Reiniciar ao encontrar descontinuidade
                    previousYPrime = null;
                    previousYDoublePrime = null;
                }
            }
            
            // Ordenar e limpar intervalos
            analysis.intervals = this.cleanIntervals(analysis.intervals);
            
            // Adicionar informações estatísticas
            analysis.stats = {
                totalCriticalPoints: analysis.criticalPoints.length,
                totalInflectionPoints: analysis.inflectionPoints.length,
                increasingPercentage: (analysis.increasing.length / (10/step)) * 100,
                decreasingPercentage: (analysis.decreasing.length / (10/step)) * 100
            };
            
            this.cache.set(cacheKey, analysis);
            
        } catch (error) {
            console.warn('Não foi possível analisar extremos:', error);
        }

        return analysis;
    },

    findCriticalPoint(expression, a, b, tolerance = 0.0001) {
        try {
            const node = math.parse(expression);
            const fPrime = math.derivative(node, 'x');
            const fDoublePrime = math.derivative(fPrime, 'x');
            
            // Método da bisseção para encontrar raiz de f'(x) = 0
            let left = a;
            let right = b;
            let midpoint;
            
            for (let i = 0; i < 20; i++) {
                midpoint = (left + right) / 2;
                const yPrime = fPrime.evaluate({ x: midpoint });
                
                if (Math.abs(yPrime) < tolerance) {
                    break;
                }
                
                const yPrimeLeft = fPrime.evaluate({ x: left });
                if (yPrime * yPrimeLeft < 0) {
                    right = midpoint;
                } else {
                    left = midpoint;
                }
            }
            
            const yDoublePrime = fDoublePrime.evaluate({ x: midpoint });
            const yValue = node.evaluate({ x: midpoint });
            
            return {
                x: midpoint,
                value: yValue,
                type: yDoublePrime > 0 ? 'mínimo' : yDoublePrime < 0 ? 'máximo' : 'ponto sela',
                derivative: fPrime.evaluate({ x: midpoint }),
                secondDerivative: yDoublePrime
            };
            
        } catch (e) {
            return null;
        }
    },

    findInflectionPoint(expression, a, b, tolerance = 0.0001) {
        try {
            const node = math.parse(expression);
            const fDoublePrime = math.derivative(math.derivative(node, 'x'), 'x');
            
            // Método da bisseção para encontrar raiz de f''(x) = 0
            let left = a;
            let right = b;
            let midpoint;
            
            for (let i = 0; i < 20; i++) {
                midpoint = (left + right) / 2;
                const yDoublePrime = fDoublePrime.evaluate({ x: midpoint });
                
                if (Math.abs(yDoublePrime) < tolerance) {
                    break;
                }
                
                const yDoublePrimeLeft = fDoublePrime.evaluate({ x: left });
                if (yDoublePrime * yDoublePrimeLeft < 0) {
                    right = midpoint;
                } else {
                    left = midpoint;
                }
            }
            
            return {
                x: midpoint,
                value: node.evaluate({ x: midpoint }),
                secondDerivative: fDoublePrime.evaluate({ x: midpoint })
            };
            
        } catch (e) {
            return null;
        }
    },

    addToInterval(intervals, x) {
        if (intervals.length === 0) {
            intervals.push({ start: x, end: x });
            return;
        }
        
        const lastInterval = intervals[intervals.length - 1];
        if (Math.abs(x - lastInterval.end) < 0.06) { // ligeiramente maior que o passo
            lastInterval.end = x;
        } else {
            intervals.push({ start: x, end: x });
        }
    },

    cleanIntervals(intervalsObj) {
        const cleaned = {};
        
        for (const [key, intervals] of Object.entries(intervalsObj)) {
            cleaned[key] = intervals.filter(interval => 
                Math.abs(interval.end - interval.start) > 0.1 // Remover intervalos muito pequenos
            ).map(interval => ({
                start: interval.start.toFixed(2),
                end: interval.end.toFixed(2),
                length: (interval.end - interval.start).toFixed(2)
            }));
        }
        
        return cleaned;
    },

    clearCache() {
        this.cache.clear();
    },

    // Geração de passo a passo aprimorada
    generateDerivativeSteps(expression, point) {
        const steps = [];
        const stepDetails = {
            expression: expression,
            point: point,
            timestamp: new Date().toISOString()
        };
        
        try {
            // 1. Função original
            steps.push({
                step: 1,
                title: '📝 Função Original',
                content: `$$f(x) = ${this.formatLatex(expression)}$`,
                latex: true,
                icon: 'function'
            });
            
            // 2. Análise da função
            const functionAnalysis = this.analyzeFunctionStructure(expression);
            if (functionAnalysis) {
                steps.push({
                    step: 2,
                    title: '🔍 Análise da Estrutura',
                    content: functionAnalysis,
                    icon: 'search'
                });
            }
            
            // 3. Regras de derivação aplicáveis
            const applicableRules = this.identifyDerivativeRules(expression);
            if (applicableRules.length > 0) {
                steps.push({
                    step: 3,
                    title: '📚 Regras de Derivação',
                    content: `<div class="space-y-2">${applicableRules.map(rule => 
                        `<div class="flex items-center gap-2">
                            <span class="w-2 h-2 bg-indigo-500 rounded-full"></span>
                            <span>${rule}</span>
                        </div>`
                    ).join('')}</div>`,
                    icon: 'book'
                });
            }
            
            // 4. Derivação passo a passo
            const derivationSteps = this.deriveStepByStep(expression);
            if (derivationSteps.length > 0) {
                steps.push({
                    step: 4,
                    title: '🧮 Derivação Detalhada',
                    content: `<div class="space-y-3">${derivationSteps.map(step => 
                        `<div class="pl-4 border-l-2 border-indigo-200">
                            <div class="text-sm font-medium text-indigo-700">${step.operation}</div>
                            <div class="text-xs text-slate-600">${step.result}</div>
                        </div>`
                    ).join('')}</div>`,
                    icon: 'calculator'
                });
            }
            
            // 5. Derivada final
            const derivative = math.derivative(math.parse(expression), 'x');
            const derivativeStr = derivative.toString();
            
            steps.push({
                step: 5,
                title: '✅ Derivada Encontrada',
                content: `$$f'(x) = ${this.formatLatex(derivativeStr)}$`,
                latex: true,
                icon: 'check'
            });
            
            // 6. Simplificação
            try {
                const simplified = math.simplify(derivativeStr);
                if (simplified.toString() !== derivativeStr) {
                    steps.push({
                        step: 6,
                        title: '✨ Simplificação',
                        content: `$$f'(x) = ${this.formatLatex(simplified.toString())}$`,
                        latex: true,
                        icon: 'magic'
                    });
                }
            } catch (e) {
                // Ignorar se não puder simplificar
            }
            
            // 7. Avaliação no ponto
            const valueAtPoint = derivative.evaluate({x: point});
            
            steps.push({
                step: 7,
                title: '📍 Avaliação no Ponto',
                content: `Substituindo $x = ${point}$:<br>
                         $$f'(${point}) = ${this.formatLatex(derivativeStr)} \\Big|_{x=${point}}$$<br>
                         $$f'(${point}) = ${valueAtPoint.toFixed(6)}$$`,
                latex: true,
                icon: 'crosshairs'
            });
            
            // 8. Análise numérica
            const analysis = this.analyzeDerivativeAtPoint(expression, point, valueAtPoint);
            if (analysis) {
                steps.push({
                    step: 8,
                    title: '📈 Análise Numérica',
                    content: analysis,
                    icon: 'chart-line'
                });
            }
            
            // 9. Interpretação geométrica
            steps.push({
                step: 9,
                title: '📐 Interpretação Geométrica',
                content: this.getDerivativeInterpretation(valueAtPoint, point),
                icon: 'ruler'
            });
            
            // 10. Aplicações
            steps.push({
                step: 10,
                title: '🚀 Aplicações Práticas',
                content: this.getPracticalApplications(expression, point, valueAtPoint),
                icon: 'rocket'
            });
            
        } catch (e) {
            steps.push({
                step: 1,
                title: '❌ Erro no Cálculo',
                content: `Não foi possível calcular o passo a passo: ${e.message}`,
                icon: 'exclamation-triangle'
            });
        }
        
        return steps;
    },

    analyzeFunctionStructure(expression) {
        try {
            const node = math.parse(expression);
            const structure = {
                type: 'unknown',
                components: [],
                complexity: 'simple'
            };
            
            if (node.isConstantNode) {
                structure.type = 'constante';
            } else if (node.isSymbolNode) {
                structure.type = 'variável';
            } else if (node.isOperatorNode) {
                structure.type = 'operador';
                structure.operator = node.op;
                structure.components = node.args.map(arg => arg.toString());
            } else if (node.isFunctionNode) {
                structure.type = 'função';
                structure.functionName = node.name;
                structure.argument = node.args[0].toString();
            }
            
            // Avaliar complexidade
            const complexityScore = this.calculateComplexity(node);
            if (complexityScore > 5) structure.complexity = 'complexa';
            else if (complexityScore > 2) structure.complexity = 'média';
            
            return `
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium">Tipo:</span>
                        <span class="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">${structure.type}</span>
                    </div>
                    ${structure.operator ? `
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium">Operador:</span>
                        <span class="text-sm">${structure.operator}</span>
                    </div>` : ''}
                    ${structure.components.length > 0 ? `
                    <div>
                        <span class="text-sm font-medium block mb-1">Componentes:</span>
                        <div class="flex flex-wrap gap-1">
                            ${structure.components.map(comp => 
                                `<span class="px-2 py-1 bg-slate-100 rounded text-xs">${comp}</span>`
                            ).join('')}
                        </div>
                    </div>` : ''}
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium">Complexidade:</span>
                        <span class="px-2 py-1 ${structure.complexity === 'complexa' ? 'bg-red-100 text-red-800' : 
                                           structure.complexity === 'média' ? 'bg-amber-100 text-amber-800' : 
                                           'bg-green-100 text-green-800'} rounded text-xs">
                            ${structure.complexity}
                        </span>
                    </div>
                </div>
            `;
        } catch (e) {
            return null;
        }
    },

    calculateComplexity(node) {
        let score = 0;
        
        const traverse = (n) => {
            if (n.isOperatorNode) {
                score += 1;
                n.args.forEach(traverse);
            } else if (n.isFunctionNode) {
                score += 2;
                n.args.forEach(traverse);
            } else if (n.isParenthesisNode) {
                score += 0.5;
                traverse(n.content);
            }
        };
        
        traverse(node);
        return score;
    },

    identifyDerivativeRules(expression) {
        const rules = new Set();
        const node = math.parse(expression);
        
        const traverse = (n) => {
            if (n.isConstantNode) {
                rules.add('Regra da constante: $\\frac{d}{dx}[c] = 0$');
            } else if (n.isSymbolNode && n.name === 'x') {
                rules.add('Regra da potência: $\\frac{d}{dx}[x] = 1$');
            } else if (n.isOperatorNode && n.op === '^' && n.args[1].isConstantNode) {
                const exponent = n.args[1].value;
                rules.add(`Regra da potência: $\\frac{d}{dx}[x^{${exponent}}] = ${exponent}x^{${exponent-1}}$`);
            } else if (n.isFunctionNode) {
                switch(n.name) {
                    case 'sin':
                        rules.add('Regra do seno: $\\frac{d}{dx}[\\sin(x)] = \\cos(x)$');
                        break;
                    case 'cos':
                        rules.add('Regra do cosseno: $\\frac{d}{dx}[\\cos(x)] = -\\sin(x)$');
                        break;
                    case 'tan':
                        rules.add('Regra da tangente: $\\frac{d}{dx}[\\tan(x)] = \\sec^2(x)$');
                        break;
                    case 'exp':
                        rules.add('Regra exponencial: $\\frac{d}{dx}[e^x] = e^x$');
                        break;
                    case 'log':
                        rules.add('Regra logarítmica: $\\frac{d}{dx}[\\ln(x)] = \\frac{1}{x}$');
                        break;
                    case 'sqrt':
                        rules.add('Regra da raiz: $\\frac{d}{dx}[\\sqrt{x}] = \\frac{1}{2\\sqrt{x}}$');
                        break;
                }
            } else if (n.isOperatorNode && n.op === '*') {
                rules.add('Regra do produto: $\\frac{d}{dx}[f(x)g(x)] = f\'g + fg\'$');
            } else if (n.isOperatorNode && n.op === '/') {
                rules.add('Regra do quociente: $\\frac{d}{dx}[\\frac{f(x)}{g(x)}] = \\frac{f\'g - fg\'}{g^2}$');
            } else if (n.isOperatorNode && (n.op === '+' || n.op === '-')) {
                rules.add('Regra da soma/diferença: $\\frac{d}{dx}[f(x) ± g(x)] = f\'(x) ± g\'(x)$');
            }
            
            if (n.args) {
                n.args.forEach(traverse);
            }
        };
        
        traverse(node);
        return Array.from(rules);
    },

    deriveStepByStep(expression) {
        const steps = [];
        
        try {
            const node = math.parse(expression);
            
            // Função auxiliar para processar nós
            const processNode = (n, depth = 0) => {
                if (n.isConstantNode) {
                    steps.push({
                        operation: `Derivar constante ${n.value}`,
                        result: `$\\frac{d}{dx}[${n.value}] = 0$`
                    });
                    return '0';
                } else if (n.isSymbolNode && n.name === 'x') {
                    steps.push({
                        operation: 'Derivar variável x',
                        result: '$\\frac{d}{dx}[x] = 1$'
                    });
                    return '1';
                } else if (n.isOperatorNode && n.op === '^' && n.args[1].isConstantNode) {
                    const base = n.args[0].toString();
                    const exponent = n.args[1].value;
                    steps.push({
                        operation: `Aplicar regra da potência a ${base}^${exponent}`,
                        result: `$\\frac{d}{dx}[${base}^{${exponent}}] = ${exponent}${base}^{${exponent-1}}$`
                    });
                    return `${exponent}${base}^{${exponent-1}}`;
                } else if (n.isFunctionNode) {
                    const arg = n.args[0].toString();
                    let derivative;
                    
                    switch(n.name) {
                        case 'sin':
                            derivative = `cos(${arg})`;
                            steps.push({
                                operation: `Derivar seno de ${arg}`,
                                result: `$\\frac{d}{dx}[\\sin(${arg})] = \\cos(${arg})$`
                            });
                            break;
                        case 'cos':
                            derivative = `-sin(${arg})`;
                            steps.push({
                                operation: `Derivar cosseno de ${arg}`,
                                result: `$\\frac{d}{dx}[\\cos(${arg})] = -\\sin(${arg})$`
                            });
                            break;
                        case 'exp':
                            derivative = `exp(${arg})`;
                            steps.push({
                                operation: `Derivar exponencial de ${arg}`,
                                result: `$\\frac{d}{dx}[e^{${arg}}] = e^{${arg}}$`
                            });
                            break;
                        default:
                            derivative = `derivative(${n.name}(${arg}))`;
                    }
                    
                    // Aplicar regra da cadeia se necessário
                    if (arg !== 'x') {
                        steps.push({
                            operation: 'Aplicar regra da cadeia',
                            result: `Multiplicar pela derivada de ${arg}`
                        });
                    }
                    
                    return derivative;
                } else if (n.isOperatorNode && (n.op === '+' || n.op === '-')) {
                    const leftDeriv = processNode(n.args[0], depth + 1);
                    const rightDeriv = processNode(n.args[1], depth + 1);
                    const result = `(${leftDeriv}) ${n.op} (${rightDeriv})`;
                    
                    steps.push({
                        operation: `Aplicar regra da ${n.op === '+' ? 'soma' : 'diferença'}`,
                        result: `$\\frac{d}{dx}[${n.args[0].toString()} ${n.op} ${n.args[1].toString()}] = ${leftDeriv} ${n.op} ${rightDeriv}$`
                    });
                    
                    return result;
                }
                
                return `derivative(${n.toString()})`;
            };
            
            processNode(node);
            
        } catch (e) {
            steps.push({
                operation: 'Erro na derivação passo a passo',
                result: e.message
            });
        }
        
        return steps;
    },

    analyzeDerivativeAtPoint(expression, point, value) {
        try {
            const node = math.parse(expression);
            const fDoublePrime = math.derivative(math.derivative(node, 'x'), 'x');
            const secondDeriv = fDoublePrime.evaluate({ x: point });
            
            let analysis = `<div class="space-y-2">`;
            
            // Sinal da derivada
            if (value > 0) {
                analysis += `
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-green-500"></div>
                        <span class="text-sm">Derivada <strong>positiva</strong> (${value.toFixed(6)})</span>
                    </div>
                    <div class="text-xs text-slate-600 ml-5">A função é <strong>crescente</strong> neste ponto</div>
                `;
            } else if (value < 0) {
                analysis += `
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-red-500"></div>
                        <span class="text-sm">Derivada <strong>negativa</strong> (${value.toFixed(6)})</span>
                    </div>
                    <div class="text-xs text-slate-600 ml-5">A função é <strong>decrescente</strong> neste ponto</div>
                `;
            } else {
                analysis += `
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span class="text-sm">Derivada <strong>zero</strong></span>
                    </div>
                    <div class="text-xs text-slate-600 ml-5">Possível ponto crítico (máximo, mínimo ou ponto de sela)</div>
                `;
            }
            
            // Segunda derivada
            if (!isNaN(secondDeriv)) {
                analysis += `
                    <div class="mt-3">
                        <div class="text-sm font-medium">Segunda derivada: $f''(${point}) = ${secondDeriv.toFixed(6)}$</div>
                `;
                
                if (secondDeriv > 0) {
                    analysis += `<div class="text-xs text-slate-600">Concavidade para cima (convexa)</div>`;
                } else if (secondDeriv < 0) {
                    analysis += `<div class="text-xs text-slate-600">Concavidade para baixo (côncava)</div>`;
                } else {
                    analysis += `<div class="text-xs text-slate-600">Possível ponto de inflexão</div>`;
                }
                
                analysis += `</div>`;
            }
            
            // Taxa de variação
            analysis += `
                <div class="mt-3">
                    <div class="text-sm font-medium">Taxa de variação instantânea:</div>
                    <div class="text-xs text-slate-600">Para cada unidade que x aumenta, f(x) ${value > 0 ? 'aumenta' : 'diminui'} aproximadamente ${Math.abs(value).toFixed(4)} unidades</div>
                </div>
            `;
            
            analysis += `</div>`;
            return analysis;
            
        } catch (e) {
            return null;
        }
    },

    getDerivativeInterpretation(value, point) {
        let interpretation = `<div class="space-y-3">`;
        
        // Interpretação geométrica
        interpretation += `
            <div>
                <div class="text-sm font-medium mb-1">📐 Interpretação Geométrica</div>
                <div class="text-xs text-slate-600">
                    A derivada $f'(${point}) = ${value.toFixed(4)}$ representa o <strong>coeficiente angular da reta tangente</strong> à curva no ponto $(x, y) = (${point}, f(${point}))$.
                </div>
            </div>
        `;
        
        // Interpretação física
        interpretation += `
            <div>
                <div class="text-sm font-medium mb-1">⚡ Interpretação Física</div>
                <div class="text-xs text-slate-600">
                    Se $f(t)$ representa a posição de um objeto no tempo $t$, então $f'(${point})$ representa a <strong>velocidade instantânea</strong> no tempo $t = ${point}$.
                </div>
            </div>
        `;
        
        // Interpretação econômica
        interpretation += `
            <div>
                <div class="text-sm font-medium mb-1">💰 Interpretação Econômica</div>
                <div class="text-xs text-slate-600">
                    Se $f(x)$ representa o custo total de produção de $x$ unidades, então $f'(${point})$ representa o <strong>custo marginal</strong> de produzir uma unidade adicional quando já foram produzidas ${point} unidades.
                </div>
            </div>
        `;
        
        // Gráfico mental
        interpretation += `
            <div>
                <div class="text-sm font-medium mb-1">📊 Visualização Mental</div>
                <div class="text-xs text-slate-600">
                    Imagine o gráfico de $f(x)$. No ponto $x = ${point}$, desenhe uma reta tangente. A inclinação dessa reta é exatamente ${value.toFixed(4)}.
                    ${value > 0 ? 'A reta sobe da esquerda para a direita.' : 
                      value < 0 ? 'A reta desce da esquerda para a direita.' : 
                      'A reta é horizontal.'}
                </div>
            </div>
        `;
        
        interpretation += `</div>`;
        return interpretation;
    },

    getPracticalApplications(expression, point, value) {
        let applications = `<div class="space-y-3">`;
        
        // Aplicações baseadas no valor da derivada
        if (Math.abs(value) > 10) {
            applications += `
                <div class="flex items-start gap-2">
                    <div class="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-bolt text-red-600 text-xs"></i>
                    </div>
                    <div>
                        <div class="text-sm font-medium">Alta Taxa de Variação</div>
                        <div class="text-xs text-slate-600">
                            A função está mudando rapidamente neste ponto. Em contextos práticos, isso pode indicar:
                            <ul class="list-disc pl-4 mt-1">
                                <li>Rápida aceleração/deceleração em física</li>
                                <li>Mudanças bruscas em dados econômicos</li>
                                <li>Transições rápidas em sistemas dinâmicos</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        } else if (Math.abs(value) < 0.1) {
            applications += `
                <div class="flex items-start gap-2">
                    <div class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-leaf text-green-600 text-xs"></i>
                    </div>
                    <div>
                        <div class="text-sm font-medium">Baixa Taxa de Variação</div>
                        <div class="text-xs text-slate-600">
                            A função está quase constante neste ponto. Em contextos práticos, isso pode indicar:
                            <ul class="list-disc pl-4 mt-1">
                                <li>Estabilidade em sistemas de controle</li>
                                <li>Períodos de calmaria em dados temporais</li>
                                <li>Regiões de operação ótima em otimização</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Aplicações gerais
        applications += `
            <div class="grid grid-cols-2 gap-2">
                <div class="p-2 bg-blue-50 rounded">
                    <div class="text-xs font-medium text-blue-700">Engenharia</div>
                    <div class="text-xs text-blue-600 mt-1">Velocidade instantânea, aceleração, taxa de fluxo</div>
                </div>
                <div class="p-2 bg-emerald-50 rounded">
                    <div class="text-xs font-medium text-emerald-700">Economia</div>
                    <div class="text-xs text-emerald-600 mt-1">Custo marginal, receita marginal, elasticidade</div>
                </div>
                <div class="p-2 bg-purple-50 rounded">
                    <div class="text-xs font-medium text-purple-700">Biologia</div>
                    <div class="text-xs text-purple-600 mt-1">Taxas de crescimento populacional, difusão</div>
                </div>
                <div class="p-2 bg-amber-50 rounded">
                    <div class="text-xs font-medium text-amber-700">Machine Learning</div>
                    <div class="text-xs text-amber-600 mt-1">Gradiente descendente, otimização</div>
                </div>
            </div>
        `;
        
        applications += `</div>`;
        return applications;
    },

    formatLatex(expr) {
        return expr
            .replace(/\^/g, '^{')
            .replace(/\*\*/g, '^')
            .replace(/\*/g, '\\cdot ')
            .replace(/sin\(/g, '\\sin(')
            .replace(/cos\(/g, '\\cos(')
            .replace(/tan\(/g, '\\tan(')
            .replace(/exp\(/g, 'e^{')
            .replace(/log\(/g, '\\ln(')
            .replace(/sqrt\(/g, '\\sqrt{')
            .replace(/pi/g, '\\pi')
            .replace(/(\d)([a-zA-Z])/g, '$1\\cdot $2')
            .replace(/([a-zA-Z])(\d)/g, '$1\\cdot $2')
            .replace(/e\^\{([^}]+)\}/g, 'e^{$1}')
            .replace(/\^\{([^}]+)\}/g, '^{$1}');
    }
};

window.Calculator = Calculator;