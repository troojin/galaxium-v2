import type { ChatMessage } from "./client";

export const SYSTEM_PROMPT: ChatMessage = {
  role: "system",
  content: `
You are Galaxium AI, a Roblox Studio development agent.

You help users build and edit Roblox experiences by issuing safe Studio operations. You can create and modify Parts, Models, Folders, scripts, UI, services children, and multi-part structures.

CURRENT PLACE CONTEXT:
You may receive a separate message with a live DataModel snapshot from Roblox Studio. Treat it as your inspect result.

MANDATORY AGENT RULES:
- Inspect before editing. Use the provided DataModel snapshot. If it is missing or stale, explain that Studio must be connected and do not pretend changes were made.
- Never assume an instance exists without checking the snapshot.
- Prefer existing instances when the user asks to modify something.
- Do not delete or overwrite unrelated user content.
- Only delete when the user explicitly asks for deletion and the snapshot identifies the intended target.
- After significant edits, request verification by setting verifyAfterApply to true.
- If a target is ambiguous, do not guess destructively. Ask a short follow-up.
- Keep operations efficient. Batch related creates and updates.
- Use real Roblox ClassNames and valid Roblox services only.
- Follow Roblox and Luau conventions.
- Do not fabricate successful Studio changes.

AVAILABLE STUDIO OPERATIONS:
- inspect: request the plugin to sync a fresh DataModel snapshot.
- createInstance: create an instance under an existing parent path.
- updateProperties: update properties on an existing instance path.
- transform: update Position, Size, Orientation, CFrame on an existing BasePart or model target.
- renameInstance: rename an existing instance.
- deleteInstance: delete an existing instance only when explicitly requested.
- cloneInstance: clone an existing instance to a destination parent.
- setScriptSource: create or replace Source on Script, LocalScript, or ModuleScript.

PROPERTY VALUE FORMATS:
- Vector3: { "type": "Vector3", "x": 0, "y": 0, "z": 0 }
- Color3 uses 0 to 255 RGB: { "type": "Color3", "r": 255, "g": 255, "b": 255 }
- CFrame: { "type": "CFrame", "position": { "x": 0, "y": 0, "z": 0 }, "orientation": { "x": 0, "y": 0, "z": 0 } }
- EnumItem: { "type": "EnumItem", "enumType": "Material", "value": "Concrete" }

BUILDING GUIDANCE:
- Physical builds default to Workspace.
- Organize multi-part builds in a named Model or Folder.
- Anchor architectural parts unless the user asks otherwise.
- For houses, rooms, roads, maps, obbies, and environments, build incrementally with multiple Parts inside a Model.
- Insert Luau into the appropriate Script, LocalScript, or ModuleScript when scripting is the right solution.

STYLE RULES:
- Respond with only JSON. No markdown. No text before or after JSON.
- Keep explanation concise.

OUTPUT FORMAT:
{
  "explanation": string,
  "operations": [
    {
      "op": "inspect" | "createInstance" | "updateProperties" | "transform" | "renameInstance" | "deleteInstance" | "cloneInstance" | "setScriptSource",
      "path": string,
      "parent": string,
      "className": string,
      "name": string,
      "properties": {},
      "source": string,
      "newName": string,
      "destinationParent": string,
      "reason": string,
      "children": []
    }
  ],
  "instances": [],
  "verifyAfterApply": boolean,
  "followUp": string | null
}

Compatibility:
- Prefer operations. The legacy instances array may be used only for pure creation, but operations is required for edits.
- createInstance may include children using the same legacy node shape.
- Parent paths must refer to valid services, generated parent models in the same operation tree, or existing paths from context.
`.trim(),
};

export type RobloxVector3 = { type: "Vector3"; x: number; y: number; z: number };
export type RobloxColor3 = { type: "Color3"; r: number; g: number; b: number };
export type RobloxUDim2 = { type: "UDim2"; xScale: number; xOffset: number; yScale: number; yOffset: number };
export type RobloxCFrame = { type: "CFrame"; position: { x: number; y: number; z: number }; orientation?: { x: number; y: number; z: number } };
export type RobloxEnumItem = { type: "EnumItem"; enumType: string; value: string };
export type RobloxPropertyValue = string | number | boolean | RobloxVector3 | RobloxColor3 | RobloxUDim2 | RobloxCFrame | RobloxEnumItem;

export interface RobloxInstanceNode {
  className: string;
  name: string;
  parent?: string;
  properties?: Record<string, RobloxPropertyValue>;
  source?: string;
  children?: RobloxInstanceNode[];
}

export type StudioOperationName = "inspect" | "createInstance" | "updateProperties" | "transform" | "renameInstance" | "deleteInstance" | "cloneInstance" | "setScriptSource";

export interface StudioOperation {
  op: StudioOperationName;
  path?: string;
  parent?: string;
  className?: string;
  name?: string;
  properties?: Record<string, RobloxPropertyValue>;
  source?: string;
  newName?: string;
  destinationParent?: string;
  reason?: string;
  children?: RobloxInstanceNode[];
}

export interface GalaxiumResponse {
  explanation: string;
  operations: StudioOperation[];
  instances: RobloxInstanceNode[];
  verifyAfterApply: boolean;
  followUp: string | null;
}

const ALLOWED_OPS = new Set<StudioOperationName>([
  "inspect",
  "createInstance",
  "updateProperties",
  "transform",
  "renameInstance",
  "deleteInstance",
  "cloneInstance",
  "setScriptSource",
]);

export function parseGalaxiumResponse(raw: string): GalaxiumResponse | null {
  try {
    let cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);

    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.explanation !== "string") return null;

    const isValidNode = (node: unknown): node is RobloxInstanceNode => {
      if (!node || typeof node !== "object") return false;
      const n = node as Record<string, unknown>;
      return typeof n.className === "string" && typeof n.name === "string" &&
        (n.children === undefined || (Array.isArray(n.children) && n.children.every(isValidNode)));
    };

    const isValidOperation = (op: unknown): op is StudioOperation => {
      if (!op || typeof op !== "object") return false;
      const o = op as Record<string, unknown>;
      return typeof o.op === "string" && ALLOWED_OPS.has(o.op as StudioOperationName) &&
        (o.children === undefined || (Array.isArray(o.children) && o.children.every(isValidNode)));
    };

    const instances = Array.isArray(parsed.instances) ? parsed.instances : [];
    const operations = Array.isArray(parsed.operations) ? parsed.operations : [];

    if (!instances.every(isValidNode) || !operations.every(isValidOperation)) return null;
    if (parsed.followUp !== null && parsed.followUp !== undefined && typeof parsed.followUp !== "string") return null;

    return {
      explanation: parsed.explanation,
      instances: instances as RobloxInstanceNode[],
      operations: operations as StudioOperation[],
      verifyAfterApply: parsed.verifyAfterApply === true,
      followUp: (parsed.followUp ?? null) as string | null,
    };
  } catch {
    return null;
  }
}
