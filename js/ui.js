class UI {
    static displayGuidingQuestions(questions) {
        const container = document.getElementById('guiding-questions-content');
        container.innerHTML = '';
        
        questions.forEach((item, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'border border-slate-300 dark:border-slate-600 rounded-lg mb-3 overflow-hidden';
            questionDiv.innerHTML = `
                <button class="w-full text-left p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors question-toggle" data-index="${index}">
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span class="text-blue-600 dark:text-blue-300 text-xs font-bold">Q${index + 1}</span>
                        </div>
                        <div class="text-left">
                            <div class="font-medium text-blue-700 dark:text-blue-300">${item.question}</div>
                        </div>
                    </div>
                    <i class="fas fa-chevron-down text-blue-500 transition-transform duration-300" data-icon="${index}"></i>
                </button>
                <div class="answer-content hidden p-4 border-t border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/30">
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span class="text-green-600 dark:text-green-300 text-xs font-bold">A</span>
                        </div>
                        <div class="flex-1">
                            <div class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${item.answer}</div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(questionDiv);
        });
        
        // Adicionar event listeners
        document.querySelectorAll('.question-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                const answer = document.querySelector(`[data-index="${index}"]`).nextElementSibling;
                const icon = document.querySelector(`[data-icon="${index}"]`);
                
                answer.classList.toggle('hidden');
                icon.classList.toggle('rotate-180');
            });
        });
        
        document.getElementById('guiding-questions-container').classList.remove('hidden');
    }
    
    static toggleSection(sectionId, iconId) {
        const section = document.getElementById(sectionId);
        const icon = document.getElementById(iconId);
        
        section.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
    }
}

window.UI = UI;