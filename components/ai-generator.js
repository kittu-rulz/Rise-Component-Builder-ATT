import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeHTML } from '../js/utilities.js';

export const id = 'ai-generator';
export const name = 'AI Scenario Generator';
export const category = 'ai';
export const defaultConfig = {
  items: [
    { title: 'AI Branching Dialogue Prompt', content: 'Generate a customer conflict scenario for retail checkout.' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config) {
  const promptText = config.items[0]?.title || 'Create custom template blocks';
  return `
    <div class="ai-generator-preview">
      <div class="ai-badge-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="ai-spark-icon"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        <span>Rise AI Assistant Prompt</span>
      </div>
      <div class="ai-prompt-display">"${escapeHTML(promptText)}"</div>
      <button class="ai-generate-run-btn" data-is-quiz="false">Generate eLearning Layout</button>

      <div class="ai-output-area" style="display:none;">
        <div class="ai-loading-indicator">
          <div class="spinner"></div>
          <span>AI Engine analyzing layout constraints...</span>
        </div>

        <div class="ai-results-wrapper" style="display:none;">
          <div class="ai-success-marker">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <strong>AI Generation Successful!</strong>
          </div>
          <div class="ai-results-list">
          </div>
        </div>
      </div>
    </div>
  `;
}

export function generateCSS() {
  return `
    .ai-generator-preview {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      border: 1px dashed var(--accent);
      background: linear-gradient(180deg, var(--bg-card) 0%, var(--accent-tint) 100%);
    }
    .ai-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--accent);
    }
    .ai-spark-icon {
      color: var(--accent);
    }
    .ai-prompt-display {
      font-size: 13px;
      font-style: italic;
      color: var(--text-muted);
      border-left: 3px solid var(--accent);
      padding-left: 12px;
      line-height: 1.5;
    }
    .ai-generate-run-btn {
      align-self: flex-start;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: calc(var(--border-radius) - 4px);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 6px var(--accent-light);
      transition: all 0.2s;
    }
    .ai-generate-run-btn:hover {
      box-shadow: 0 6px 12px var(--accent-light);
      opacity: 0.95;
    }
    .ai-output-area {
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
    }
    .ai-loading-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .spinner {
      width: 18px;
      height: 18px;
      border: 3px solid var(--accent-light);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    .ai-success-marker {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #065F46;
      margin-bottom: 12px;
    }
    .ai-results-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .ai-result-card {
      background-color: var(--bg-body);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 12px;
      line-height: 1.4;
      animation: fadeIn 0.3s ease;
    }`;
}

export function generateJS() {
  return `
    function triggerAiGeneration(btn, isQuiz) {
      var outputArea = document.querySelector('.ai-output-area');
      var loader = document.querySelector('.ai-loading-indicator');
      var results = document.querySelector('.ai-results-wrapper');
      var list = document.querySelector('.ai-results-list');

      btn.disabled = true;
      outputArea.style.display = 'block';
      loader.style.display = 'flex';
      results.style.display = 'none';

      setTimeout(function() {
        loader.style.display = 'none';
        results.style.display = 'block';

        list.innerHTML = isQuiz ?
          '<div class="ai-result-card"><strong>[MCQ] Question 1:</strong> Which design system helps readability?<br><em>Correct Answer:</em> A curated SaaS structure (Vanilla CSS).</div>' +
          '<div class="ai-result-card"><strong>[MCQ] Question 2:</strong> What is a self-contained iframe block?<br><em>Correct Answer:</em> An iframe running srcdoc parameters directly.</div>'
         :
          '<div class="ai-result-card"><strong>Step 1: Welcome</strong> - User enters and clicks option A.</div>' +
          '<div class="ai-result-card"><strong>Step 2: Conflict</strong> - Chris flags a custom notification.</div>' +
          '<div class="ai-result-card"><strong>Step 3: Outcome</strong> - Project is successfully complete!</div>';

        btn.disabled = false;
        viewedItems.add(0);
        updateProgress();
        updateTrackerComplete();
      }, 1500);
    }

    function initComponent() {
      var aiGenerateBtn = document.querySelector('.ai-generate-run-btn');
      if (aiGenerateBtn) {
        aiGenerateBtn.addEventListener('click', function() {
          triggerAiGeneration(aiGenerateBtn, aiGenerateBtn.getAttribute('data-is-quiz') === 'true');
        });
      }
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add a prompt.'];
  return { valid: errors.length === 0, errors };
}
