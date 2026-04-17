/**
 * US Payroll Agent - Orchestrator (Ring 4 Agentic Loop)
 *
 * Implements the Claude API tool-use agentic pattern:
 *   1. Send user message + tools to Claude
 *   2. While Claude responds with tool_use, execute tools and loop
 *   3. Return final text response + full conversation history
 */

const Anthropic = require("@anthropic-ai/sdk");
const { tools } = require("./tools");
const { executeTool } = require("./runner");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const MODEL = "claude-sonnet-4-20250514";
const MAX_ITERATIONS = 10;

const SYSTEM_PROMPT = `You are Zimyo's US Payroll Agent. You help process payroll, manage employees, check compliance, and handle tax calculations for companies operating in California, New York, Texas, New Jersey, Washington, and Illinois. Always verify compliance before processing payroll. Show detailed breakdowns when calculating pay.

Key guidelines:
- When adding employees, validate all required fields and check state-specific rules.
- When running payroll, always check compliance first for the relevant states.
- Provide clear, formatted breakdowns of pay calculations showing gross, taxes, deductions, and net.
- For tax reports, explain what each figure represents.
- When processing direct deposits, confirm the pay run exists and report any employees missing bank info.
- Always mask SSNs in output (show only last 4 digits).
- If an operation fails, explain the error clearly and suggest how to fix it.`;

// ---------------------------------------------------------------------------
// Main agentic loop
// ---------------------------------------------------------------------------

/**
 * Run the payroll agent with a natural language message.
 *
 * @param {string} userMessage - The user's request in natural language
 * @returns {Promise<{ response: string, conversationHistory: object[] }>}
 */
async function runPayrollAgent(userMessage) {
  if (!userMessage || typeof userMessage !== "string") {
    throw new Error("userMessage must be a non-empty string");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is not set. " +
        "Set it before running the agent: export ANTHROPIC_API_KEY=sk-ant-..."
    );
  }

  const client = new Anthropic({ apiKey });

  // Build initial conversation
  const messages = [
    {
      role: "user",
      content: userMessage,
    },
  ];

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Call Claude with tools
    let response;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });
    } catch (apiError) {
      throw new Error(
        `Claude API error: ${apiError.message || String(apiError)}`
      );
    }

    // Append the assistant's response to conversation history
    messages.push({
      role: "assistant",
      content: response.content,
    });

    // If Claude is done (end_turn or no more tool calls), extract final text
    if (response.stop_reason === "end_turn" || response.stop_reason !== "tool_use") {
      const textBlocks = response.content.filter((b) => b.type === "text");
      const finalText = textBlocks.map((b) => b.text).join("\n");

      return {
        response: finalText,
        conversationHistory: messages,
      };
    }

    // Process tool calls -- handle parallel tool_use blocks
    const toolUseBlocks = response.content.filter(
      (block) => block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      // Safety: stop_reason was tool_use but no tool_use blocks found
      const textBlocks = response.content.filter((b) => b.type === "text");
      const finalText = textBlocks.map((b) => b.text).join("\n");
      return {
        response: finalText,
        conversationHistory: messages,
      };
    }

    // Execute all tool calls (could run in parallel with Promise.all,
    // but sequential is safer for shared state mutations)
    const toolResults = [];

    for (const toolBlock of toolUseBlocks) {
      const { id: toolUseId, name: toolName, input: toolInput } = toolBlock;

      let result;
      try {
        result = executeTool(toolName, toolInput);
      } catch (execError) {
        result = {
          error: execError.message || String(execError),
          is_error: true,
        };
      }

      // Determine if the result is an error
      const isError = result && result.is_error === true;

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUseId,
        content: JSON.stringify(isError ? result : result, null, 2),
        is_error: isError,
      });
    }

    // Append all tool results as a single user message
    messages.push({
      role: "user",
      content: toolResults,
    });
  }

  // If we exhaust max iterations, return what we have
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  let fallbackText =
    "The agent reached the maximum number of iterations (10) without completing. " +
    "The request may be too complex or require manual intervention.";

  if (lastAssistant && Array.isArray(lastAssistant.content)) {
    const textBlocks = lastAssistant.content.filter((b) => b.type === "text");
    if (textBlocks.length > 0) {
      fallbackText += "\n\nLast agent output:\n" + textBlocks.map((b) => b.text).join("\n");
    }
  }

  return {
    response: fallbackText,
    conversationHistory: messages,
  };
}

module.exports = { runPayrollAgent };
