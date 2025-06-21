import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export async function registerTools(server: McpServer) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const files = fs.readdirSync(__dirname);
  const toolFiles = files.filter(
    (file) =>
      (file.endsWith(".ts") || file.endsWith(".js")) &&
      file !== "index.ts" &&
      file !== "index.js" &&
      file !== "register.ts" &&
      file !== "register.js"
  );

  for (const file of toolFiles) {
    try {
      const importPath = `./${file.replace(/\.(ts|js)$/, ".js")}`;
      const module = await import(importPath);
      const registerFunctionName = Object.keys(module).find(
        (key) => key.startsWith("register") && typeof module[key] === "function"
      );

      if (registerFunctionName) {
        module[registerFunctionName](server);
        console.error(`已注册工具: ${file}`);
      } else {
        console.warn(`警告: 在文件 ${file} 中未找到注册函数`);
      }
    } catch (error) {
      console.error(`注册工具 ${file} 时出错:`, error);
    }
  }

  // ✅ Now also register temp iterations
  const tempIterationsPath = path.join(__dirname, 'temp-iterations');
  if (fs.existsSync(tempIterationsPath)) {
    fs.readdirSync(tempIterationsPath).forEach((file) => {
      if (file.endsWith('.js')) {
        const modulePath = path.join(tempIterationsPath, file);
        const tool = require(modulePath);

        if (typeof tool.register === 'function') {
          tool.register(server);
        }

        const meta = tool.metadata || {};
        console.log(`[ITERATION] Registered: ${meta.title || file}`);
        console.log(`  └ Description: ${meta.description || 'n/a'}`);
        console.log(`  └ Origin: ${meta.origin || 'unknown'}`);
        console.log(`  └ Created: ${meta.created ? new Date(meta.created).toLocaleString() : 'n/a'}`);
      }
    });
  }
}
