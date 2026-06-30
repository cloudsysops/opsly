import React, { useState } from "react";
import {
  ChevronRight,
  Plus,
  Settings,
  Eye,
  Check,
  AlertCircle,
} from "lucide-react";
import "./AgentMarketplace.css";

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  icon: string;
  difficulty: "easy" | "medium" | "hard";
  estimated_setup_time: number; // minutes
}

interface AgentConfig {
  name: string;
  description: string;
  template_id: string;
  instructions: string;
  model: string;
  tools: string[];
  parameters: Record<string, any>;
}

const TEMPLATES: AgentTemplate[] = [
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    description: "Automated code review agent",
    category: "Development",
    capabilities: ["Code analysis", "PR review", "Test coverage"],
    icon: "🔍",
    difficulty: "easy",
    estimated_setup_time: 5,
  },
  {
    id: "api-builder",
    name: "API Builder",
    description: "Generate REST APIs from specifications",
    category: "Development",
    capabilities: ["Generate code", "Create tests", "Document API"],
    icon: "⚙️",
    difficulty: "medium",
    estimated_setup_time: 15,
  },
  {
    id: "qa-tester",
    name: "QA Tester",
    description: "Automated testing and QA",
    category: "Testing",
    capabilities: ["Test generation", "Bug finding", "Report"],
    icon: "🧪",
    difficulty: "medium",
    estimated_setup_time: 20,
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Data analysis and reporting",
    category: "Analytics",
    capabilities: ["Data processing", "Charts", "Insights"],
    icon: "📊",
    difficulty: "hard",
    estimated_setup_time: 30,
  },
  {
    id: "content-creator",
    name: "Content Creator",
    description: "Generate content and blog posts",
    category: "Content",
    capabilities: ["Writing", "SEO", "Images"],
    icon: "✍️",
    difficulty: "easy",
    estimated_setup_time: 10,
  },
  {
    id: "customer-support",
    name: "Customer Support",
    description: "Customer service chatbot",
    category: "Support",
    capabilities: ["Chat", "Ticket resolution", "Escalation"],
    icon: "💬",
    difficulty: "medium",
    estimated_setup_time: 25,
  },
];

const MODELS = ["claude-3-sonnet", "gpt-4-turbo", "llama2-7b", "mixtral-8x7b"];

const TOOLS = {
  Development: ["git", "github", "jira", "slack"],
  Testing: ["pytest", "jest", "selenium", "cypress"],
  Analytics: ["sql", "pandas", "matplotlib", "postgres"],
  Content: ["markdown", "figma", "unsplash", "grammarly"],
  Support: ["zendesk", "intercom", "slack", "email"],
};

export const AgentMarketplace: React.FC = () => {
  const [step, setStep] = useState<"browse" | "config" | "preview" | "deploy">(
    "browse"
  );
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(
    null
  );
  const [config, setConfig] = useState<AgentConfig>({
    name: "",
    description: "",
    template_id: "",
    instructions: "",
    model: "claude-3-sonnet",
    tools: [],
    parameters: {},
  });
  const [deployStatus, setDeployStatus] = useState<
    "idle" | "deploying" | "success" | "error"
  >("idle");

  // ════════════════════════════════════════════════════════════════════
  // STEP 1: Browse Templates
  // ════════════════════════════════════════════════════════════════════

  if (step === "browse") {
    return (
      <div className="agent-marketplace">
        <header className="marketplace-header">
          <h1>🤖 Agent Marketplace</h1>
          <p>Create custom agents in minutes</p>
        </header>

        <section className="templates-grid">
          {TEMPLATES.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-icon">{template.icon}</div>
              <h3>{template.name}</h3>
              <p className="template-description">{template.description}</p>

              <div className="template-meta">
                <span className={`difficulty difficulty-${template.difficulty}`}>
                  {template.difficulty}
                </span>
                <span className="setup-time">
                  ⏱️ {template.estimated_setup_time}min
                </span>
              </div>

              <div className="capabilities">
                {template.capabilities.map((cap) => (
                  <span key={cap} className="capability-tag">
                    {cap}
                  </span>
                ))}
              </div>

              <button
                className="btn-select"
                onClick={() => {
                  setSelectedTemplate(template);
                  setConfig({ ...config, template_id: template.id });
                  setStep("config");
                }}
              >
                Select <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </section>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 2: Configure Agent
  // ════════════════════════════════════════════════════════════════════

  if (step === "config" && selectedTemplate) {
    const availableTools = TOOLS[selectedTemplate.category as keyof typeof TOOLS] || [];

    return (
      <div className="agent-marketplace">
        <header className="marketplace-header">
          <h1>⚙️ Configure {selectedTemplate.name}</h1>
          <p>Customize your agent</p>
        </header>

        <div className="config-form">
          {/* Agent Name */}
          <div className="form-group">
            <label htmlFor="agent-name">Agent Name</label>
            <input
              id="agent-name"
              type="text"
              placeholder="e.g., my-code-reviewer"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="agent-description">Description</label>
            <textarea
              id="agent-description"
              placeholder="What does this agent do?"
              value={config.description}
              onChange={(e) =>
                setConfig({ ...config, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* System Instructions */}
          <div className="form-group">
            <label htmlFor="agent-instructions">System Instructions</label>
            <textarea
              id="agent-instructions"
              placeholder="How should the agent behave?"
              value={config.instructions}
              onChange={(e) =>
                setConfig({ ...config, instructions: e.target.value })
              }
              rows={4}
            />
          </div>

          {/* Model Selection */}
          <div className="form-group">
            <label htmlFor="agent-model">LLM Model</label>
            <select
              id="agent-model"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              aria-describedby="model-helper-text"
            >
              {MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <small>Different models have different speed/cost trade-offs</small>
          </div>

          {/* Tools Selection */}
          <div className="form-group">
            <label>Tools & Integrations</label>
            <div className="tools-grid">
              {availableTools.map((tool) => (
                <label key={tool} className="tool-checkbox">
                  <input
                    type="checkbox"
                    checked={config.tools.includes(tool)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setConfig({
                          ...config,
                          tools: [...config.tools, tool],
                        });
                      } else {
                        setConfig({
                          ...config,
                          tools: config.tools.filter((t) => t !== tool),
                        });
                      }
                    }}
                  />
                  {tool}
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setSelectedTemplate(null);
                setStep("browse");
              }}
            >
              Back
            </button>
            <button
              className="btn-primary"
              onClick={() => setStep("preview")}
              disabled={!config.name || !config.instructions}
            >
              <Eye size={16} /> Preview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 3: Preview & Review
  // ════════════════════════════════════════════════════════════════════

  if (step === "preview" && selectedTemplate) {
    return (
      <div className="agent-marketplace">
        <header className="marketplace-header">
          <h1>👀 Preview Agent</h1>
          <p>Review before deployment</p>
        </header>

        <div className="preview-container">
          {/* Left: Configuration Summary */}
          <div className="preview-summary">
            <h2>{selectedTemplate.icon} {config.name}</h2>
            <p className="preview-description">{config.description}</p>

            <div className="preview-section">
              <h3>System Instructions</h3>
              <p className="preview-text">{config.instructions}</p>
            </div>

            <div className="preview-section">
              <h3>Configuration</h3>
              <ul className="preview-list">
                <li>
                  <strong>Model:</strong> {config.model}
                </li>
                <li>
                  <strong>Tools:</strong> {config.tools.join(", ") || "None"}
                </li>
                <li>
                  <strong>Category:</strong> {selectedTemplate.category}
                </li>
                <li>
                  <strong>Difficulty:</strong> {selectedTemplate.difficulty}
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Validation & Checklist */}
          <div className="preview-validation">
            <h3>✅ Deployment Checklist</h3>

            <div className="validation-item">
              <Check size={16} />
              <span>Agent name configured</span>
            </div>

            <div className="validation-item">
              <Check size={16} />
              <span>System instructions provided</span>
            </div>

            <div className={`validation-item ${config.tools.length > 0 ? "" : "warning"}`}>
              {config.tools.length > 0 ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>
                {config.tools.length > 0 ? `${config.tools.length} tools configured` : "No tools selected (optional)"}
              </span>
            </div>

            <div className="validation-item">
              <Check size={16} />
              <span>Model selected: {config.model}</span>
            </div>

            <div className="preview-stats">
              <p>📊 Estimated setup: {selectedTemplate.estimated_setup_time} minutes</p>
              <p>💰 Cost: $0.10 - $0.50 / task (depending on model)</p>
            </div>

            <div className="preview-actions">
              <button
                className="btn-secondary"
                onClick={() => setStep("config")}
              >
                Edit
              </button>
              <button
                className="btn-primary"
                onClick={() => setStep("deploy")}
              >
                <Plus size={16} /> Deploy Agent
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 4: Deploy & Confirmation
  // ════════════════════════════════════════════════════════════════════

  if (step === "deploy" && selectedTemplate) {
    return (
      <div className="agent-marketplace">
        <header className="marketplace-header">
          <h1>🚀 Deploy Agent</h1>
          <p>Creating your custom agent</p>
        </header>

        <div className="deploy-container">
          <div className="deploy-status">
            {deployStatus === "idle" && (
              <>
                <h2>Ready to deploy</h2>
                <p>Your agent will be created and started immediately.</p>
                <button
                  className="btn-primary btn-large"
                  onClick={() => {
                    setDeployStatus("deploying");
                    // Simulate deployment
                    setTimeout(() => setDeployStatus("success"), 2000);
                  }}
                >
                  <Settings size={20} /> Deploy Now
                </button>
              </>
            )}

            {deployStatus === "deploying" && (
              <div className="loading">
                <div className="spinner"></div>
                <h2>Deploying agent...</h2>
                <p>Setting up infrastructure and initializing services</p>
              </div>
            )}

            {deployStatus === "success" && (
              <div className="success">
                <div className="success-icon">✅</div>
                <h2>Agent deployed successfully!</h2>
                <p>Your agent has been deployed and is initializing</p>

                <div className="success-info">
                  <h3>Next Steps</h3>
                  <ul>
                    <li>
                      🔗 Access at: <code>https://hermes.local/agents/{config.name}</code>
                    </li>
                    <li>📊 Monitor in dashboard</li>
                    <li>⚙️ Configure webhooks if needed</li>
                    <li>📚 Read documentation</li>
                  </ul>
                </div>

                <div className="success-actions">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      // Reset
                      setStep("browse");
                      setSelectedTemplate(null);
                      setDeployStatus("idle");
                    }}
                  >
                    Create Another Agent
                  </button>
                  <button className="btn-secondary">
                    View Agent Dashboard
                  </button>
                </div>
              </div>
            )}

            {deployStatus === "error" && (
              <div className="error">
                <div className="error-icon">❌</div>
                <h2>Deployment failed</h2>
                <p>Please check your configuration and try again</p>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setDeployStatus("idle");
                    setStep("config");
                  }}
                >
                  Go Back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AgentMarketplace;
