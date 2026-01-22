// Módulo de cálculos matemáticos
const Calculator = {
    // Calcular derivada
    calculateDerivative(expression, point) {
        try {
            const node = math.parse(expression);
            const derivative = math.derivative(node, 'x');
            const valueAtPoint = derivative.evaluate({ x: point });
            
            return {
                symbolic: derivative.toString(),
                numeric: valueAtPoint,
                tangentEquation: this.getTangentEquation(expression, point)
            };
        } catch (error) {
            throw new Error(`Erro ao calcular derivada: ${error.message}`);
        }
    },

    // Calcular integral
    calculateIntegral(expression, a, b, options = {}) {
        try {
            const result = {
                method: 'numérica',
                symbolic: null,
                numeric: null,
                improper: options.improper || false
            };

            // Tentar cálculo simbólico
            try {
                const node = math.parse(expression);
                const integral = math.integrate(node, 'x');
                result.symbolic = integral.toString();
                result.method = 'simbólica';
                
                const valA = integral.evaluate({ x: a });
                const valB = integral.evaluate({ x: b });
                result.numeric = valB - valA;
            } catch (symError) {
                // Fallback para integração numérica
                result.numeric = this.numericalIntegration(expression, a, b);
            }

            if (options.improper) {
                result.convergence = this.checkConvergence(expression, a, b);
            }

            return result;
        } catch (error) {
            throw new Error(`Erro ao calcular integral: ${error.message}`);
        }
    },

    // Calcular limite
    calculateLimit(expression, point, direction = 'both') {
        try {
            const f = Utils.createFunction(expression);
            const epsilon = 0.0001;
            let leftLimit, rightLimit, limit;

            if (direction === 'left' || direction === 'both') {
                leftLimit = f(point - epsilon);
            }

            if (direction === 'right' || direction === 'both') {
                rightLimit = f(point + epsilon);
            }

            if (direction === 'both' && Math.abs(leftLimit - rightLimit) < 0.001) {
                limit = (leftLimit + rightLimit) / 2;
            } else {
                limit = direction === 'left' ? leftLimit : rightLimit;
            }

            return {
                left: leftLimit,
                right: rightLimit,
                value: limit,
                exists: direction === 'both' ? Math.abs(leftLimit - rightLimit) < 0.001 : true
            };
        } catch (error) {
            throw new Error(`Erro ao calcular limite: ${error.message}`);
        }
    },

    // Métodos auxiliares
    numericalIntegration(expression, a, b, n = 1000) {
        const f = Utils.createFunction(expression);
        const h = (b - a) / n;
        let sum = f(a) + f(b);
        
        for (let i = 1; i < n; i++) {
            const x = a + i * h;
            sum += i % 2 === 0 ? 2 * f(x) : 4 * f(x);
        }
        
        return (h / 3) * sum;
    },

    checkConvergence(expression, a, b) {
        const tests = [];
        const f = Utils.createFunction(expression);
        
        // Verificar limites infinitos
        if (!isFinite(a) || !isFinite(b)) {
            tests.push('Limites infinitos detectados');
        }
        
        // Verificar descontinuidades
        for (let x = a; x <= b; x += (b - a) / 10) {
            try {
                const y = f(x);
                if (!isFinite(y)) {
                    tests.push(`Descontinuidade em x ≈ ${x.toFixed(2)}`);
                }
            } catch (e) {
                tests.push(`Ponto problemático em x ≈ ${x.toFixed(2)}`);
            }
        }
        
        return tests.length > 0 ? tests : ['Parece convergente'];
    },

    getTangentEquation(expression, point) {
        try {
            const node = math.parse(expression);
            const derivative = math.derivative(node, 'x');
            const slope = derivative.evaluate({ x: point });
            const y0 = node.evaluate({ x: point });
            
            return `y = ${Utils.formatNumber(slope)}(x - ${Utils.formatNumber(point)}) + ${Utils.formatNumber(y0)}`;
        } catch (error) {
            return 'Não foi possível determinar a equação';
        }
    },

    // Análise de extremos e concavidade
    analyzeExtremaAndConcavity(expression) {
        const analysis = {
            criticalPoints: [],
            inflectionPoints: [],
            increasing: [],
            decreasing: [],
            concaveUp: [],
            concaveDown: []
        };

        try {
            const node = math.parse(expression);
            const fPrime = math.derivative(node, 'x');
            const fDoublePrime = math.derivative(fPrime, 'x');
            
            // Análise no intervalo [-5, 5]
            const step = 0.1;
            for (let x = -5; x <= 5; x += step) {
                try {
                    const yPrime = fPrime.evaluate({ x: x });
                    const yDoublePrime = fDoublePrime.evaluate({ x: x });
                    
                    // Pontos críticos
                    if (Math.abs(yPrime) < 0.1) {
                        analysis.criticalPoints.push({
                            x: x,
                            value: node.evaluate({ x: x }),
                            type: yDoublePrime > 0 ? 'mínimo' : yDoublePrime < 0 ? 'máximo' : 'ponto sela'
                        });
                    }
                    
                    // Pontos de inflexão
                    if (Math.abs(yDoublePrime) < 0.1) {
                        const prevX = x - step / 2;
                        const nextX = x + step / 2;
                        const prevDoublePrime = fDoublePrime.evaluate({ x: prevX });
                        const nextDoublePrime = fDoublePrime.evaluate({ x: nextX });
                        
                        if (prevDoublePrime * nextDoublePrime < 0) {
                            analysis.inflectionPoints.push({
                                x: x,
                                value: node.evaluate({ x: x })
                            });
                        }
                    }
                    
                    // Intervalos de crescimento/decrescimento
                    if (yPrime > 0) analysis.increasing.push(x);
                    if (yPrime < 0) analysis.decreasing.push(x);
                    
                    // Concavidade
                    if (yDoublePrime > 0) analysis.concaveUp.push(x);
                    if (yDoublePrime < 0) analysis.concaveDown.push(x);
                    
                } catch (e) {
                    // Ignorar pontos problemáticos
                }
            }
        } catch (error) {
            console.warn('Não foi possível analisar extremos:', error);
        }

        return analysis;
    }
};

window.Calculator = Calculator;