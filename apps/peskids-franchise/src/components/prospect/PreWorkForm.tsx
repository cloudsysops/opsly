"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/shared/Button";
import { Input, Textarea } from "@/components/shared/Input";
import { FileUpload, FileDisplay } from "@/components/shared/FileUpload";
import { DynamicFormRenderer } from "@/components/shared/form-renderer";
import { FormSchema, FormSubmissionData } from "@/lib/types/form-schema";

interface PreWorkFormProps {
  moduleId: string;
  moduleSlug: string;
  submissionType: string;
  formSchema: Record<string, unknown> | null;
  existingContent: Record<string, unknown> | null;
  isReadOnly: boolean;
  status: string | null;
}

export function PreWorkForm({
  moduleId,
  moduleSlug,
  submissionType,
  formSchema,
  existingContent,
  isReadOnly,
  status,
}: PreWorkFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dynamicValuesRef = useRef<FormSubmissionData>({});

  // Check if we have a valid dynamic form schema
  const parsedSchema = formSchema as unknown as FormSchema | null;
  const hasDynamicSchema = parsedSchema &&
    typeof parsedSchema === 'object' &&
    'fields' in parsedSchema &&
    Array.isArray(parsedSchema.fields) &&
    parsedSchema.fields.length > 0;

  async function handleSave(e: React.FormEvent<HTMLFormElement>, submit = false) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (submit) {
      setIsSubmitting(true);
    } else {
      setIsSaving(true);
    }

    let content: Record<string, unknown> = {};

    // If using dynamic form, use the ref values
    if (hasDynamicSchema) {
      content = { ...dynamicValuesRef.current };
    } else {
      // Traditional form handling
      const formData = new FormData(e.currentTarget);
      formData.forEach((value, key) => {
        if (key !== "moduleId") {
          // Parse JSON values (like file data or outreach entries)
          if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
            try {
              content[key] = JSON.parse(value);
            } catch {
              content[key] = value;
            }
          } else {
            content[key] = value;
          }
        }
      });
    }

    try {
      const response = await fetch("/api/pre-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          content,
          submit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save");
      }

      setSuccess(submit ? "Submission complete!" : "Progress saved!");

      if (submit) {
        // Refresh the page to show updated status
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  }

  // Render form based on module type
  const renderFormFields = () => {
    // Use dynamic form renderer if schema is available
    if (hasDynamicSchema && parsedSchema) {
      return (
        <DynamicFormRenderer
          schema={parsedSchema}
          initialValues={(existingContent as FormSubmissionData) || {}}
          onChange={(values) => {
            dynamicValuesRef.current = values;
          }}
          disabled={isReadOnly}
          showSubmitButton={false}
        />
      );
    }

    // Fall back to hardcoded forms
    switch (moduleSlug) {
      case "territory":
        return <TerritoryForm existingContent={existingContent} isReadOnly={isReadOnly} />;
      case "research":
        return <ResearchForm existingContent={existingContent} isReadOnly={isReadOnly} />;
      case "outreach":
        return <OutreachForm existingContent={existingContent} isReadOnly={isReadOnly} />;
      case "reflection":
        return <ReflectionForm existingContent={existingContent} isReadOnly={isReadOnly} />;
      case "plan":
        return <PlanForm existingContent={existingContent} isReadOnly={isReadOnly} />;
      default:
        return <GenericForm existingContent={existingContent} isReadOnly={isReadOnly} submissionType={submissionType} />;
    }
  };

  return (
    <form onSubmit={(e) => handleSave(e, false)}>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <input type="hidden" name="moduleId" value={moduleId} />

      {renderFormFields()}

      {!isReadOnly && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button type="submit" variant="outline" isLoading={isSaving} className="w-full sm:w-auto order-2 sm:order-1">
            Save Progress
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              const form = e.currentTarget.closest("form");
              if (form) {
                handleSave(
                  { preventDefault: () => {}, currentTarget: form } as React.FormEvent<HTMLFormElement>,
                  true
                );
              }
            }}
            isLoading={isSubmitting}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            Submit for Review
          </Button>
        </div>
      )}

      {isReadOnly && status !== "NEEDS_REVISION" && (
        <p className="mt-6 text-sm text-gray-500">
          This submission cannot be edited.
        </p>
      )}
    </form>
  );
}

// ============================================
// TERRITORY BUILDER FORM (Module 1)
// ============================================
function TerritoryForm({
  existingContent,
  isReadOnly,
}: {
  existingContent: Record<string, unknown> | null;
  isReadOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <Input
        id="territory_metro"
        name="territory_metro"
        label="Primary Metro Area"
        placeholder="e.g., Westside, TN"
        defaultValue={(existingContent?.territory_metro as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="primary_zip_codes"
        name="primary_zip_codes"
        label="Top 3-5 Zip Codes (with justification)"
        placeholder="List each zip code and explain why you chose it:&#10;&#10;37215 - Green Hills area, high income families, 12+ preschools within 3 miles&#10;37205 - Belle Meade, affluent neighborhood, strong private school presence&#10;..."
        className="min-h-[150px]"
        defaultValue={(existingContent?.primary_zip_codes as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="drive_time_analysis"
        name="drive_time_analysis"
        label="Drive Time Analysis"
        placeholder="What's your max commute time? How will you efficiently cover your territory? Consider traffic patterns, school schedules, etc."
        className="min-h-[100px]"
        defaultValue={(existingContent?.drive_time_analysis as string) || ""}
        disabled={isReadOnly}
        required
      />

      <div className="p-4 bg-brand-light rounded-lg">
        <p className="text-sm text-brand-navy font-medium mb-2">Format Requirement:</p>
        <p className="text-xs text-gray-600">List schools in this exact format:</p>
        <pre className="text-xs bg-white p-2 rounded mt-2 overflow-x-auto">
{`PRESCHOOLS/DAYCARES:
1. [School Name] | [Address] | [Est. Enrollment]

ELEMENTARY SCHOOLS:
1. [School Name] | [Address] | [Est. Enrollment]

PRIVATE/CHARTER:
1. [School Name] | [Address] | [Est. Enrollment]`}
        </pre>
      </div>

      <Textarea
        id="school_identification"
        name="school_identification"
        label="School Identification (15+ schools by name)"
        placeholder="PRESCHOOLS/DAYCARES:&#10;1. Bright Horizons Green Hills | 123 Main St, Westside | ~80 students&#10;2. ...&#10;&#10;ELEMENTARY SCHOOLS:&#10;1. Julia Green Elementary | 3500 Hobbs Rd, Westside | ~450 students&#10;...&#10;&#10;PRIVATE/CHARTER:&#10;1. ..."
        className="min-h-[300px] font-mono text-sm"
        defaultValue={(existingContent?.school_identification as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="personal_connection"
        name="personal_connection"
        label="Personal Connection to This Territory"
        placeholder="Why YOU for THIS territory? Do you live here? Have kids in local schools? Network connections? Community involvement?"
        className="min-h-[120px]"
        defaultValue={(existingContent?.personal_connection as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="research_methodology"
        name="research_methodology"
        label="Research Methodology"
        placeholder="How did you find these schools? What tools did you use? (Google Maps, state databases, GreatSchools.org, etc.) How much time did you spend on this research?"
        className="min-h-[100px]"
        defaultValue={(existingContent?.research_methodology as string) || ""}
        disabled={isReadOnly}
        required
      />
    </div>
  );
}

// ============================================
// MARKET RESEARCH FORM (Module 2)
// ============================================
function ResearchForm({
  existingContent,
  isReadOnly,
}: {
  existingContent: Record<string, unknown> | null;
  isReadOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-brand-light rounded-lg">
        <p className="text-sm text-brand-navy font-medium mb-2">Top 10 Schools Format:</p>
        <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
{`School Name | Type | Est. Students | Contact Name & Title (if found)`}
        </pre>
      </div>

      <Textarea
        id="top_10_schools_detailed"
        name="top_10_schools_detailed"
        label="Top 10 Target Schools (Detailed)"
        placeholder="1. Bright Horizons Green Hills | Preschool | 80 | Sarah Johnson, Director&#10;2. Julia Green Elementary | Public Elementary | 450 | Michael Chen, Principal&#10;3. ..."
        className="min-h-[200px] font-mono text-sm"
        defaultValue={(existingContent?.top_10_schools_detailed as string) || ""}
        disabled={isReadOnly}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="median_income"
          name="median_income"
          label="Median Household Income"
          placeholder="$85,000 (source: Census.gov)"
          defaultValue={(existingContent?.median_income as string) || ""}
          disabled={isReadOnly}
          required
        />
        <Input
          id="families_with_children_pct"
          name="families_with_children_pct"
          label="% Families with Children Under 12"
          placeholder="28% (source: Census.gov)"
          defaultValue={(existingContent?.families_with_children_pct as string) || ""}
          disabled={isReadOnly}
          required
        />
      </div>

      <Textarea
        id="direct_chess_competitors"
        name="direct_chess_competitors"
        label="Direct Chess Competitors"
        placeholder="List any chess programs, clubs, or instruction in your area. Include names, locations, and what you know about them."
        className="min-h-[100px]"
        defaultValue={(existingContent?.direct_chess_competitors as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="enrichment_competitors"
        name="enrichment_competitors"
        label="Enrichment Competitors (STEM, coding, music, etc.)"
        placeholder="What other enrichment programs exist? This shows demand for after-school programs exists."
        className="min-h-[100px]"
        defaultValue={(existingContent?.enrichment_competitors as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="competitor_pricing"
        name="competitor_pricing"
        label="Competitor Pricing Research"
        placeholder="What do competitors charge? How did you find this information? (websites, phone calls, etc.)"
        className="min-h-[80px]"
        defaultValue={(existingContent?.competitor_pricing as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="demand_evidence"
        name="demand_evidence"
        label="Evidence of Demand for Chess Enrichment"
        placeholder="Show proof that parents WANT chess enrichment:&#10;- Facebook groups discussing chess&#10;- Reviews mentioning desire for chess programs&#10;- School newsletters advertising similar programs&#10;- Any other evidence you found"
        className="min-h-[120px]"
        defaultValue={(existingContent?.demand_evidence as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="honest_challenges"
        name="honest_challenges"
        label="Honest Challenges"
        placeholder="What concerns you about this market? Be honest—we appreciate realism over optimism."
        className="min-h-[100px]"
        defaultValue={(existingContent?.honest_challenges as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="opportunity_summary"
        name="opportunity_summary"
        label="Opportunity Summary"
        placeholder="Why is this market ripe for Acme Franchise despite those challenges? What makes it worth pursuing?"
        className="min-h-[100px]"
        defaultValue={(existingContent?.opportunity_summary as string) || ""}
        disabled={isReadOnly}
        required
      />
    </div>
  );
}

// ============================================
// OUTREACH TRACKER FORM (Module 3 - CRITICAL)
// ============================================

interface OutreachEntry {
  school_name: string;
  contact_name: string;
  contact_title: string;
  phone: string;
  email: string;
  date: string;
  method: "call" | "visit" | "email" | "linkedin";
  outcome: "conversation" | "voicemail" | "no_answer" | "email_sent";
  notes: string;
  follow_up_date: string;
}

function OutreachForm({
  existingContent,
  isReadOnly,
}: {
  existingContent: Record<string, unknown> | null;
  isReadOnly: boolean;
}) {
  const initialEntries: OutreachEntry[] = existingContent?.outreach_entries
    ? (existingContent.outreach_entries as OutreachEntry[])
    : [createEmptyEntry()];

  const [entries, setEntries] = useState<OutreachEntry[]>(initialEntries);

  function createEmptyEntry(): OutreachEntry {
    return {
      school_name: "",
      contact_name: "",
      contact_title: "",
      phone: "",
      email: "",
      date: new Date().toISOString().split("T")[0],
      method: "call",
      outcome: "no_answer",
      notes: "",
      follow_up_date: "",
    };
  }

  function addEntry() {
    setEntries([...entries, createEmptyEntry()]);
  }

  function removeEntry(index: number) {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  }

  function updateEntry(index: number, field: keyof OutreachEntry, value: string) {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  }

  // Calculate stats
  const totalContacts = entries.filter((e) => e.school_name.trim()).length;
  const liveConversations = entries.filter((e) => e.outcome === "conversation").length;
  const decisionMakers = entries.filter(
    (e) =>
      e.outcome === "conversation" &&
      (e.contact_title.toLowerCase().includes("director") ||
        e.contact_title.toLowerCase().includes("principal") ||
        e.contact_title.toLowerCase().includes("owner") ||
        e.contact_title.toLowerCase().includes("head"))
  ).length;

  return (
    <div className="space-y-6">
      {/* Requirements Card */}
      <div className="p-4 bg-brand-light rounded-lg">
        <p className="text-sm text-brand-navy font-bold mb-2">Requirements (Non-Negotiable):</p>
        <ul className="text-sm text-gray-700 space-y-1">
          <li className={`flex items-center gap-2 ${totalContacts >= 10 ? "text-green-600" : ""}`}>
            {totalContacts >= 10 ? "✓" : "○"} Contact at least 10 schools
            <span className="font-mono text-xs bg-white px-2 py-0.5 rounded">{totalContacts}/10</span>
          </li>
          <li className={`flex items-center gap-2 ${liveConversations >= 5 ? "text-green-600" : ""}`}>
            {liveConversations >= 5 ? "✓" : "○"} Have at least 5 live conversations
            <span className="font-mono text-xs bg-white px-2 py-0.5 rounded">{liveConversations}/5</span>
          </li>
          <li className={`flex items-center gap-2 ${decisionMakers >= 2 ? "text-green-600" : ""}`}>
            {decisionMakers >= 2 ? "✓" : "○"} Reach at least 2 decision-makers
            <span className="font-mono text-xs bg-white px-2 py-0.5 rounded">{decisionMakers}/2</span>
          </li>
        </ul>
      </div>

      {/* Outreach Entries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Outreach Log</h4>
          {!isReadOnly && (
            <Button type="button" variant="outline" size="sm" onClick={addEntry}>
              + Add Entry
            </Button>
          )}
        </div>

        {entries.map((entry, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Contact #{index + 1}</span>
              {!isReadOnly && entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(index)}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id={`school_name_${index}`}
                label="School Name"
                value={entry.school_name}
                onChange={(e) => updateEntry(index, "school_name", e.target.value)}
                disabled={isReadOnly}
                required
              />
              <Input
                id={`contact_name_${index}`}
                label="Contact Name"
                placeholder="(if reached)"
                value={entry.contact_name}
                onChange={(e) => updateEntry(index, "contact_name", e.target.value)}
                disabled={isReadOnly}
              />
              <Input
                id={`contact_title_${index}`}
                label="Contact Title"
                placeholder="e.g., Director, Principal, Front Desk"
                value={entry.contact_title}
                onChange={(e) => updateEntry(index, "contact_title", e.target.value)}
                disabled={isReadOnly}
              />
              <Input
                id={`date_${index}`}
                label="Date"
                type="date"
                value={entry.date}
                onChange={(e) => updateEntry(index, "date", e.target.value)}
                disabled={isReadOnly}
                required
              />
              <Input
                id={`phone_${index}`}
                label="Phone"
                type="tel"
                value={entry.phone}
                onChange={(e) => updateEntry(index, "phone", e.target.value)}
                disabled={isReadOnly}
              />
              <Input
                id={`email_${index}`}
                label="Email"
                type="email"
                value={entry.email}
                onChange={(e) => updateEntry(index, "email", e.target.value)}
                disabled={isReadOnly}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={entry.method}
                  onChange={(e) => updateEntry(index, "method", e.target.value)}
                  disabled={isReadOnly}
                >
                  <option value="call">Phone Call</option>
                  <option value="visit">In-Person Visit</option>
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={entry.outcome}
                  onChange={(e) => updateEntry(index, "outcome", e.target.value)}
                  disabled={isReadOnly}
                >
                  <option value="conversation">Live Conversation</option>
                  <option value="voicemail">Left Voicemail</option>
                  <option value="no_answer">No Answer</option>
                  <option value="email_sent">Email Sent</option>
                </select>
              </div>
            </div>

            <Textarea
              id={`notes_${index}`}
              label="Notes"
              placeholder="What did you discuss? What was their response? Any interest?"
              className="min-h-[80px]"
              value={entry.notes}
              onChange={(e) => updateEntry(index, "notes", e.target.value)}
              disabled={isReadOnly}
            />

            <Input
              id={`follow_up_${index}`}
              label="Follow-up Date"
              type="date"
              value={entry.follow_up_date}
              onChange={(e) => updateEntry(index, "follow_up_date", e.target.value)}
              disabled={isReadOnly}
            />
          </div>
        ))}
      </div>

      {/* Hidden field to store JSON data */}
      <input type="hidden" name="outreach_entries" value={JSON.stringify(entries)} />

      {/* Analysis Questions */}
      <div className="border-t pt-6 space-y-6">
        <h4 className="text-sm font-medium text-gray-700">Outreach Analysis</h4>

        <Textarea
          id="call_times_analysis"
          name="call_times_analysis"
          label="Best Call Times Analysis"
          placeholder="What times worked best? When do decision-makers answer? What patterns did you notice?"
          className="min-h-[80px]"
          defaultValue={(existingContent?.call_times_analysis as string) || ""}
          disabled={isReadOnly}
          required
        />

        <Textarea
          id="gatekeeper_tactics"
          name="gatekeeper_tactics"
          label="Gatekeeper Tactics"
          placeholder="How did you get past the front desk? What worked? What didn't?"
          className="min-h-[80px]"
          defaultValue={(existingContent?.gatekeeper_tactics as string) || ""}
          disabled={isReadOnly}
          required
        />

        <Textarea
          id="decision_maker_access"
          name="decision_maker_access"
          label="Decision-Maker Access"
          placeholder="What titles did you actually reach? (Director, Principal, Owner, etc.) How did you reach them?"
          className="min-h-[80px]"
          defaultValue={(existingContent?.decision_maker_access as string) || ""}
          disabled={isReadOnly}
          required
        />

        <Input
          id="meetings_scheduled"
          name="meetings_scheduled"
          type="number"
          label="Meetings/Demos Scheduled"
          placeholder="0"
          defaultValue={(existingContent?.meetings_scheduled as string) || ""}
          disabled={isReadOnly}
          required
        />

        <Textarea
          id="most_persistent_attempt"
          name="most_persistent_attempt"
          label="Most Persistent Outreach Attempt"
          placeholder="Describe your most persistent effort - multiple follow-ups to the same school. What happened?"
          className="min-h-[100px]"
          defaultValue={(existingContent?.most_persistent_attempt as string) || ""}
          disabled={isReadOnly}
          required
        />

        <Textarea
          id="creative_approaches"
          name="creative_approaches"
          label="Creative Approaches"
          placeholder="Did you try walk-ins? Attend events? Use LinkedIn? Any creative tactics beyond cold calls?"
          className="min-h-[80px]"
          defaultValue={(existingContent?.creative_approaches as string) || ""}
          disabled={isReadOnly}
          required
        />
      </div>

      {/* Call Script Section */}
      <div className="border-t pt-6 space-y-6">
        <h4 className="text-sm font-medium text-gray-700">Your Call Script (REQUIRED)</h4>

        <Textarea
          id="call_script"
          name="call_script"
          label="Your Actual Script"
          placeholder="Paste your call script here. How do you introduce yourself and Acme Franchise?"
          className="min-h-[150px] font-mono text-sm"
          defaultValue={(existingContent?.call_script as string) || ""}
          disabled={isReadOnly}
          required
        />

        <Textarea
          id="script_evolution"
          name="script_evolution"
          label="Script Evolution"
          placeholder="How did your script change after real calls? What did you learn and adjust?"
          className="min-h-[100px]"
          defaultValue={(existingContent?.script_evolution as string) || ""}
          disabled={isReadOnly}
          required
        />
      </div>
    </div>
  );
}

// ============================================
// REFLECTION & VIDEO FORM (Module 4)
// ============================================
function ReflectionForm({
  existingContent,
  isReadOnly,
}: {
  existingContent: Record<string, unknown> | null;
  isReadOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <Textarea
        id="top_3_objections"
        name="top_3_objections"
        label="Top 3 Objections (Exact Quotes if Possible)"
        placeholder={"1. \"We already have a chess club with a parent volunteer\"\n2. \"Our budget for enrichment is frozen this year\"\n3. \"We don't have room in our schedule\""}
        className="min-h-[120px]"
        defaultValue={(existingContent?.top_3_objections as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="objection_responses"
        name="objection_responses"
        label="Your Objection Responses"
        placeholder="For each objection above, how would you respond now? What would you say?"
        className="min-h-[150px]"
        defaultValue={(existingContent?.objection_responses as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="best_conversation"
        name="best_conversation"
        label="Best Conversation (Detailed)"
        placeholder="Describe your best conversation in detail. Who was it with? What did you say that resonated? How did they respond? Why was it effective?"
        className="min-h-[150px]"
        defaultValue={(existingContent?.best_conversation as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="worst_conversation"
        name="worst_conversation"
        label="Worst Conversation"
        placeholder="What went poorly? What would you do differently next time?"
        className="min-h-[120px]"
        defaultValue={(existingContent?.worst_conversation as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="hardest_part"
        name="hardest_part"
        label="Hardest Part of This Process"
        placeholder="What was genuinely difficult about this process? Be honest."
        className="min-h-[100px]"
        defaultValue={(existingContent?.hardest_part as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="skill_gaps"
        name="skill_gaps"
        label="Skill Gaps You've Identified"
        placeholder="What skills do you need to develop to succeed as a franchisee?"
        className="min-h-[100px]"
        defaultValue={(existingContent?.skill_gaps as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="coaching_needs"
        name="coaching_needs"
        label="Coaching Needs"
        placeholder="What support would help you succeed? What kind of coaching or training do you need?"
        className="min-h-[100px]"
        defaultValue={(existingContent?.coaching_needs as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="would_you_do_again"
        name="would_you_do_again"
        label="Would You Do This Work Every Day?"
        placeholder="Knowing what you know now about the outreach process, would you do this work every day? Be honest."
        className="min-h-[100px]"
        defaultValue={(existingContent?.would_you_do_again as string) || ""}
        disabled={isReadOnly}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Self-Rating (1-10) <span className="text-red-500">*</span>
          </label>
          <select
            name="outreach_self_rating"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            defaultValue={(existingContent?.outreach_self_rating as string) || ""}
            disabled={isReadOnly}
            required
          >
            <option value="">Select a rating...</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n} {n <= 3 ? "(Struggled)" : n <= 6 ? "(Average)" : n <= 8 ? "(Good)" : "(Excellent)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Textarea
        id="self_rating_justification"
        name="self_rating_justification"
        label="Self-Rating Justification"
        placeholder="Why did you give yourself that rating? What would it take to rate higher?"
        className="min-h-[100px]"
        defaultValue={(existingContent?.self_rating_justification as string) || ""}
        disabled={isReadOnly}
        required
      />

      {/* Video Section */}
      <div className="border-t pt-6">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <p className="text-sm text-yellow-800 font-bold">VIDEO REQUIRED (Not Optional)</p>
          <p className="text-sm text-yellow-700 mt-1">
            Record a 2-5 minute Loom video covering:
          </p>
          <ol className="text-sm text-yellow-700 mt-2 list-decimal list-inside space-y-1">
            <li>Introduce yourself (30 sec)</li>
            <li>Your best conversation - recreate it (1 min)</li>
            <li>A difficult moment and what you learned (1 min)</li>
            <li>Why Acme Franchise specifically (1 min)</li>
            <li>Your commitment level and availability (30 sec)</li>
          </ol>
        </div>

        <Input
          id="loom_video_url"
          name="loom_video_url"
          label="Loom Video URL"
          placeholder="https://www.loom.com/share/..."
          defaultValue={(existingContent?.loom_video_url as string) || ""}
          disabled={isReadOnly}
          required
        />
      </div>
    </div>
  );
}

// ============================================
// 90-DAY LAUNCH PLAN FORM (Module 5)
// ============================================
function PlanForm({
  existingContent,
  isReadOnly,
}: {
  existingContent: Record<string, unknown> | null;
  isReadOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Week 1 Section */}
      <div className="p-4 bg-brand-light rounded-lg">
        <h4 className="text-sm font-bold text-brand-navy mb-2">Week 1 (Day-by-Day)</h4>
        <p className="text-xs text-gray-600">Plan your first week as if you&apos;re starting Monday.</p>
      </div>

      <Textarea
        id="week1_specific_schools"
        name="week1_specific_schools"
        label="Week 1: Which 5 Specific Schools Will You Visit? (Names)"
        placeholder="1. Bright Horizons Green Hills&#10;2. Julia Green Elementary&#10;3. Montessori Academy of Westside&#10;4. St. Henry School&#10;5. Oak Hill School"
        className="min-h-[100px]"
        defaultValue={(existingContent?.week1_specific_schools as string) || ""}
        disabled={isReadOnly}
        required
      />

      <Textarea
        id="week1_daily_breakdown"
        name="week1_daily_breakdown"
        label="Week 1: Day-by-Day Breakdown"
        placeholder="Monday: Research and prep, finalize call list, practice script&#10;Tuesday: Make 15 cold calls in morning, visit 2 schools in afternoon&#10;Wednesday: ..."
        className="min-h-[150px]"
        defaultValue={(existingContent?.week1_daily_breakdown as string) || ""}
        disabled={isReadOnly}
        required
      />

      {/* Day 30 Targets */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-bold text-gray-700 mb-4">Day 30 Targets</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            id="day30_schools_contacted"
            name="day30_schools_contacted"
            type="number"
            label="Schools Contacted"
            placeholder="e.g., 50"
            defaultValue={(existingContent?.day30_schools_contacted as string) || ""}
            disabled={isReadOnly}
            required
          />
          <Input
            id="day30_demos_scheduled"
            name="day30_demos_scheduled"
            type="number"
            label="Demos/Meetings Scheduled"
            placeholder="e.g., 8"
            defaultValue={(existingContent?.day30_demos_scheduled as string) || ""}
            disabled={isReadOnly}
            required
          />
          <Input
            id="day30_revenue_target"
            name="day30_revenue_target"
            label="Revenue Target"
            placeholder="e.g., $2,000"
            defaultValue={(existingContent?.day30_revenue_target as string) || ""}
            disabled={isReadOnly}
            required
          />
        </div>
      </div>

      {/* Day 60 Targets */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-bold text-gray-700 mb-4">Day 60 Targets</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="day60_active_schools"
            name="day60_active_schools"
            type="number"
            label="Active Schools"
            placeholder="e.g., 3"
            defaultValue={(existingContent?.day60_active_schools as string) || ""}
            disabled={isReadOnly}
            required
          />
          <Input
            id="day60_weekly_classes"
            name="day60_weekly_classes"
            type="number"
            label="Weekly Classes Running"
            placeholder="e.g., 6"
            defaultValue={(existingContent?.day60_weekly_classes as string) || ""}
            disabled={isReadOnly}
            required
          />
        </div>
        <Textarea
          id="day60_challenges"
          name="day60_challenges"
          label="Day 60 Anticipated Challenges"
          placeholder="What challenges do you anticipate at this stage? How will you handle them?"
          className="min-h-[80px] mt-4"
          defaultValue={(existingContent?.day60_challenges as string) || ""}
          disabled={isReadOnly}
          required
        />
      </div>

      {/* Day 90 Targets */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-bold text-gray-700 mb-4">Day 90 Targets</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            id="day90_monthly_revenue"
            name="day90_monthly_revenue"
            label="Monthly Revenue Target"
            placeholder="e.g., $5,000"
            defaultValue={(existingContent?.day90_monthly_revenue as string) || ""}
            disabled={isReadOnly}
            required
          />
          <Input
            id="day90_school_count"
            name="day90_school_count"
            type="number"
            label="Active Schools"
            placeholder="e.g., 5"
            defaultValue={(existingContent?.day90_school_count as string) || ""}
            disabled={isReadOnly}
            required
          />
          <Input
            id="day90_tutor_needs"
            name="day90_tutor_needs"
            label="Tutor Needs"
            placeholder="e.g., 2 part-time"
            defaultValue={(existingContent?.day90_tutor_needs as string) || ""}
            disabled={isReadOnly}
            required
          />
        </div>
      </div>

      {/* Community Presence */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-bold text-gray-700 mb-4">Community Presence</h4>

        <Textarea
          id="community_events"
          name="community_events"
          label="3 Specific Events You'll Attend/Host"
          placeholder="1. Green Hills PTA Meeting - March 15th&#10;2. Westside Kids Expo at Music City Center - April 8-9&#10;3. Host free chess demo at local library - TBD"
          className="min-h-[100px]"
          defaultValue={(existingContent?.community_events as string) || ""}
          disabled={isReadOnly}
          required
        />

        <Textarea
          id="local_partnerships"
          name="local_partnerships"
          label="Local Partnerships"
          placeholder="Name specific businesses or organizations you'll partner with. Why them?"
          className="min-h-[80px] mt-4"
          defaultValue={(existingContent?.local_partnerships as string) || ""}
          disabled={isReadOnly}
          required
        />

        <Textarea
          id="marketing_budget"
          name="marketing_budget"
          label="Marketing Budget"
          placeholder="How much will you spend on marketing in the first 90 days? How will you allocate it?"
          className="min-h-[80px] mt-4"
          defaultValue={(existingContent?.marketing_budget as string) || ""}
          disabled={isReadOnly}
          required
        />
      </div>

      {/* Risk Assessment */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-bold text-gray-700 mb-4">Risk Assessment</h4>

        <Textarea
          id="biggest_risk"
          name="biggest_risk"
          label="Biggest Risk to Your Plan"
          placeholder="What's the biggest risk? What could derail your plan?"
          className="min-h-[80px]"
          defaultValue={(existingContent?.biggest_risk as string) || ""}
          disabled={isReadOnly}
          required
        />

        <Textarea
          id="backup_plan"
          name="backup_plan"
          label="Plan B"
          placeholder="If your primary strategy fails, what's your backup plan?"
          className="min-h-[80px] mt-4"
          defaultValue={(existingContent?.backup_plan as string) || ""}
          disabled={isReadOnly}
          required
        />
      </div>

      {/* Time & Financial Commitment */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-bold text-gray-700 mb-4">Time & Financial Commitment</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="hours_per_week"
            name="hours_per_week"
            type="number"
            label="Hours Per Week You'll Dedicate"
            placeholder="e.g., 30"
            defaultValue={(existingContent?.hours_per_week as string) || ""}
            disabled={isReadOnly}
            required
          />
          <Input
            id="full_time_timeline"
            name="full_time_timeline"
            label="When Do You Plan to Go Full-Time?"
            placeholder="e.g., After hitting $8k/month revenue"
            defaultValue={(existingContent?.full_time_timeline as string) || ""}
            disabled={isReadOnly}
            required
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// GENERIC FORM (fallback)
// ============================================
function GenericForm({
  existingContent,
  isReadOnly,
  submissionType,
}: {
  existingContent: Record<string, unknown> | null;
  isReadOnly: boolean;
  submissionType: string;
}) {
  // Parse existing file data if it exists
  const existingFile = existingContent?.file
    ? (typeof existingContent.file === "string"
        ? JSON.parse(existingContent.file)
        : existingContent.file)
    : null;

  return (
    <div className="space-y-6">
      {submissionType === "TEXT" && (
        <Textarea
          id="content"
          name="content"
          label="Your Response"
          className="min-h-[300px]"
          defaultValue={(existingContent?.content as string) || ""}
          disabled={isReadOnly}
          required
        />
      )}
      {submissionType === "FILE_UPLOAD" && (
        <>
          {isReadOnly && existingFile ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Uploaded File
              </label>
              <FileDisplay file={existingFile} />
            </div>
          ) : (
            <FileUpload
              name="file"
              label="Upload File"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
              maxSizeMB={5}
              existingFile={existingFile}
              disabled={isReadOnly}
              required
            />
          )}
          <Textarea
            id="file_notes"
            name="file_notes"
            label="Notes (optional)"
            placeholder="Add any notes about your uploaded file..."
            defaultValue={(existingContent?.file_notes as string) || ""}
            disabled={isReadOnly}
          />
        </>
      )}
      {submissionType === "VIDEO_LOOM" && (
        <Input
          id="video_url"
          name="video_url"
          label="Loom Video URL"
          placeholder="https://www.loom.com/share/..."
          defaultValue={(existingContent?.video_url as string) || ""}
          disabled={isReadOnly}
          required
        />
      )}
    </div>
  );
}
