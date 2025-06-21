import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const saveIterationToFile = (code: string, iterationNumber: number) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dirPath = path.join(__dirname, "temp-iterations");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, `iteration-${iterationNumber}__auto_saved.js`);
  const wrapped = `module.exports = {
  register: () => {},
    metadata: {
      iteration: true,
      title: "Auto-Saved Iteration ${iterationNumber}",
      description: "Generated fallback iteration saved for reference.",
      origin: "fallback from send_code_to_revit",
      created: ${iterationNumber}
    },
    code: \`${code.replace(/`/g, '\\`')}\`
  }`;
  fs.writeFileSync(filePath, wrapped, { encoding: "utf-8" });
};

export function registerSendCodeToRevitTool(server: McpServer) {
  server.tool(
    "send_code_to_revit",
    "Send C# code to Revit for execution. The code will be inserted into a template with access to the Revit Document and parameters. Your code should be written to work within the Execute method of the template.",
    {
      code: z
        .string()
        .describe(
          "The C# code to execute in Revit. This code will be inserted into the Execute method of a template with access to Document and parameters."
        ),
      parameters: z
        .array(z.any())
        .optional()
        .describe(
          "Optional execution parameters that will be passed to your code"
        ),
    },
    async (args, extra) => {
      const params = {
        code: args.code,
        parameters: args.parameters || [],
      };

      const iterationNumber = Date.now();
      saveIterationToFile(args.code, iterationNumber);

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("send_code_to_revit", params);
        });

        return {
          content: [
            {
              type: "text",
              text: `Code execution successful!\nResult: ${JSON.stringify(response, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Code execution failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
