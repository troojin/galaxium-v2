local HttpService = game:GetService("HttpService")
local ScriptEditorService = game:GetService("ScriptEditorService")

local API_BASE = "https://galaxium.lol/api/plugin"
local SETTING_KEY = "galaxiumApiKey"
local APPLIED_INSERT_IDS_SETTING = "galaxiumAppliedInsertIds"

local DEBUG = true

local function log(message)
	if DEBUG then
		print("[Galaxium]", message)
	end
end

local function warn(message)
	if DEBUG then
		print("[Galaxium] WARN:", message)
	end
end

local DataModelDump = {}

local DEFAULT_SERVICE_NAMES = {
	"Workspace",
	"ServerScriptService",
	"ServerStorage",
	"ReplicatedStorage",
	"ReplicatedFirst",
	"StarterGui",
	"StarterPlayer",
	"StarterPack",
	"Lighting",
	"SoundService",
	"Teams",
}

local SKIP_CLASSNAMES = {
	Camera = true,
	Terrain = true,
}

local DUMP_PROPERTY_MAP = {
	BasePart = { "Size", "Position", "Orientation", "Anchored", "CanCollide", "Transparency", "Material", "Color" },
	Model = { "PrimaryPart" },
	Part = { "Shape" },
	MeshPart = { "MeshId", "TextureID" },
	SpawnLocation = { "TeamColor" },
	PointLight = { "Brightness", "Range", "Color" },
	SpotLight = { "Brightness", "Range", "Angle", "Color" },
	SurfaceGui = { "Face", "AlwaysOnTop" },
	ScreenGui = { "ResetOnSpawn", "ZIndexBehavior" },
	TextLabel = { "Text", "TextColor3", "TextSize", "Font" },
	TextButton = { "Text", "TextColor3", "TextSize", "Font" },
	ImageLabel = { "Image" },
	Frame = { "BackgroundColor3", "BackgroundTransparency" },
	Sound = { "SoundId", "Volume", "Looped", "Playing" },
	RemoteEvent = {},
	RemoteFunction = {},
	BindableEvent = {},
	BindableFunction = {},
	Attachment = { "Position" },
	Weld = { "Part0", "Part1" },
	Motor6D = { "Part0", "Part1" },
}

local DUMP_SCRIPT_CLASSNAMES = {
	Script = true,
	LocalScript = true,
	ModuleScript = true,
}

local function dumpSafeGetProperty(instance, propName)
	local ok, value = pcall(function()
		return instance[propName]
	end)
	if not ok then
		return nil
	end
	local t = typeof(value)
	if t == "Vector3" then
		return { x = value.X, y = value.Y, z = value.Z }
	elseif t == "Vector2" then
		return { x = value.X, y = value.Y }
	elseif t == "Color3" then
		return { r = value.R, g = value.G, b = value.B }
	elseif t == "CFrame" then
		local pos = value.Position
		return { x = pos.X, y = pos.Y, z = pos.Z }
	elseif t == "EnumItem" then
		return tostring(value)
	elseif t == "Instance" then
		return value and value:GetFullName() or nil
	elseif t == "boolean" or t == "number" or t == "string" then
		return value
	else
		local ok2, str = pcall(tostring, value)
		return ok2 and str or nil
	end
end

local function dumpGetPropertiesFor(instance)
	local props = {}
	for className, propList in pairs(DUMP_PROPERTY_MAP) do
		if instance:IsA(className) then
			for _, propName in ipairs(propList) do
				local value = dumpSafeGetProperty(instance, propName)
				if value ~= nil then
					props[propName] = value
				end
			end
		end
	end

	local ok, attrs = pcall(function()
		return instance:GetAttributes()
	end)
	if ok and next(attrs) ~= nil then
		props.Attributes = attrs
	end

	if next(props) == nil then
		return nil
	end
	return props
end

local function dumpSerializeInstance(instance, options)
	if SKIP_CLASSNAMES[instance.ClassName] then
		return nil
	end

	local node = {
		Name = instance.Name,
		ClassName = instance.ClassName,
	}

	if DUMP_SCRIPT_CLASSNAMES[instance.ClassName] then
		local ok, source = pcall(function()
			return instance.Source
		end)
		node.Source = ok and source or nil
		local ok2, enabled = pcall(function()
			return instance.Enabled
		end)
		if ok2 then
			node.Enabled = enabled
		end
		local ok3, rc = pcall(function()
			return instance.RunContext
		end)
		if ok3 and instance.ClassName == "Script" then
			node.RunContext = tostring(rc)
		end
	end

	local props = dumpGetPropertiesFor(instance)
	if props then
		node.Properties = props
	end

	local children = instance:GetChildren()
	if #children > 0 then
		local serializedChildren = {}
		for _, child in ipairs(children) do
			local serializedChild = dumpSerializeInstance(child, options)
			if serializedChild then
				table.insert(serializedChildren, serializedChild)
			end
		end
		if #serializedChildren > 0 then
			node.Children = serializedChildren
		end
	end

	return node
end

function DataModelDump.dump(roots, options)
	options = options or {}
	local result = {
		GeneratedAt = os.time(),
		PlaceId = game.PlaceId,
		Roots = {},
	}

	local rootInstances = roots
	if not rootInstances then
		rootInstances = {}
		if options.includeAll then
			for _, child in ipairs(game:GetChildren()) do
				table.insert(rootInstances, child)
			end
		else
			for _, name in ipairs(DEFAULT_SERVICE_NAMES) do
				local ok, service = pcall(function()
					return game:GetService(name)
				end)
				if ok and service then
					table.insert(rootInstances, service)
				end
			end
		end
	end

	for _, root in ipairs(rootInstances) do
		local serialized = dumpSerializeInstance(root, options)
		if serialized then
			table.insert(result.Roots, serialized)
		end
	end

	return result
end

local toolbar = plugin:CreateToolbar("Galaxium AI")
local toggleButton = toolbar:CreateButton(
	"Galaxium AI",
	"Open Galaxium AI chat",
	"rbxassetid://70408349334802"
)

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	false,
	false,
	320,
	420,
	260,
	300
)

local widget = plugin:CreateDockWidgetPluginGui("GalaxiumAIWidget", widgetInfo)
widget.Title = "Galaxium AI"

toggleButton.Click:Connect(function()
	widget.Enabled = not widget.Enabled
	log("toggle clicked, widget enabled: " .. tostring(widget.Enabled))
end)

local Root = Instance.new("Frame")
local UIListLayout = Instance.new("UIListLayout")
local UIPadding = Instance.new("UIPadding")
local SignedOut = Instance.new("Frame")
local UIListLayout_2 = Instance.new("UIListLayout")
local TextLabel = Instance.new("TextLabel")
local loginButton = Instance.new("TextButton")
local UICorner = Instance.new("UICorner")
local loginButtonStroke = Instance.new("UIStroke")
local loginButtonGradient = Instance.new("UIGradient")
local codeLabel = Instance.new("TextBox")
local UICorner_2 = Instance.new("UICorner")
local codeLabelStroke = Instance.new("UIStroke")
local UIPadding_2 = Instance.new("UIPadding")
local statusLabel = Instance.new("TextLabel")
local SignedIn = Instance.new("Frame")
local UIListLayout_3 = Instance.new("UIListLayout")
local connectedLabel = Instance.new("TextLabel")
local projectLabel = Instance.new("TextLabel")
local refreshButton = Instance.new("TextButton")
local signOutButton = Instance.new("TextButton")
local UICorner_3 = Instance.new("UICorner")
local signOutButtonStroke = Instance.new("UIStroke")

Root.Name = "Root"
Root.Parent = widget
Root.BackgroundColor3 = Color3.fromRGB(10, 10, 10)
Root.BorderSizePixel = 0
Root.Size = UDim2.new(1, 0, 1, 0)

UIListLayout.Parent = Root
UIListLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
UIListLayout.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout.VerticalAlignment = Enum.VerticalAlignment.Center
UIListLayout.Padding = UDim.new(0, 12)

UIPadding.Parent = Root
UIPadding.PaddingLeft = UDim.new(0, 20)
UIPadding.PaddingRight = UDim.new(0, 20)

SignedOut.Name = "SignedOut"
SignedOut.Parent = Root
SignedOut.BackgroundTransparency = 1.000
SignedOut.LayoutOrder = 1
SignedOut.Size = UDim2.new(1, 0, 0, 160)

UIListLayout_2.Parent = SignedOut
UIListLayout_2.HorizontalAlignment = Enum.HorizontalAlignment.Center
UIListLayout_2.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout_2.Padding = UDim.new(0, 10)

TextLabel.Parent = SignedOut
TextLabel.BackgroundTransparency = 1.000
TextLabel.LayoutOrder = 1
TextLabel.Size = UDim2.new(1, 0, 0, 24)
TextLabel.Font = Enum.Font.GothamBold
TextLabel.Text = "Galaxium AI"
TextLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
TextLabel.TextSize = 17.000

loginButton.Parent = SignedOut
loginButton.BackgroundColor3 = Color3.fromRGB(107, 59, 189)
loginButton.LayoutOrder = 2
loginButton.Position = UDim2.new(0.474362642, 0, 0.212500006, 0)
loginButton.Size = UDim2.new(0.18016991, 0, 0, 28)
loginButton.Font = Enum.Font.GothamMedium
loginButton.Text = "Log into Galaxium"
loginButton.TextColor3 = Color3.fromRGB(255, 255, 255)
loginButton.TextSize = 12.000
loginButton.TextWrapped = true
loginButton.AutoButtonColor = true

UICorner.CornerRadius = UDim.new(0, 7)
UICorner.Parent = loginButton

loginButtonGradient.Color = ColorSequence.new({
	ColorSequenceKeypoint.new(0, Color3.fromRGB(124, 77, 225)),
	ColorSequenceKeypoint.new(1, Color3.fromRGB(91, 33, 182)),
})
loginButtonGradient.Rotation = 160
loginButtonGradient.Parent = loginButton

loginButtonStroke.Color = Color3.fromRGB(255, 255, 255)
loginButtonStroke.Transparency = 0.88
loginButtonStroke.Thickness = 1
loginButtonStroke.Parent = loginButton

codeLabel.Parent = SignedOut
codeLabel.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
codeLabel.BackgroundTransparency = 0.6
codeLabel.LayoutOrder = 3
codeLabel.Position = UDim2.new(0, 0, 0.449999988, 0)
codeLabel.Size = UDim2.new(0.22379604, 0, 0, 36)
codeLabel.ClearTextOnFocus = false
codeLabel.Font = Enum.Font.Gotham
codeLabel.Text = ""
codeLabel.TextColor3 = Color3.fromRGB(212, 212, 220)
codeLabel.TextSize = 13.000
codeLabel.TextWrapped = true
codeLabel.TextEditable = false
codeLabel.Visible = false

UICorner_2.CornerRadius = UDim.new(0, 8)
UICorner_2.Parent = codeLabel

codeLabelStroke.Color = Color3.fromRGB(255, 255, 255)
codeLabelStroke.Transparency = 0.91
codeLabelStroke.Thickness = 1
codeLabelStroke.Parent = codeLabel

UIPadding_2.Parent = codeLabel
UIPadding_2.PaddingLeft = UDim.new(0, 8)
UIPadding_2.PaddingRight = UDim.new(0, 8)

statusLabel.Parent = SignedOut
statusLabel.BackgroundTransparency = 1.000
statusLabel.LayoutOrder = 4
statusLabel.Size = UDim2.new(1, 0, 0, 20)
statusLabel.Font = Enum.Font.Gotham
statusLabel.Text = ""
statusLabel.TextColor3 = Color3.fromRGB(154, 154, 165)
statusLabel.TextSize = 12.000

SignedIn.Name = "SignedIn"
SignedIn.Parent = Root
SignedIn.BackgroundTransparency = 1.000
SignedIn.LayoutOrder = 2
SignedIn.Size = UDim2.new(1, 0, 0, 148)
SignedIn.Visible = false

UIListLayout_3.Parent = SignedIn
UIListLayout_3.HorizontalAlignment = Enum.HorizontalAlignment.Center
UIListLayout_3.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout_3.Padding = UDim.new(0, 10)

connectedLabel.Parent = SignedIn
connectedLabel.BackgroundTransparency = 1.000
connectedLabel.LayoutOrder = 1
connectedLabel.Size = UDim2.new(1, 0, 0, 20)
connectedLabel.Font = Enum.Font.GothamMedium
connectedLabel.Text = "Connected to Galaxium \xE2\x9C\x93"
connectedLabel.TextColor3 = Color3.fromRGB(74, 222, 128)
connectedLabel.TextSize = 14.000

projectLabel.Parent = SignedIn
projectLabel.BackgroundTransparency = 1.000
projectLabel.LayoutOrder = 2
projectLabel.Size = UDim2.new(1, 0, 0, 18)
projectLabel.Font = Enum.Font.Gotham
projectLabel.Text = ""
projectLabel.TextColor3 = Color3.fromRGB(154, 154, 165)
projectLabel.TextSize = 12.000
projectLabel.TextTruncate = Enum.TextTruncate.AtEnd

refreshButton.Name = "refreshButton"
refreshButton.Parent = SignedIn
refreshButton.BackgroundTransparency = 1
refreshButton.LayoutOrder = 3
refreshButton.Size = UDim2.new(1, 0, 0, 24)
refreshButton.Font = Enum.Font.GothamMedium
refreshButton.Text = "Refresh project"
refreshButton.TextColor3 = Color3.fromRGB(167, 139, 250)
refreshButton.TextSize = 12.000

signOutButton.Parent = SignedIn
signOutButton.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
signOutButton.BackgroundTransparency = 1
signOutButton.LayoutOrder = 4
signOutButton.Size = UDim2.new(1, 0, 0, 30)
signOutButton.Font = Enum.Font.Gotham
signOutButton.Text = "Sign out"
signOutButton.TextColor3 = Color3.fromRGB(154, 154, 165)
signOutButton.TextSize = 13.000

UICorner_3.CornerRadius = UDim.new(0, 8)
UICorner_3.Parent = signOutButton

signOutButtonStroke.Color = Color3.fromRGB(255, 255, 255)
signOutButtonStroke.Transparency = 0.92
signOutButtonStroke.Thickness = 1
signOutButtonStroke.Parent = signOutButton

local isPolling = false

local function setSignedInUI(isSignedIn)
	SignedOut.Visible = not isSignedIn
	SignedIn.Visible = isSignedIn
end

local function request(method, path, body, apiKey)
	log("request: " .. method .. " " .. path)

	local headers = { ["Content-Type"] = "application/json" }
	if apiKey then
		headers["Authorization"] = "Bearer " .. apiKey
	end

	local ok, res = pcall(function()
		return HttpService:RequestAsync({
			Url = API_BASE .. path,
			Method = method,
			Headers = headers,
			Body = body and HttpService:JSONEncode(body) or nil,
		})
	end)

	if not ok then
		warn("request failed to send: " .. tostring(res))
		return nil, tostring(res)
	end

	log("response status: " .. tostring(res.StatusCode))
	log("response body: " .. tostring(res.Body))

	if not res.Success then
		warn("request returned non-success: " .. tostring(res.StatusCode))
		warn("response body: " .. tostring(res.Body))
		return nil, "HTTP " .. tostring(res.StatusCode)
	end

	local decodeOk, decoded = pcall(HttpService.JSONDecode, HttpService, res.Body)
	if not decodeOk then
		warn("failed to decode response body")
		return nil, "Malformed response from server"
	end

	log("request succeeded: " .. method .. " " .. path)
	return decoded, nil
end

local currentProjectId = nil
local heartbeatRunning = false

local function startHeartbeat()
	if heartbeatRunning then return end
	heartbeatRunning = true

	task.spawn(function()
		while heartbeatRunning do
			local apiKey = plugin:GetSetting(SETTING_KEY)
			if apiKey and currentProjectId then
				local _, err = request("POST", "/projects/presence", { projectId = currentProjectId }, apiKey)
				if err then
					warn("heartbeat failed: " .. tostring(err))
				end
			end
			task.wait(10)
		end
	end)
end

local function stopHeartbeat()
	heartbeatRunning = false
end

local contextSyncRunning = false

local function startContextSync()
	if contextSyncRunning then return end
	contextSyncRunning = true

	task.spawn(function()
		while contextSyncRunning do
			local apiKey = plugin:GetSetting(SETTING_KEY)
			if apiKey and currentProjectId then
				local ok, snapshot = pcall(DataModelDump.dump)
				if ok then
					local _, err = request("POST", "/context", { projectId = currentProjectId, snapshot = snapshot }, apiKey)
					if err then
						warn("context sync failed: " .. tostring(err))
					end
				else
					warn("failed to build DataModel dump: " .. tostring(snapshot))
				end
			end
			task.wait(20)
		end
	end)
end

local function stopContextSync()
	contextSyncRunning = false
end

local KNOWN_SERVICES = {
	Workspace = function() return workspace end,
	ServerScriptService = function() return game:GetService("ServerScriptService") end,
	ServerStorage = function() return game:GetService("ServerStorage") end,
	ReplicatedStorage = function() return game:GetService("ReplicatedStorage") end,
	ReplicatedFirst = function() return game:GetService("ReplicatedFirst") end,
	StarterGui = function() return game:GetService("StarterGui") end,
	StarterPack = function() return game:GetService("StarterPack") end,
	StarterPlayer = function() return game:GetService("StarterPlayer") end,
	Lighting = function() return game:GetService("Lighting") end,
	SoundService = function() return game:GetService("SoundService") end,
	Chat = function() return game:GetService("Chat") end,
	TextChatService = function() return game:GetService("TextChatService") end,
	StarterPlayerScripts = function()
		return game:GetService("StarterPlayer"):WaitForChild("StarterPlayerScripts")
	end,
	StarterCharacterScripts = function()
		return game:GetService("StarterPlayer"):WaitForChild("StarterCharacterScripts")
	end,
}

local function coercePropertyValue(value)
	if typeof(value) ~= "table" or type(value.type) ~= "string" then
		return value
	end

	local t = value.type

	if t == "Vector3" then
		return Vector3.new(value.x, value.y, value.z)
	elseif t == "Color3" then
		return Color3.fromRGB(value.r, value.g, value.b)
	elseif t == "UDim2" then
		return UDim2.new(value.xScale, value.xOffset, value.yScale, value.yOffset)
	elseif t == "CFrame" then
		local pos = value.position or { x = 0, y = 0, z = 0 }
		local cf = CFrame.new(pos.x, pos.y, pos.z)
		if value.orientation then
			local o = value.orientation
			cf = cf * CFrame.Angles(math.rad(o.x), math.rad(o.y), math.rad(o.z))
		end
		return cf
	elseif t == "EnumItem" then
		local ok, enumItem = pcall(function()
			return Enum[value.enumType][value.value]
		end)
		if ok then
			return enumItem
		end
		warn("invalid EnumItem " .. tostring(value.enumType) .. "." .. tostring(value.value))
		return nil
	end

	warn("unknown typed property value: " .. tostring(t))
	return nil
end

local function applyProperty(instance, key, rawValue)
	local coerced = coercePropertyValue(rawValue)
	if coerced == nil then
		return
	end
	local ok, err = pcall(function()
		instance[key] = coerced
	end)
	if not ok then
		warn("failed to set property " .. tostring(key) .. " on " .. instance.ClassName .. ": " .. tostring(err))
	end
end

-- IMPORTANT: for any node that is nested inside another node in the SAME payload
-- (i.e. it arrived via a parent's "children" array), the tree structure it was sent
-- in is always the source of truth for where it should be parented. We deliberately
-- ignore that node's own "parent" field in that case, because the AI sometimes stamps
-- every node (not just top-level roots) with an absolute parent path, which would
-- otherwise silently override the nesting and pull things like a Frame out of its
-- ScreenGui and attach it to the ScreenGui's own parent instead.
-- The explicit "parent" field is only honored for a payload's root-level instances,
-- where there is no structural parent to fall back on (e.g. "StarterGui").
local function setScriptSource(instance, source)
	if not (instance:IsA("Script") or instance:IsA("LocalScript") or instance:IsA("ModuleScript")) then
		return true
	end

	local text = tostring(source or "")

	-- Use ScriptEditorService for edit-time source updates. This keeps open
	-- script documents in sync and avoids relying on the legacy Source setter.
	local ok, err = pcall(function()
		ScriptEditorService:UpdateSourceAsync(instance, function()
			return text
		end)
	end)
	if ok then
		return true
	end

	-- Fallback for Studio/plugin versions where UpdateSourceAsync is unavailable
	-- or rejects a newly-created script. Never let a source failure prevent the
	-- Instance from being parented into the DataModel.
	local fallbackOk, fallbackErr = pcall(function()
		instance.Source = text
	end)
	if fallbackOk then
		return true
	end

	warn("failed to set source on " .. instance.ClassName .. " '" .. instance.Name .. "': " .. tostring(fallbackErr or err))
	return false, fallbackErr or err
end

local function walkAndCreate(node, structuralParentPath, flatList, instancesByPath)
	local parentPath
	if structuralParentPath then
		parentPath = structuralParentPath
	else
		parentPath = node.parent
	end

	local ownPath
	if parentPath then
		ownPath = parentPath .. "." .. node.name
	else
		ownPath = node.name
	end

	local ok, inst = pcall(Instance.new, node.className)
	if not ok then
		warn("failed to create instance of class " .. tostring(node.className) .. ": " .. tostring(inst))
		return
	end

	inst.Name = node.name

	-- Important: creation and parenting are recorded before properties/source are
	-- applied. A failing property or script-source write must never leave the
	-- newly-created Instance detached from Studio.
	instancesByPath[ownPath] = inst
	table.insert(flatList, {
		instance = inst,
		parentPath = parentPath,
		path = ownPath,
		properties = node.properties,
		source = node.source,
	})

	if node.children then
		for _, child in ipairs(node.children) do
			walkAndCreate(child, ownPath, flatList, instancesByPath)
		end
	end
end

local function configureCreatedEntry(entry)
	if entry.properties then
		for key, value in pairs(entry.properties) do
			applyProperty(entry.instance, key, value)
		end
	end

	if entry.source and (entry.instance:IsA("Script") or entry.instance:IsA("LocalScript") or entry.instance:IsA("ModuleScript")) then
		setScriptSource(entry.instance, entry.source)
	end
end

local function resolvePath(path, instancesByPath)
	if instancesByPath[path] then
		return instancesByPath[path]
	end

	local segments = string.split(path, ".")
	local first = segments[1]

	local root
	if KNOWN_SERVICES[first] then
		local ok, result = pcall(KNOWN_SERVICES[first])
		if not ok then
			warn("failed to resolve service " .. tostring(first) .. ": " .. tostring(result))
			return workspace
		end
		root = result
	else
		warn("unknown root '" .. tostring(first) .. "' in parent path '" .. path .. "', defaulting to Workspace")
		return workspace
	end

	local current = root
	for i = 2, #segments do
		local child = current:FindFirstChild(segments[i])
		if not child then
			warn("could not resolve '" .. path .. "' past '" .. current:GetFullName() .. "', defaulting to that point")
			return current
		end
		current = child
	end

	return current
end

local function parentCreatedEntries(flatList, instancesByPath)
	for _, entry in ipairs(flatList) do
		local parent
		if entry.parentPath then
			parent = resolvePath(entry.parentPath, instancesByPath)
		else
			parent = workspace
		end

		local ok, err = pcall(function()
			entry.instance.Parent = parent
		end)
		if not ok then
			pcall(function() entry.instance:Destroy() end)
			error("failed to parent " .. tostring(entry.path) .. " under " .. tostring(entry.parentPath or "Workspace") .. ": " .. tostring(err))
		end

		if entry.instance.Parent ~= parent then
			pcall(function() entry.instance:Destroy() end)
			error("Studio did not accept parent assignment for " .. tostring(entry.path) .. " under " .. tostring(entry.parentPath or "Workspace"))
		end
	end

	for _, entry in ipairs(flatList) do
		configureCreatedEntry(entry)
	end
end

local function applyInsert(payload)
	local flatList = {}
	local instancesByPath = {}

	for _, node in ipairs(payload.instances or {}) do
		walkAndCreate(node, nil, flatList, instancesByPath)
	end

	parentCreatedEntries(flatList, instancesByPath)
end


local function serializeOperationTarget(instance)
	if not instance then return nil end
	return dumpSerializeInstance(instance, {})
end

local function operationResult(ok, op, path, message, instance)
	return {
		ok = ok,
		op = op,
		path = path,
		message = message,
		instance = serializeOperationTarget(instance),
	}
end

local function findInstanceByPath(path, instancesByPath)
	if type(path) ~= "string" or path == "" then
		return nil, "missing path"
	end
	local inst = resolvePath(path, instancesByPath or {})
	if inst and inst:GetFullName() == path then
		return inst, nil
	end
	-- resolvePath returns nearest parent on miss, so verify the full path manually.
	local segments = string.split(path, ".")
	local rootGetter = KNOWN_SERVICES[segments[1]]
	if not rootGetter then return nil, "unknown root " .. tostring(segments[1]) end
	local ok, current = pcall(rootGetter)
	if not ok or not current then return nil, "failed to resolve root" end
	for i = 2, #segments do
		current = current:FindFirstChild(segments[i])
		if not current then return nil, "instance not found: " .. path end
	end
	return current, nil
end

local function createNodeUnder(node, parentPath, instancesByPath, results)
	node.parent = parentPath
	local flatList = {}
	walkAndCreate(node, nil, flatList, instancesByPath)
	parentCreatedEntries(flatList, instancesByPath)
	for _, entry in ipairs(flatList) do
		table.insert(results, operationResult(true, "createInstance", entry.path, "created", entry.instance))
	end
end

local function applyStudioOperations(payload)
	local results = {}
	local instancesByPath = {}

	for _, op in ipairs(payload.operations or {}) do
		local opName = op.op
		if opName == "inspect" then
			table.insert(results, operationResult(true, opName, op.path, "snapshot synced", nil))
		elseif opName == "createInstance" then
			if type(op.parent) ~= "string" or type(op.className) ~= "string" or type(op.name) ~= "string" then
				table.insert(results, operationResult(false, opName, op.parent, "createInstance requires parent, className, and name", nil))
			else
				local parent, err = findInstanceByPath(op.parent, instancesByPath)
				if not parent then
					table.insert(results, operationResult(false, opName, op.parent, err, nil))
				else
					local node = { className = op.className, name = op.name, parent = op.parent, properties = op.properties, source = op.source, children = op.children }
					createNodeUnder(node, op.parent, instancesByPath, results)
				end
			end
		elseif opName == "updateProperties" or opName == "transform" then
			local target, err = findInstanceByPath(op.path, instancesByPath)
			if not target then
				table.insert(results, operationResult(false, opName, op.path, err, nil))
			else
				for key, value in pairs(op.properties or {}) do
					applyProperty(target, key, value)
				end
				table.insert(results, operationResult(true, opName, op.path, "updated", target))
			end
		elseif opName == "renameInstance" then
			local target, err = findInstanceByPath(op.path, instancesByPath)
			if not target or type(op.newName) ~= "string" then
				table.insert(results, operationResult(false, opName, op.path, err or "renameInstance requires newName", nil))
			else
				target.Name = op.newName
				table.insert(results, operationResult(true, opName, op.path, "renamed", target))
			end
		elseif opName == "deleteInstance" then
			local target, err = findInstanceByPath(op.path, instancesByPath)
			if not target then
				table.insert(results, operationResult(false, opName, op.path, err, nil))
			else
				local oldPath = target:GetFullName()
				target:Destroy()
				table.insert(results, operationResult(true, opName, oldPath, "deleted", nil))
			end
		elseif opName == "cloneInstance" then
			local target, err = findInstanceByPath(op.path, instancesByPath)
			local parent, parentErr = findInstanceByPath(op.destinationParent, instancesByPath)
			if not target or not parent then
				table.insert(results, operationResult(false, opName, op.path, err or parentErr, nil))
			else
				local clone = target:Clone()
				if type(op.name) == "string" then clone.Name = op.name end
				if op.properties then
					for key, value in pairs(op.properties) do applyProperty(clone, key, value) end
				end
				clone.Parent = parent
				table.insert(results, operationResult(true, opName, clone:GetFullName(), "cloned", clone))
			end
		elseif opName == "setScriptSource" then
			local target, err = findInstanceByPath(op.path, instancesByPath)
			if not target then
				if type(op.parent) == "string" and type(op.className) == "string" and type(op.name) == "string" then
					local node = { className = op.className, name = op.name, parent = op.parent, source = op.source, properties = op.properties }
					createNodeUnder(node, op.parent, instancesByPath, results)
				else
					table.insert(results, operationResult(false, opName, op.path, err, nil))
				end
			elseif target:IsA("Script") or target:IsA("LocalScript") or target:IsA("ModuleScript") then
				local sourceOk, sourceErr = setScriptSource(target, op.source)
				if sourceOk then
					table.insert(results, operationResult(true, opName, op.path, "source updated", target))
				else
					table.insert(results, operationResult(false, opName, op.path, "source update failed: " .. tostring(sourceErr), target))
				end
			else
				table.insert(results, operationResult(false, opName, op.path, "target is not a script", target))
			end
		else
			table.insert(results, operationResult(false, tostring(opName), op.path, "unsupported operation", nil))
		end
	end

	if payload.instances then
		applyInsert({ instances = payload.instances })
		table.insert(results, operationResult(true, "legacyInstances", nil, "legacy instances applied", nil))
	end

	local snapshot = nil
	local ok, dumped = pcall(DataModelDump.dump)
	if ok then snapshot = dumped end
	return { results = results, snapshot = snapshot }
end

local appliedInsertIds = {}
local appliedInsertOrder = {}
local MAX_APPLIED_INSERT_IDS = 200

local function loadAppliedInsertIds()
	local ok, stored = pcall(function()
		return plugin:GetSetting(APPLIED_INSERT_IDS_SETTING)
	end)
	if ok and type(stored) == "table" then
		for _, id in ipairs(stored) do
			if not appliedInsertIds[id] then
				appliedInsertIds[id] = true
				table.insert(appliedInsertOrder, id)
			end
		end
	end
end

local function rememberAppliedInsertId(id)
	if appliedInsertIds[id] then
		return
	end

	appliedInsertIds[id] = true
	table.insert(appliedInsertOrder, id)

	while #appliedInsertOrder > MAX_APPLIED_INSERT_IDS do
		local oldest = table.remove(appliedInsertOrder, 1)
		appliedInsertIds[oldest] = nil
	end

	local ok, err = pcall(function()
		plugin:SetSetting(APPLIED_INSERT_IDS_SETTING, appliedInsertOrder)
	end)
	if not ok then
		warn("failed to persist applied insert ids: " .. tostring(err))
	end
end

local insertPollRunning = false

local function startInsertPolling()
	if insertPollRunning then return end
	insertPollRunning = true

	task.spawn(function()
		while insertPollRunning do
			local apiKey = plugin:GetSetting(SETTING_KEY)
			if apiKey and currentProjectId then
				local data, err = request("POST", "/insert/pending", { projectId = currentProjectId }, apiKey)
				if data and data.inserts then
					for _, item in ipairs(data.inserts) do
						if appliedInsertIds[item.id] then
							log("insert " .. tostring(item.id) .. " already applied locally, re-acking only")
							local _, ackErr = request("POST", "/insert/ack", { insertId = item.id }, apiKey)
							if ackErr then
								warn("failed to re-ack already-applied insert " .. tostring(item.id) .. ": " .. tostring(ackErr))
							end
						else
							local applyOk, applyErr = pcall(applyStudioOperations, item.payload)
							if applyOk then
								log("applied insert " .. tostring(item.id))
								rememberAppliedInsertId(item.id)
								if applyErr and applyErr.snapshot then
									local _, contextErr = request("POST", "/context", { projectId = currentProjectId, snapshot = applyErr.snapshot }, apiKey)
									if contextErr then
										warn("failed to sync post-apply snapshot: " .. tostring(contextErr))
									end
								end
								local _, ackErr = request("POST", "/insert/ack", { insertId = item.id, result = applyErr }, apiKey)
								if ackErr then
									warn("failed to ack insert " .. tostring(item.id) .. ": " .. tostring(ackErr))
								end
							else
								warn("failed to apply insert " .. tostring(item.id) .. ": " .. tostring(applyErr))
							end
						end
					end
				elseif err then
					warn("insert poll failed: " .. tostring(err))
				end
			end
			task.wait(4)
		end
	end)
end

local function stopInsertPolling()
	insertPollRunning = false
end

local function loadRecentProject(apiKey)
	log("fetching most recent active project")
	refreshButton.Active = false
	local previousText = projectLabel.Text
	projectLabel.Text = "Refreshing..."

	local data, err = request("GET", "/projects/recent", nil, apiKey)
	refreshButton.Active = true

	if not data then
		warn("failed to fetch recent project: " .. tostring(err))
		projectLabel.Text = previousText ~= "" and previousText or ""
		return
	end

	if not data.project then
		log("no recent project found for this user")
		projectLabel.Text = "No projects yet"
		return
	end

	log("most recent project: " .. tostring(data.project.name) .. " (" .. tostring(data.project.id) .. ")")
	projectLabel.Text = data.project.name

	local isNewProject = currentProjectId ~= data.project.id
	currentProjectId = data.project.id
	startHeartbeat()
	startInsertPolling()
	startContextSync()

	if isNewProject then
		log("active project changed, clearing local applied-insert dedupe cache")
	end
end

local function pollAuth(sessionId)
	log("starting poll for session: " .. sessionId)

	for attempt = 1, 60 do
		task.wait(5)
		if not isPolling then
			log("poll cancelled")
			return nil, "cancelled"
		end

		log("poll attempt " .. tostring(attempt))
		local data, err = request("POST", "/auth/poll", { sessionId = sessionId })
		if data then
			log("poll attempt " .. tostring(attempt) .. " status: " .. tostring(data.status))
			if data.status == "confirmed" then
				log("session confirmed")
				return data.apiKey, nil
			elseif data.status == "expired" then
				warn("session expired")
				return nil, "expired"
			end
		elseif err then
			warn("Galaxium AI poll error: " .. tostring(err))
		end
	end

	warn("poll timed out")
	return nil, "timeout"
end

local function beginSignIn()
	log("beginSignIn called")
	statusLabel.Text = "Starting sign-in..."
	codeLabel.Text = ""
	codeLabel.Visible = false
	loginButton.Active = false

	local session, err = request("POST", "/auth/start", nil)
	loginButton.Active = true

	if not session then
		warn("failed to start sign-in: " .. tostring(err))
		statusLabel.Text = "Couldn't reach Galaxium — " .. tostring(err)
		return
	end

	print("https://galaxium.lol/connect/" .. session.sessionId)

	codeLabel.Text = "galaxium.lol/connect/" .. session.sessionId
	codeLabel.Visible = true
	statusLabel.Text = "Waiting for confirmation..."
	isPolling = true

	task.spawn(function()
		local apiKey, pollErr = pollAuth(session.sessionId)
		isPolling = false

		if apiKey then
			log("sign-in complete, storing api key")
			plugin:SetSetting(SETTING_KEY, apiKey)
			statusLabel.Text = ""
			codeLabel.Text = ""
			codeLabel.Visible = false
			setSignedInUI(true)
			loadRecentProject(apiKey)
		else
			warn("sign-in did not complete: " .. tostring(pollErr))
			if pollErr == "expired" then
				statusLabel.Text = "Link expired — try again"
			elseif pollErr == "cancelled" then
				statusLabel.Text = ""
			else
				statusLabel.Text = "Timed out — try again"
			end
			codeLabel.Text = ""
			codeLabel.Visible = false
		end
	end)
end

local function signOut()
	log("signing out")
	isPolling = false
	stopHeartbeat()
	stopInsertPolling()
	stopContextSync()
	currentProjectId = nil
	plugin:SetSetting(SETTING_KEY, nil)
	statusLabel.Text = ""
	codeLabel.Text = ""
	codeLabel.Visible = false
	projectLabel.Text = ""
	setSignedInUI(false)
end

loginButton.MouseButton1Click:Connect(beginSignIn)
signOutButton.MouseButton1Click:Connect(signOut)
refreshButton.MouseButton1Click:Connect(function()
	local apiKey = plugin:GetSetting(SETTING_KEY)
	if apiKey then
		loadRecentProject(apiKey)
	end
end)

loadAppliedInsertIds()

local existingKey = plugin:GetSetting(SETTING_KEY)
if existingKey then
	log("found existing api key, signed in on load")
	setSignedInUI(true)
	loadRecentProject(existingKey)
else
	log("no existing api key, signed out on load")
	setSignedInUI(false)
end
