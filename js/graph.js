// Módulo de gráficos
const Graph = {
    currentPlot: null,
    
    // Plotar gráfico
    plotGraph(data, annotations = []) {
        const plotDiv = document.getElementById('plot');
        if (!plotDiv) return;

        const layout = this.getLayout();
        layout.annotations = annotations;

        // Atualizar ou criar novo gráfico
        if (this.currentPlot) {
            Plotly.react(plotDiv, data, layout);
        } else {
            this.currentPlot = Plotly.newPlot(plotDiv, data, layout);
        }

        // Adicionar evento de clique
        plotDiv.on('plotly_click', (data) => {
            this.handlePlotClick(data);
        });
    },

    // Obter layout do gráfico
    getLayout() {
        const isDark = document.body.classList.contains('dark');
        
        return {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: {
                color: isDark ? '#e2e8f0' : '#1e293b',
                family: 'Arial, sans-serif'
            },
            xaxis: {
                title: 'x',
                gridcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                zerolinecolor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                range: [-5, 5]
            },
            yaxis: {
                title: 'f(x)',
                gridcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                zerolinecolor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                range: [-5, 5]
            },
            margin: { t: 30, r: 30, b: 50, l: 50 },
            showlegend: AppState.showLegend,
            legend: {
                x: 1,
                y: 1,
                xanchor: 'right',
                yanchor: 'top',
                bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                bordercolor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
            },
            hovermode: 'closest'
        };
    },

    // Gerar dados da função
    generateFunctionData(expression, options = {}) {
        const f = Utils.createFunction(expression);
        const data = [];
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
                    // Quebrar a linha
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

        // Dados da função principal
        data.push({
            x: xValues,
            y: yValues,
            name: 'f(x)',
            type: 'scatter',
            mode: 'lines',
            line: {
                color: '#6366f1',
                width: 3
            },
            hovertemplate: 'x: %{x:.3f}<br>f(x): %{y:.3f}<extra></extra>'
        });

        // Adicionar dados extras baseados nas opções
        if (options.showDerivative) {
            data.push(...this.generateDerivativeData(expression));
        }

        if (options.showTangent) {
            data.push(...this.generateTangentData(expression, options.point));
        }

        if (options.showArea && options.integralBounds) {
            data.push(...this.generateAreaData(expression, options.integralBounds));
        }

        return data;
    },

    // Gerar dados da derivada
    generateDerivativeData(expression) {
        try {
            const node = math.parse(expression);
            const derivative = math.derivative(node, 'x');
            const xValues = [];
            const yValues = [];
            const step = 0.1;

            for (let x = -5; x <= 5; x += step) {
                try {
                    const y = derivative.evaluate({ x: x });
                    if (isFinite(y)) {
                        xValues.push(x);
                        yValues.push(y);
                    }
                } catch (e) {
                    // Ignorar ponto
                }
            }

            return [{
                x: xValues,
                y: yValues,
                name: "f'(x)",
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: '#10b981',
                    width: 2,
                    dash: 'dash'
                },
                hovertemplate: 'x: %{x:.3f}<br>f\'(x): %{y:.3f}<extra></extra>'
            }];
        } catch (error) {
            return [];
        }
    },

    // Gerar dados da reta tangente
    generateTangentData(expression, point) {
        try {
            const node = math.parse(expression);
            const derivative = math.derivative(node, 'x');
            const slope = derivative.evaluate({ x: point });
            const y0 = node.evaluate({ x: point });
            
            const xValues = [point - 1, point + 1];
            const yValues = xValues.map(x => slope * (x - point) + y0);

            return [{
                x: xValues,
                y: yValues,
                name: 'Reta Tangente',
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: '#f43f5e',
                    width: 2
                },
                hovertemplate: `Tangente em x = ${point.toFixed(2)}<br>Inclinação: ${slope.toFixed(3)}<extra></extra>`
            }];
        } catch (error) {
            return [];
        }
    },

    // Gerar dados da área (para integrais)
    generateAreaData(expression, bounds) {
        const [a, b] = bounds;
        const f = Utils.createFunction(expression);
        const step = 0.01;
        const xValues = [];
        const yValues = [];

        for (let x = a; x <= b; x += step) {
            try {
                const y = f(x);
                if (isFinite(y)) {
                    xValues.push(x);
                    yValues.push(y);
                }
            } catch (e) {
                // Ignorar ponto
            }
        }

        // Adicionar pontos para fechar a área
        xValues.push(b, a);
        yValues.push(0, 0);

        return [{
            x: xValues,
            y: yValues,
            name: 'Área sob a curva',
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            fillcolor: 'rgba(99, 102, 241, 0.3)',
            line: {
                color: 'rgba(99, 102, 241, 0)'
            },
            hovertemplate: 'Área entre x = %{x:.2f} e x = %{x:.2f}<extra></extra>'
        }];
    },

    // Manipulador de clique no gráfico
    handlePlotClick(data) {
        if (data.points && data.points[0]) {
            const point = data.points[0];
            Utils.showNotification(
                `Ponto: (${point.x.toFixed(3)}, ${point.y.toFixed(3)})`,
                'info'
            );
        }
    },

    // Redefinir visualização
    resetView() {
        if (this.currentPlot) {
            Plotly.relayout(this.currentPlot, {
                'xaxis.range': [-5, 5],
                'yaxis.range': [-5, 5]
            });
        }
    },

    // Alternar legenda
    toggleLegend() {
        AppState.showLegend = !AppState.showLegend;
        if (this.currentPlot) {
            Plotly.relayout(this.currentPlot, {
                showlegend: AppState.showLegend
            });
        }
    },

    // Tela cheia
    toggleFullscreen() {
        const plotDiv = document.getElementById('plot');
        if (!document.fullscreenElement) {
            if (plotDiv.requestFullscreen) {
                plotDiv.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
};

window.Graph = Graph;