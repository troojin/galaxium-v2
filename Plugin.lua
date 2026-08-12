local HttpService = game:GetService("HttpService")

local API_BASE = "https://galaxium.lol/api/plugin"
local SETTING_KEY = "galaxiumApiKey"

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

-- ===== Toolbar / Widget =====

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

-- ===== UI =====

local Root = Instance.new("Frame")
local UIListLayout = Instance.new("UIListLayout")
local UIPadding = Instance.new("UIPadding")
local SignedOut = Instance.new("Frame")
local UIListLayout_2 = Instance.new("UIListLayout")
local TextLabel = Instance.new("TextLabel")
local loginButton = Instance.new("TextButton")
local UICorner = Instance.new("UICorner")
local codeLabel = Instance.new("TextBox")
local UICorner_2 = Instance.new("UICorner")
local UIPadding_2 = Instance.new("UIPadding")
local statusLabel = Instance.new("TextLabel")
local SignedIn = Instance.new("Frame")
local UIListLayout_3 = Instance.new("UIListLayout")
local connectedLabel = Instance.new("TextLabel")
local projectLabel = Instance.new("TextLabel")
local signOutButton = Instance.new("TextButton")
local UICorner_3 = Instance.new("UICorner")

Root.Name = "Root"
Root.Parent = widget
Root.BackgroundColor3 = Color3.fromRGB(30, 30, 34)
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
TextLabel.TextSize = 18.000

loginButton.Parent = SignedOut
loginButton.BackgroundColor3 = Color3.fromRGB(88, 101, 242)
loginButton.LayoutOrder = 2
loginButton.Position = UDim2.new(0.474362642, 0, 0.212500006, 0)
loginButton.Size = UDim2.new(0.18016991, 0, 0, 28)
loginButton.Font = Enum.Font.GothamMedium
loginButton.Text = "Log into Galaxium"
loginButton.TextColor3 = Color3.fromRGB(255, 255, 255)
loginButton.TextSize = 12.000
loginButton.TextWrapped = true
loginButton.AutoButtonColor = true

UICorner.CornerRadius = UDim.new(0, 6)
UICorner.Parent = loginButton

codeLabel.Parent = SignedOut
codeLabel.BackgroundColor3 = Color3.fromRGB(45, 45, 50)
codeLabel.LayoutOrder = 3
codeLabel.Position = UDim2.new(0, 0, 0.449999988, 0)
codeLabel.Size = UDim2.new(0.22379604, 0, 0, 36)
codeLabel.ClearTextOnFocus = false
codeLabel.Font = Enum.Font.Gotham
codeLabel.Text = ""
codeLabel.TextColor3 = Color3.fromRGB(200, 200, 205)
codeLabel.TextSize = 13.000
codeLabel.TextWrapped = true
codeLabel.TextEditable = false
codeLabel.Visible = false

UICorner_2.CornerRadius = UDim.new(0, 6)
UICorner_2.Parent = codeLabel

UIPadding_2.Parent = codeLabel
UIPadding_2.PaddingLeft = UDim.new(0, 8)
UIPadding_2.PaddingRight = UDim.new(0, 8)

statusLabel.Parent = SignedOut
statusLabel.BackgroundTransparency = 1.000
statusLabel.LayoutOrder = 4
statusLabel.Size = UDim2.new(1, 0, 0, 20)
statusLabel.Font = Enum.Font.Gotham
statusLabel.Text = ""
statusLabel.TextColor3 = Color3.fromRGB(150, 150, 155)
statusLabel.TextSize = 12.000

SignedIn.Name = "SignedIn"
SignedIn.Parent = Root
SignedIn.BackgroundTransparency = 1.000
SignedIn.LayoutOrder = 2
SignedIn.Size = UDim2.new(1, 0, 0, 118)
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
connectedLabel.Text = "Connected to Galaxium ✓"
connectedLabel.TextColor3 = Color3.fromRGB(120, 220, 150)
connectedLabel.TextSize = 14.000

projectLabel.Parent = SignedIn
projectLabel.BackgroundTransparency = 1.000
projectLabel.LayoutOrder = 2
projectLabel.Size = UDim2.new(1, 0, 0, 18)
projectLabel.Font = Enum.Font.Gotham
projectLabel.Text = ""
projectLabel.TextColor3 = Color3.fromRGB(170, 170, 178)
projectLabel.TextSize = 12.000
projectLabel.TextTruncate = Enum.TextTruncate.AtEnd

signOutButton.Parent = SignedIn
signOutButton.BackgroundColor3 = Color3.fromRGB(50, 50, 56)
signOutButton.LayoutOrder = 3
signOutButton.Size = UDim2.new(1, 0, 0, 30)
signOutButton.Font = Enum.Font.Gotham
signOutButton.Text = "Sign out"
signOutButton.TextColor3 = Color3.fromRGB(220, 220, 225)
signOutButton.TextSize = 13.000

UICorner_3.CornerRadius = UDim.new(0, 6)
UICorner_3.Parent = signOutButton

-- ===== State =====

local isPolling = false

local function setSignedInUI(isSignedIn)
	SignedOut.Visible = not isSignedIn
	SignedIn.Visible = isSignedIn
end

-- ===== HTTP helper =====

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

-- ===== Presence heartbeat =====

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

-- ===== Recent project auto-detect =====

local function loadRecentProject(apiKey)
	log("fetching most recent active project")
	local data, err = request("GET", "/projects/recent", nil, apiKey)

	if not data then
		warn("failed to fetch recent project: " .. tostring(err))
		projectLabel.Text = ""
		return
	end

	if not data.project then
		log("no recent project found for this user")
		projectLabel.Text = "No projects yet"
		return
	end

	log("most recent project: " .. tostring(data.project.name) .. " (" .. tostring(data.project.id) .. ")")
	projectLabel.Text = data.project.name

	currentProjectId = data.project.id
	startHeartbeat()

	-- TODO: wire this into whatever loads the chat/project view,
	-- e.g. openProject(data.project.id, data.project.name)
end

-- ===== Auth flow =====

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

-- ===== Init =====

local existingKey = plugin:GetSetting(SETTING_KEY)
if existingKey then
	log("found existing api key, signed in on load")
	setSignedInUI(true)
	loadRecentProject(existingKey)
else
	log("no existing api key, signed out on load")
	setSignedInUI(false)
end