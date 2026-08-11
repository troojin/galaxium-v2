local HttpService = game:GetService("HttpService")

local API_BASE = "https://galaxium.lol/api/plugin"
local SETTING_KEY = "galaxiumApiKey"

local DEBUG = false

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

log("widget created")

toggleButton.Click:Connect(function()
	widget.Enabled = not widget.Enabled
	log("toggle clicked, widget enabled: " .. tostring(widget.Enabled))
end)

local root = Instance.new("Frame")
root.Name = "Root"
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = Color3.fromRGB(30, 30, 34)
root.BorderSizePixel = 0
root.Parent = widget

local layout = Instance.new("UIListLayout")
layout.FillDirection = Enum.FillDirection.Vertical
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.VerticalAlignment = Enum.VerticalAlignment.Center
layout.Padding = UDim.new(0, 12)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = root

local padding = Instance.new("UIPadding")
padding.PaddingLeft = UDim.new(0, 20)
padding.PaddingRight = UDim.new(0, 20)
padding.Parent = root

local signedOutFrame = Instance.new("Frame")
signedOutFrame.Name = "SignedOut"
signedOutFrame.Size = UDim2.new(1, 0, 0, 160)
signedOutFrame.BackgroundTransparency = 1
signedOutFrame.LayoutOrder = 1
signedOutFrame.Parent = root

local signedOutLayout = Instance.new("UIListLayout")
signedOutLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
signedOutLayout.Padding = UDim.new(0, 10)
signedOutLayout.SortOrder = Enum.SortOrder.LayoutOrder
signedOutLayout.Parent = signedOutFrame

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1, 0, 0, 24)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "Galaxium AI"
titleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextSize = 18
titleLabel.LayoutOrder = 1
titleLabel.Parent = signedOutFrame

local loginButton = Instance.new("TextButton")
loginButton.Size = UDim2.new(1, 0, 0, 36)
loginButton.BackgroundColor3 = Color3.fromRGB(88, 101, 242)
loginButton.Text = "Log into Galaxium"
loginButton.TextColor3 = Color3.fromRGB(255, 255, 255)
loginButton.Font = Enum.Font.GothamMedium
loginButton.TextSize = 14
loginButton.AutoButtonColor = true
loginButton.LayoutOrder = 2
loginButton.Parent = signedOutFrame

local loginCorner = Instance.new("UICorner")
loginCorner.CornerRadius = UDim.new(0, 6)
loginCorner.Parent = loginButton

local codeLabel = Instance.new("TextLabel")
codeLabel.Size = UDim2.new(1, 0, 0, 40)
codeLabel.BackgroundTransparency = 1
codeLabel.Text = ""
codeLabel.TextWrapped = true
codeLabel.TextColor3 = Color3.fromRGB(200, 200, 205)
codeLabel.Font = Enum.Font.Gotham
codeLabel.TextSize = 13
codeLabel.LayoutOrder = 3
codeLabel.Parent = signedOutFrame

local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1, 0, 0, 20)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = ""
statusLabel.TextColor3 = Color3.fromRGB(150, 150, 155)
statusLabel.Font = Enum.Font.Gotham
statusLabel.TextSize = 12
statusLabel.LayoutOrder = 4
statusLabel.Parent = signedOutFrame

local signedInFrame = Instance.new("Frame")
signedInFrame.Name = "SignedIn"
signedInFrame.Size = UDim2.new(1, 0, 0, 100)
signedInFrame.BackgroundTransparency = 1
signedInFrame.Visible = false
signedInFrame.LayoutOrder = 2
signedInFrame.Parent = root

local signedInLayout = Instance.new("UIListLayout")
signedInLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
signedInLayout.Padding = UDim.new(0, 10)
signedInLayout.SortOrder = Enum.SortOrder.LayoutOrder
signedInLayout.Parent = signedInFrame

local connectedLabel = Instance.new("TextLabel")
connectedLabel.Size = UDim2.new(1, 0, 0, 20)
connectedLabel.BackgroundTransparency = 1
connectedLabel.Text = "Connected to Galaxium ✓"
connectedLabel.TextColor3 = Color3.fromRGB(120, 220, 150)
connectedLabel.Font = Enum.Font.GothamMedium
connectedLabel.TextSize = 14
connectedLabel.LayoutOrder = 1
connectedLabel.Parent = signedInFrame

local signOutButton = Instance.new("TextButton")
signOutButton.Size = UDim2.new(1, 0, 0, 30)
signOutButton.BackgroundColor3 = Color3.fromRGB(50, 50, 56)
signOutButton.Text = "Sign out"
signOutButton.TextColor3 = Color3.fromRGB(220, 220, 225)
signOutButton.Font = Enum.Font.Gotham
signOutButton.TextSize = 13
signOutButton.LayoutOrder = 2
signOutButton.Parent = signedInFrame

local signOutCorner = Instance.new("UICorner")
signOutCorner.CornerRadius = UDim.new(0, 6)
signOutCorner.Parent = signOutButton

local isPolling = false

local function setSignedInUI(isSignedIn)
	signedOutFrame.Visible = not isSignedIn
	signedInFrame.Visible = isSignedIn
end

local function request(method, path, body)
	log("request: " .. method .. " " .. path)

	local ok, res = pcall(function()
		return HttpService:RequestAsync({
			Url = API_BASE .. path,
			Method = method,
			Headers = { ["Content-Type"] = "application/json" },
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
	loginButton.Active = false

	local session, err = request("POST", "/auth/start", nil)
	loginButton.Active = true

	if not session then
		warn("failed to start sign-in: " .. tostring(err))
		statusLabel.Text = "Couldn't reach Galaxium — " .. tostring(err)
		return
	end

	print("Connect: https://galaxium.lol/connect/" .. session.sessionId)

	codeLabel.Text = string.format("Open this link to connect:\ngalaxium.lol/connect/%s", session.sessionId)
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
			setSignedInUI(true)
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
		end
	end)
end

local function signOut()
	log("signing out")
	isPolling = false
	plugin:SetSetting(SETTING_KEY, nil)
	statusLabel.Text = ""
	codeLabel.Text = ""
	setSignedInUI(false)
end

loginButton.MouseButton1Click:Connect(beginSignIn)
signOutButton.MouseButton1Click:Connect(signOut)

local existingKey = plugin:GetSetting(SETTING_KEY)
if existingKey then
	log("found existing api key, signed in on load")
	setSignedInUI(true)
else
	log("no existing api key, signed out on load")
	setSignedInUI(false)
end