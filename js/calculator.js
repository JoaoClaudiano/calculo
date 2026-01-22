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
    },

    // Funções para passo a passo detalhado
    generateDerivativeSteps(expression, point) {
        const steps = [];
        
        try {
            // 1. Mostrar função original
            steps.push({
                step: 1,
                title: 'Função Original',
                content: `$$f(x) = ${this.formatLatex(expression)}$$`,
                latex: true
            });
            
            // 2. Analisar termos da função
            const terms = this.extractTerms(expression);
            if (terms.length > 0) {
                steps.push({
                    step: 2,
                    title: 'Identificação dos Termos',
                    content: `A função possui ${terms.length} termo(s):<br>` +
                             terms.map(t => `• ${this.formatLatex(t)}`).join('<br>')
                });
            }
            
            // 3. Calcular derivada termo a termo
            const derivativeSteps = this.deriveTermByTerm(expression);
            if (derivativeSteps.length > 0) {
                steps.push({
                    step: 3,
                    title: 'Derivação Termo a Termo',
                    content: derivativeSteps.join('<br>')
                });
            }
            
            // 4. Derivada final
            const derivative = math.derivative(math.parse(expression), 'x');
            const derivativeStr = derivative.toString();
            
            steps.push({
                step: 4,
                title: 'Derivada Encontrada',
                content: `$$f'(x) = ${this.formatLatex(derivativeStr)}$$`,
                latex: true
            });
            
            // 5. Simplificação
            try {
                const simplified = math.simplify(derivativeStr);
                if (simplified.toString() !== derivativeStr) {
                    steps.push({
                        step: 5,
                        title: 'Simplificação',
                        content: `$$f'(x) = ${this.formatLatex(simplified.toString())}$$`,
                        latex: true
                    });
                }
            } catch (e) {
                // Ignorar se não puder simplificar
            }
            
            // 6. Avaliação no ponto
            const valueAtPoint = derivative.evaluate({x: point});
            
            steps.push({
                step: 6,
                title: 'Avaliação no Ponto',
                content: `Substituindo $x = ${point}$:<br>` +
                         `$$f'(${point}) = ${this.formatLatex(derivativeStr)} \\Big|_{x=${point}}$$<br>` +
                         `$$f'(${point}) = ${valueAtPoint.toFixed(4)}$$`,
                latex: true
            });
            
            // 7. Interpretação
            steps.push({
                step: 7,
                title: 'Interpretação Geométrica',
                content: this.getDerivativeInterpretation(valueAtPoint, point)
            });
            
            // 8. Equação da reta tangente
            if (valueAtPoint !== undefined) {
                const y0 = math.parse(expression).evaluate({x: point});
                steps.push({
                    step: 8,
                    title: 'Equação da Reta Tangente',
                    content: `Ponto: $(x_0, y_0) = (${point}, ${y0.toFixed(4)})$<br>` +
                             `Coeficiente angular: $m = f'(${point}) = ${valueAtPoint.toFixed(4)}$<br>` +
                             `Equação: $y - ${y0.toFixed(4)} = ${valueAtPoint.toFixed(4)}(x - ${point})$<br>` +
                             `Simplificando: $y = ${valueAtPoint.toFixed(4)}x + ${(y0 - valueAtPoint * point).toFixed(4)}$`
                });
            }
            
        } catch (e) {
            steps.push({
                step: 1,
                title: 'Erro no Cálculo',
                content: `Não foi possível calcular o passo a passo: ${e.message}`
            });
        }
        
        return steps;
    },

    // Função para formatação LaTeX
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
            .replace(/([a-zA-Z])(\d)/g, '$1\\cdot $2');
    },

    // Extrair termos da expressão
    extractTerms(expression) {
        try {
            const node = math.parse(expression);
            const terms = [];
            
            if (node.isOperatorNode && (node.op === '+' || node.op === '-')) {
                // Para soma/subtração, cada argumento é um termo
                node.args.forEach(arg => {
                    terms.push(arg.toString());
                });
            } else {
                // Caso contrário, a expressão inteira é um termo
                terms.push(expression);
            }
            
            return terms;
        } catch (e) {
            return [expression];
        }
    },

    // Derivar termo a termo
    deriveTermByTerm(expression) {
        const steps = [];
        try {
            const node = math.parse(expression);
            
            if (node.isOperatorNode && (node.op === '+' || node.op === '-')) {
                node.args.forEach((arg, index) => {
                    const term = arg.toString();
                    const derivative = math.derivative(arg, 'x');
                    const rule = this.getDifferentiationRule(arg);
                    
                    steps.push(`• $${this.formatLatex(term)} \\rightarrow ${this.formatLatex(derivative.toString())}$ (${rule})`);
                });
            } else {
                const derivative = math.derivative(node, 'x');
                const rule = this.getDifferentiationRule(node);
                steps.push(`• $${this.formatLatex(expression)} \\rightarrow ${this.formatLatex(derivative.toString())}$ (${rule})`);
            }
        } catch (e) {
            steps.push('Não foi possível derivar termo a termo');
        }
        
        return steps;
    },

    // Identificar regra de derivação
    getDifferentiationRule(node) {
        if (node.isConstantNode) {
            return 'Constante: $\\frac{d}{dx}[c] = 0$';
        } else if (node.isSymbolNode && node.name === 'x') {
            return 'Potência: $\\frac{d}{dx}[x] = 1$';
        } else if (node.isOperatorNode && node.op === '^') {
            const exponent = node.args[1].value || node.args[1];
            return `Potência: $\\frac{d}{dx}[x^{${exponent}}] = ${exponent}x^{${exponent-1}}$`;
        } else if (node.isFunctionNode) {
            switch(node.name) {
                case 'sin':
                    return 'Seno: $\\frac{d}{dx}[\\sin(x)] = \\cos(x)$';
                case 'cos':
                    return 'Cosseno: $\\frac{d}{dx}[\\cos(x)] = -\\sin(x)$';
                case 'tan':
                    return 'Tangente: $\\frac{d}{dx}[\\tan(x)] = \\sec^2(x)$';
                case 'exp':
                    return 'Exponencial: $\\frac{d}{dx}[e^x] = e^x$';
                case 'log':
                    return 'Logaritmo: $\\frac{d}{dx}[\\ln(x)] = \\frac{1}{x}$';
                case 'sqrt':
                    return 'Raiz: $\\frac{d}{dx}[\\sqrt{x}] = \\frac{1}{2\\sqrt{x}}$';
                default:
                    return 'Regra da cadeia';
            }
        } else if (node.isOperatorNode && node.op === '*') {
            return 'Regra do produto';
        } else if (node.isOperatorNode && node.op === '/') {
            return 'Regra do quociente';
        }
        
        return 'Regra geral de derivação';
    },

    // Interpretação da derivada
    getDerivativeInterpretation(value, point) {
        if (value > 0) {
            return `A derivada é <strong>positiva (${value.toFixed(4)})</strong>, portanto a função é <strong>crescente</strong> no ponto $x = ${point}$.`;
        } else if (value < 0) {
            return `A derivada é <strong>negativa (${value.toFixed(4)})</strong>, portanto a função é <strong>decrescente</strong> no ponto $x = ${point}$.`;
        } else {
            return `A derivada é <strong>zero</strong>, portanto este pode ser um ponto crítico (máximo, mínimo ou ponto de sela).`;
        }
    },

    // Gerar passos para integrais
    generateIntegralSteps(expression, a, b) {
        const steps = [];
        
        try {
            // 1. Mostrar integral
            steps.push({
                step: 1,
                title: 'Integral Definida',
                content: `$$\\int_{${a}}^{${b}} ${this.formatLatex(expression)} \\, dx$$`,
                latex: true
            });
            
            // 2. Encontrar primitiva
            try {
                const integral = math.integrate(math.parse(expression), 'x');
                steps.push({
                    step: 2,
                    title: 'Encontrando a Primitiva',
                    content: `$$F(x) = \\int ${this.formatLatex(expression)} \\, dx = ${this.formatLatex(integral.toString())} + C$$`,
                    latex: true
                });
                
                // 3. Aplicar teorema fundamental
                const Fa = integral.evaluate({x: a});
                const Fb = integral.evaluate({x: b});
                
                steps.push({
                    step: 3,
                    title: 'Aplicar Teorema Fundamental',
                    content: `$$\\int_{${a}}^{${b}} f(x) \\, dx = F(b) - F(a)$$<br>` +
                             `$$= F(${b}) - F(${a})$$<br>` +
                             `$$= [${this.formatLatex(integral.toString())}]_{${a}}^{${b}}$$`,
                    latex: true
                });
                
                // 4. Substituir limites
                steps.push({
                    step: 4,
                    title: 'Substituir Limites',
                    content: `$$= [${this.formatLatex(integral.toString().replace(/x/g, b.toString()))}] - [${this.formatLatex(integral.toString().replace(/x/g, a.toString()))}]$$<br>` +
                             `$$= ${Fb} - (${Fa})$$`,
                    latex: true
                });
                
                // 5. Resultado final
                steps.push({
                    step: 5,
                    title: 'Resultado Final',
                    content: `$$\\int_{${a}}^{${b}} ${this.formatLatex(expression)} \\, dx = ${(Fb - Fa).toFixed(4)}$$`,
                    latex: true
                });
                
            } catch (e) {
                // Fallback para integração numérica
                steps.push({
                    step: 2,
                    title: 'Usando Integração Numérica',
                    content: 'Não foi possível encontrar uma primitiva analítica. Usando regra de Simpson para integração numérica.'
                });
                
                const result = this.numericalIntegration(expression, a, b);
                steps.push({
                    step: 3,
                    title: 'Resultado Aproximado',
                    content: `$$\\int_{${a}}^{${b}} ${this.formatLatex(expression)} \\, dx \\approx ${result.toFixed(4)}$$`,
                    latex: true
                });
            }
            
        } catch (e) {
            steps.push({
                step: 1,
                title: 'Erro no Cálculo',
                content: `Não foi possível calcular a integral: ${e.message}`
            });
        }
        
        return steps;
    },

    // Gerar passos para limites
    generateLimitSteps(expression, point) {
        const steps = [];
        
        try {
            // 1. Mostrar limite
            steps.push({
                step: 1,
                title: 'Limite a Calcular',
                content: `$$\\lim_{x \\to ${point}} ${this.formatLatex(expression)}$$`,
                latex: true
            });
            
            // 2. Tentar substituição direta
            const f = Utils.createFunction(expression);
            try {
                const direct = f(point);
                if (isFinite(direct)) {
                    steps.push({
                        step: 2,
                        title: 'Substituição Direta',
                        content: `Substituindo $x = ${point}$:<br>` +
                                 `$$f(${point}) = ${this.formatLatex(expression.replace(/x/g, point.toString()))}$$<br>` +
                                 `$$= ${direct.toFixed(4)}$$`,
                        latex: true
                    });
                    
                    steps.push({
                        step: 3,
                        title: 'Resultado',
                        content: `$$\\lim_{x \\to ${point}} ${this.formatLatex(expression)} = ${direct.toFixed(4)}$$`,
                        latex: true
                    });
                } else {
                    throw new Error('Resultado infinito ou indefinido');
                }
            } catch (e) {
                // 3. Calcular limites laterais
                steps.push({
                    step: 2,
                    title: 'Substituição Direta Falhou',
                    content: 'A substituição direta resulta em forma indeterminada ou indefinida. Calculando limites laterais.'
                });
                
                const epsilon = 0.0001;
                const left = f(point - epsilon);
                const right = f(point + epsilon);
                
                steps.push({
                    step: 3,
                    title: 'Limites Laterais',
                    content: `Limite à esquerda: $\\lim_{x \\to ${point}^{-}} f(x) \\approx f(${point} - 0.0001) = ${left.toFixed(4)}$<br>` +
                             `Limite à direita: $\\lim_{x \\to ${point}^{+}} f(x) \\approx f(${point} + 0.0001) = ${right.toFixed(4)}$`,
                    latex: true
                });
                
                // 4. Verificar existência
                if (Math.abs(left - right) < 0.001) {
                    const limit = (left + right) / 2;
                    steps.push({
                        step: 4,
                        title: 'Limite Existe',
                        content: `Como os limites laterais são iguais:<br>` +
                                 `$$\\lim_{x \\to ${point}} ${this.formatLatex(expression)} = ${limit.toFixed(4)}$$`,
                        latex: true
                    });
                } else {
                    steps.push({
                        step: 4,
                        title: 'Limite Não Existe',
                        content: `Como os limites laterais são diferentes ($${left.toFixed(4)} \\neq ${right.toFixed(4)}$), o limite não existe.`
                    });
                }
            }
            
        } catch (e) {
            steps.push({
                step: 1,
                title: 'Erro no Cálculo',
                content: `Não foi possível calcular o limite: ${e.message}`
            });
        }
        
        return steps;
    }
};

window.Calculator = Calculator;