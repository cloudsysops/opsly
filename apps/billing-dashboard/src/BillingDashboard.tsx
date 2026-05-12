import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./BillingDashboard.css";

interface CostData {
  tenant_id: string;
  total_cost: number;
  breakdown_by_agent: Array<{ agent: string; cost: number }>;
  breakdown_by_service: Record<string, number>;
  api_calls: number;
  rendering_jobs: number;
  estimated_monthly: number;
}

interface OptimizationSuggestion {
  type: string;
  title: string;
  description: string;
  potential_savings: number;
}

const BillingDashboard: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [costData, setCostData] = useState<CostData | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  useEffect(() => {
    loadData();
  }, [selectedPeriod, tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const to = new Date();
      const from = new Date();

      if (selectedPeriod === "7d") from.setDate(from.getDate() - 7);
      else if (selectedPeriod === "30d") from.setDate(from.getDate() - 30);
      else if (selectedPeriod === "90d") from.setDate(from.getDate() - 90);

      // Fetch cost data
      const costResponse = await axios.get(
        `/api/billing/tenant/${tenantId}/costs`,
        {
          params: {
            from: from.toISOString(),
            to: to.toISOString(),
          },
        }
      );

      setCostData(costResponse.data);

      // Fetch optimization suggestions
      const suggestionsResponse = await axios.get(
        `/api/billing/cost-optimization/${tenantId}`
      );

      setSuggestions(suggestionsResponse.data.suggestions);
    } catch (error) {
      console.error("Error loading billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="billing-loading">Loading billing data...</div>;
  }

  if (!costData) {
    return <div className="billing-error">Failed to load billing data</div>;
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div className="billing-dashboard">
      <header className="billing-header">
        <h1>💰 Billing & Cost Dashboard</h1>
        <div className="period-selector">
          {["7d", "30d", "90d"].map((period) => (
            <button
              key={period}
              className={selectedPeriod === period ? "active" : ""}
              onClick={() => setSelectedPeriod(period)}
            >
              Last {period === "7d" ? "7 Days" : period === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </header>

      {/* Key Metrics */}
      <section className="metrics">
        <div className="metric-card">
          <div className="metric-label">Total Cost (Period)</div>
          <div className="metric-value">${costData.total_cost.toFixed(2)}</div>
          <div className="metric-subtitle">
            ~${costData.estimated_monthly.toFixed(2)}/month
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">API Calls</div>
          <div className="metric-value">{costData.api_calls.toLocaleString()}</div>
          <div className="metric-subtitle">
            ${(costData.breakdown_by_service["api"] || 0).toFixed(2)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Rendering Jobs</div>
          <div className="metric-value">{costData.rendering_jobs.toLocaleString()}</div>
          <div className="metric-subtitle">
            ${(costData.breakdown_by_service["rendering"] || 0).toFixed(2)}
          </div>
        </div>

        <div className="metric-card highlight">
          <div className="metric-label">Cost Efficiency</div>
          <div className="metric-value">
            {(
              (costData.total_cost / (costData.api_calls + costData.rendering_jobs)) *
              100
            ).toFixed(2)}
            ¢
          </div>
          <div className="metric-subtitle">per task</div>
        </div>
      </section>

      {/* Charts */}
      <section className="charts">
        <div className="chart-container">
          <h2>Cost by Agent</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costData.breakdown_by_agent}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="agent" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Bar dataKey="cost" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h2>Cost by Service</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(costData.breakdown_by_service).map(([service, cost]) => ({
                  name: service,
                  value: cost as number,
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) =>
                  `${name}: $${(value as number).toFixed(2)}`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.keys(costData.breakdown_by_service).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${(value as number).toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Cost Optimization Suggestions */}
      <section className="optimization">
        <h2>💡 Cost Optimization Suggestions</h2>
        <div className="suggestions-grid">
          {suggestions.map((suggestion, idx) => (
            <div key={idx} className="suggestion-card">
              <div className="suggestion-icon">💰</div>
              <h3>{suggestion.title}</h3>
              <p>{suggestion.description}</p>
              <div className="potential-savings">
                Potential savings: <strong>${suggestion.potential_savings.toFixed(2)}/month</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Invoice Section */}
      <section className="invoices">
        <h2>📄 Invoices</h2>
        <button className="btn-generate-invoice" onClick={() => {
          axios.post(`/api/billing/invoices/${tenantId}/generate`, {
            period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            period_end: new Date().toISOString(),
          });
        }}>
          Generate Invoice
        </button>
      </section>
    </div>
  );
};

export default BillingDashboard;
