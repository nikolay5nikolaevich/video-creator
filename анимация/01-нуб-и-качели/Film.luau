-- «Нуб и качели»: сцена и покадровая анимация. Film.apply(S, t) выставляет всё на момент t (сек).
local Film = {}
local Rig = require(game.ReplicatedStorage.Rig:Clone())
local Lighting = game:GetService("Lighting")

Film.DURATION = 24.8

-- ключевые моменты
local T_SIT = 1.55
local PRO_IN, PRO_STOP = 1.7, 2.6
local T_PJUMP, T1, T1L = 4.2, 4.6, 5.4 -- Про прыгает, удар, нуб приземляется
local BUFF_IN, BUFF_STOP = 6.2, 7.5
local T_FLICK, T_BCROUCH, T_BJUMP, T2 = 8.3, 8.7, 8.9, 9.6
local CLOUD0, SPACE0, MOON0, T3 = 10.4, 11.4, 13.4, 14.0 -- T3: падение на Луну
local T_PULL, T_GO, T_AJUMP, T4 = 15.1, 18.2, 19.2, 20.2 -- T4: пришелец запускает нуба
local RET0, EARTH2, T5 = 21.0, 22.2, 23.0 -- T5: нуб падает на качели

local V, CF, ANG = Vector3.new, CFrame.new, CFrame.Angles
local sin, cos, exp, abs, rad, pi = math.sin, math.cos, math.exp, math.abs, math.rad, math.pi
local C = Color3.fromRGB
local L = CFrame.lookAt

local TILT = rad(13)
local PIVOT = V(0, 1.6, 0)
local MO = V(0, 20000, 0) -- поверхность Луны
local MPIVOT = MO + V(-5, 1.6, 0)
local FS = MO + V(330, 150, 0) -- сцена полёта в космосе
local CRASH = MO + V(8, 0, 0)
local BUFF_X = 9.6

local function seg(t, a, b) return math.clamp((t - a) / (b - a), 0, 1) end
local function smooth(x) return x * x * (3 - 2 * x) end
local function outQuad(x) return 1 - (1 - x) ^ 2 end
local function outBack(x) return 1 + 2.7 * (x - 1) ^ 3 + 1.7 * (x - 1) ^ 2 end
local function lerp(a, b, t) return a + (b - a) * t end
local function pulse(t, a, b, fade) -- 0→1→0 на отрезке [a, b]
	fade = fade or 0.12
	return smooth(seg(t, a, a + fade)) * (1 - smooth(seg(t, b - fade, b)))
end

local function part(parent, size, cf, color, extra)
	local p = Instance.new("Part")
	p.Anchored, p.CanCollide, p.Size, p.CFrame, p.Color = true, false, size, cf, color
	p.Material = Enum.Material.SmoothPlastic
	p.TopSurface, p.BottomSurface = Enum.SurfaceType.Smooth, Enum.SurfaceType.Smooth
	for k, v in pairs(extra or {}) do p[k] = v end
	p.Parent = parent
	return p
end
local BALL = Enum.PartType.Ball

local function makeBubble(rig)
	local bb = Instance.new("BillboardGui")
	bb.Name, bb.Adornee, bb.AlwaysOnTop, bb.LightInfluence, bb.Enabled = "Bubble", rig.parts.Head, true, 0, false
	bb.Size = UDim2.fromScale(3.4 * rig.k, 3.4 * rig.k)
	bb.StudsOffset = V(2.6 * rig.k, 0, 0) -- камера повёрнута набок: «вверх» в кадре — это её ось X
	local holder = Instance.new("Frame")
	holder.Size, holder.BackgroundTransparency, holder.Rotation = UDim2.fromScale(1, 1), 1, 90
	holder.Parent = bb
	local scale = Instance.new("UIScale"); scale.Parent = holder
	local tail = Instance.new("Frame")
	tail.AnchorPoint, tail.Position, tail.Size = Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.76), UDim2.fromScale(0.2, 0.2)
	tail.Rotation, tail.BackgroundColor3, tail.BorderSizePixel = 45, Color3.new(1, 1, 1), 0
	tail.Parent = holder
	local body = Instance.new("Frame")
	body.Size, body.BackgroundColor3, body.BorderSizePixel = UDim2.fromScale(1, 0.78), Color3.new(1, 1, 1), 0
	body.Parent = holder
	local corner = Instance.new("UICorner"); corner.CornerRadius = UDim.new(0.3, 0); corner.Parent = body
	local label = Instance.new("TextLabel")
	label.Size, label.Position, label.BackgroundTransparency = UDim2.fromScale(0.8, 0.8), UDim2.fromScale(0.1, 0.1), 1
	label.TextScaled, label.Font, label.TextColor3 = true, Enum.Font.GothamBold, Color3.new(0.1, 0.1, 0.1)
	label.Parent = body
	bb.Parent = rig.parts.Head
	return {gui = bb, scale = scale, label = label}
end

local function bubbleTrack(b, events, t)
	for _, e in ipairs(events) do
		if t >= e[1] and t < e[2] then
			b.gui.Enabled = true
			b.label.Text = e[3]
			b.scale.Scale = math.max(0.01, outBack(seg(t, e[1], e[1] + 0.16)) * (1 - seg(t, e[2] - 0.07, e[2])))
			return
		end
	end
	b.gui.Enabled = false
end

local function earthBall(root)
	local e = {sea = part(root, V(1, 1, 1), CF(), C(40, 110, 220), {Shape = BALL, CastShadow = false}), land = {}}
	for i = 1, 6 do e.land[i] = part(root, V(1, 1, 1), CF(), C(70, 170, 80), {Shape = BALL, CastShadow = false}) end
	return e
end
local LAND = {V(0.2, 0.3, 1), V(-0.6, 0.1, 0.8), V(0.5, -0.4, 0.75), V(-0.2, -0.6, 0.75), V(0.7, 0.4, 0.55), V(-0.5, 0.6, 0.6)}
local function setEarth(e, pos, size)
	e.sea.Size, e.sea.CFrame = V(size, size, size), CF(pos)
	for i, l in ipairs(e.land) do
		local s = size * (0.3 + (i % 3) * 0.07)
		l.Size, l.CFrame = V(s, s, s), CF(pos + LAND[i].Unit * size * 0.38)
	end
end

local function seesaw(root, pivot, plankColor, seatColor, list)
	part(root, V(2.2, 1.5, 2.6), CF(pivot - V(0, 0.85, 0)), C(99, 95, 98))
	part(root, V(2.8, 0.5, 0.5), CF(pivot - V(0, 0.1, 0)) * ANG(0, rad(90), 0), C(60, 60, 64), {Shape = Enum.PartType.Cylinder})
	local function add(size, offset, color, mat)
		table.insert(list, {part = part(root, size, CF(), color, mat and {Material = mat} or nil), offset = offset})
	end
	add(V(14, 0.4, 2.4), CF(), plankColor, Enum.Material.WoodPlanks)
	for _, side in ipairs({-1, 1}) do
		add(V(1.8, 0.14, 2.2), CF(side * 6, 0.27, 0), seatColor)
		add(V(0.25, 1.1, 0.25), CF(side * 4.5, 0.75, 0), C(60, 60, 64))
		add(V(0.25, 0.25, 1.7), CF(side * 4.5, 1.3, 0), C(60, 60, 64))
	end
end

function Film.build()
	local old = workspace:FindFirstChild("Film"); if old then old:Destroy() end
	local root = Instance.new("Folder"); root.Name = "Film"; root.Parent = workspace
	local S = {root = root, plank = {}, mplank = {}, dust = {}, streaks = {}, fire = {}, smoke = {}, twinkle = {}}

	-- Земля
	part(root, V(800, 2, 800), CF(0, -1, 0), C(96, 176, 82))
	for _, h in ipairs({{-60, -120, 150}, {50, -150, 190}, {140, -110, 130}, {-150, -160, 170}}) do
		part(root, V(h[3], h[3], h[3]), CF(h[1], -h[3] * 0.32, h[2]), C(82, 160, 74), {Shape = BALL})
	end
	for _, tr in ipairs({{-16, -14, 1}, {-7, -26, 1.3}, {9, -18, 1.1}, {19, -30, 1.4}, {-27, -34, 1.2}, {30, -16, 0.9}, {2, -44, 1.5}}) do
		local x, z, k = tr[1], tr[2], tr[3]
		part(root, V(1.6, 7, 1.6) * k, CF(x, 3.5 * k, z), C(124, 92, 70))
		part(root, V(7, 5, 7) * k, CF(x, 8.5 * k, z), C(58, 140, 62))
		part(root, V(4.6, 3, 4.6) * k, CF(x, 12.2 * k, z), C(70, 156, 70))
	end
	part(root, V(12, 8, 10), CF(-20, 4, -24), C(240, 226, 196))
	part(root, V(14, 1.2, 12), CF(-20, 8.6, -24), C(190, 60, 50))
	part(root, V(9, 1.6, 12), CF(-20, 10, -24), C(190, 60, 50))
	part(root, V(4, 1.6, 12), CF(-20, 11.6, -24), C(190, 60, 50))
	part(root, V(2.4, 4.4, 0.4), CF(-20, 2.2, -18.9), C(124, 92, 70))
	local function cloud(x, y, z, k)
		for i = 1, 3 do
			part(root, V(16 - i * 3, 5, 9) * k, CF(x + (i - 2) * 7 * k, y + (i % 2) * 2 * k, z), C(255, 255, 255), {CastShadow = false})
		end
	end
	for _, c in ipairs({{-30, 46, -90}, {14, 58, -120}, {40, 40, -80}, {-8, 74, -140}, {26, 86, -150}, {-36, 96, -130}}) do cloud(c[1], c[2], c[3], 1) end
	for i = 1, 16 do -- облака на пути взлёта
		local front = i % 4 == 0
		cloud(-5.8 + ((i * 37) % 30 - 15), 66 + i * 12, front and (4 + i % 3 * 2) or (-6 - (i * 17) % 22), front and 0.35 or 0.7)
	end
	seesaw(root, PIVOT, C(176, 124, 70), C(196, 40, 28), S.plank)

	-- космос: чёрный короб, звёзды, Луна
	local bc, hx, hy, hz = MO + V(125, 120, 0), 650, 560, 520
	local black = {CastShadow = false}
	part(root, V(hx * 2, 10, hz * 2), CF(bc + V(0, hy, 0)), C(0, 0, 0), black)
	part(root, V(hx * 2, 10, hz * 2), CF(bc - V(0, hy, 0)), C(0, 0, 0), black)
	part(root, V(10, hy * 2, hz * 2), CF(bc + V(hx, 0, 0)), C(0, 0, 0), black)
	part(root, V(10, hy * 2, hz * 2), CF(bc - V(hx, 0, 0)), C(0, 0, 0), black)
	part(root, V(hx * 2, hy * 2, 10), CF(bc + V(0, 0, hz)), C(0, 0, 0), black)
	part(root, V(hx * 2, hy * 2, 10), CF(bc - V(0, 0, hz)), C(0, 0, 0), black)
	local rng = Random.new(11)
	for _ = 1, 240 do
		local s = rng:NextNumber(0.9, 2.6)
		part(root, V(s, s, s), CF(bc + V(rng:NextNumber(-620, 620), rng:NextNumber(-260, 540), rng:NextNumber(-500, -440))),
			C(255, 255, 255), {Shape = BALL, Material = Enum.Material.Neon, CastShadow = false})
	end
	part(root, V(600, 600, 600), CF(MO - V(0, 304, 0)), C(92, 92, 100), {Shape = BALL})
	part(root, V(6, 190, 190), CF(MO - V(0, 3, 0)) * ANG(0, 0, pi / 2), C(98, 98, 106), {Shape = Enum.PartType.Cylinder})
	for _, cr in ipairs({{-20, -14, 9}, {17, -22, 13}, {-3, -34, 7}, {26, -6, 6}, {-30, 4, 8}, {4, 9, 4}, {-17, 12, 5}}) do
				part(root, V(0.5, cr[3], cr[3]), CF(MO + V(cr[1], 0.05, cr[2])) * ANG(0, 0, pi / 2), C(92, 92, 100), {Shape = Enum.PartType.Cylinder, CastShadow = false})
	end
	for _, rk in ipairs({{14, -9, 2.2}, {-19, -6, 3}, {22, -30, 4}, {-9, -20, 1.6}, {-24, -26, 2.6}, {12, 6, 1.2}}) do
		part(root, V(rk[3], rk[3] * 0.8, rk[3] * 1.2), CF(MO + V(rk[1], rk[3] * 0.25, rk[2])) * ANG(0.3, rk[1], 0.2), C(128, 128, 134))
	end
	S.crater = part(root, V(0.6, 6, 6), CF(CRASH + V(0, 0.05, 0)) * ANG(0, 0, pi / 2), C(76, 76, 84), {Shape = Enum.PartType.Cylinder, CastShadow = false, Transparency = 1})
	seesaw(root, MPIVOT, C(170, 172, 184), C(120, 220, 90), S.mplank)
	S.skyEarth = earthBall(root); setEarth(S.skyEarth, MO + V(60, 150, -380), 60)
	S.flyEarth, S.flyMoon = earthBall(root), part(root, V(1, 1, 1), CF(), C(170, 170, 176), {Shape = BALL, CastShadow = false})

	for i = 1, 10 do S.dust[i] = part(root, V(1, 1, 1), CF(0, -50, 0), C(235, 228, 210), {Shape = BALL, CastShadow = false, Transparency = 1}) end
	for i = 1, 70 do S.streaks[i] = part(root, V(0.16, 5, 0.16), CF(0, -50, 0), C(255, 255, 255), {Material = Enum.Material.Neon, CastShadow = false}) end
	for i = 1, 10 do S.fire[i] = part(root, V(1, 1, 1), CF(0, -50, 0), C(255, 170, 40), {Shape = BALL, Material = Enum.Material.Neon, CastShadow = false, Transparency = 1}) end
	for i = 1, 4 do S.smoke[i] = part(root, V(1, 1, 1), CF(0, -50, 0), C(70, 70, 74), {Shape = BALL, CastShadow = false, Transparency = 1}) end
	for i = 1, 2 do S.twinkle[i] = part(root, V(1, 1, 1), CF(0, -50, 0), C(255, 255, 255), {Shape = BALL, Material = Enum.Material.Neon, CastShadow = false, Transparency = 1}) end

	S.bubble = {}
	for _, name in ipairs({"Noob", "Pro", "Buff", "Alien"}) do
		local r = Rig.new(Rig.CAST[name])
		r.model.Parent = root
		S[string.lower(name)] = r
		S.bubble[string.lower(name)] = makeBubble(r)
	end
	S.cc = Lighting:FindFirstChild("FilmCC") or Instance.new("ColorCorrectionEffect")
	S.cc.Name, S.cc.Saturation, S.cc.Contrast, S.cc.Parent = "FilmCC", 0.2, 0.08, Lighting
	S.atm = Lighting:FindFirstChildOfClass("Atmosphere")
	return S
end

-- угол доски: плюс — правый конец вверху; flips = {{момент, новый знак}}
local function flipAngle(t, start, flips)
	local cur, a = start, start * TILT
	for _, f in ipairs(flips) do
		if t >= f[1] then
			local u = t - f[1]
			a = lerp(cur, f[2], outQuad(seg(u, 0, 0.07))) * TILT
			if u > 0.07 then a -= f[2] * rad(3) * exp(-(u - 0.07) * 8) * abs(sin((u - 0.07) * 20)) end
			cur = f[2]
		end
	end
	return a
end

local function onPlank(pivot, a, lx, ly)
	return pivot + V(cos(a) * lx - sin(a) * ly, sin(a) * lx + cos(a) * ly, 0)
end
local function seatHip(pivot, a, side) return onPlank(pivot, a, side * 6, 0.84) end
local function seatTop(pivot, a, side) return onPlank(pivot, a, side * 6, 0.34) end

local function yawCF(pos, yaw) return CF(pos) * ANG(0, rad(yaw), 0) end -- yaw: -90 лицом вправо, 90 влево, 180 на камеру
local function atHip(rig, cf, pose)
	Rig.pose(rig, cf * CF(0, (-2 * (pose.stretch or 1) - (pose.hipY or 0)) * rig.k, 0), pose)
end
local function hide(rig) Rig.pose(rig, CF(0, -300, 0), {}) end
local function P(a, b, u) return Rig.lerpPose(a, b or a, u or 0) end
local function walkAdd(pose, phase, amp)
	local s = sin(phase)
	pose.lLeg[1] += amp * s; pose.rLeg[1] -= amp * s
	pose.lArm[1] -= amp * s; pose.rArm[1] += amp * s
	pose.hipY += 0.14 * abs(cos(phase))
end
local function sq(t, t0, amp, decay, freq) -- сплющивание после удара
	if t < t0 then return 1 end
	local u = t - t0
	return 1 - amp * exp(-u * (decay or 11)) * cos(u * (freq or 26))
end

local STAND = {lArm = {0, 0, -8}, rArm = {0, 0, 8}}
local SIT = {lLeg = {86, 0, -8}, rLeg = {86, 0, 8}, lArm = {38, 0, -10}, rArm = {38, 0, 10}, torso = {-4, 0, 0}}
local SIT_SMUG = {lLeg = {86, 0, -8}, rLeg = {86, 0, 8}, lArm = {-20, 0, -38}, rArm = {-20, 0, 38}, torso = {12, 0, 0}}
local HOP = {lLeg = {40, 0, 0}, rLeg = {-25, 0, 0}, lArm = {150, 0, -20}, rArm = {150, 0, 20}, torso = {-8, 0, 0}}
local FLY = {lLeg = {-18, 0, -20}, rLeg = {16, 0, 20}, lArm = {20, 0, -150}, rArm = {20, 0, 150}}
local AKIMBO = {lArm = {-10, 0, -34}, rArm = {-10, 0, 34}, torso = {8, 0, 0}}
local CROUCH = {lLeg = {50, 0, -10}, rLeg = {50, 0, 10}, lArm = {30, 0, -40}, rArm = {30, 0, 40}, torso = {-30, 0, 0}, hipY = -0.9}
local SUPER = {lArm = {172, 0, -8}, rArm = {172, 0, 8}, lLeg = {-6, 0, -4}, rLeg = {6, 0, 4}}
local COWER = {lArm = {130, 0, 18}, rArm = {130, 0, -18}, torso = {-10, 0, 0}, lLeg = {10, 0, -6}, rLeg = {10, 0, 6}, hipY = -0.25}

local function faceTrack(rig, track, t)
	local idx = 1
	for i, key in ipairs(track) do if t >= key[1] then idx = i end end
	local key, prev = track[idx], track[math.max(idx - 1, 1)]
	local u = key[3] and key[3] > 0 and seg(t, key[1], key[1] + key[3]) or 1
	if u >= 1 or idx == 1 then Rig.face(rig, key[2]) else Rig.face(rig, prev[2], key[2], smooth(u)) end
end

local LOOK_SIDE = {eyeW = 44, eyeH = 52, white = 1, pupil = 18, pupilX = 0.8, pupilY = -0.25, brow = 1, browRot = -12, browY = 36, openW = 24, openH = 18, mouthY = 158}
local DIZZY = {eyeW = 42, eyeH = 42, white = 1, pupil = 8, pupilX = -0.5, pupilY = 0.5, brow = 1, browRot = -16, browY = 40, smileD = 64, smileH = -20, mouthY = 160}
local NOOB_FACE = {{0, "smile"}, {1.67, "smug", 0.2}, {2.5, LOOK_SIDE, 0.1}, {2.9, "smile", 0.15}, {T1, "scared", 0.05},
	{T1 + 0.2, "scream", 0.12}, {T1L - 0.14, "scared", 0.1}, {T1L + 0.2, "laugh", 0.14}, {6.3, LOOK_SIDE, 0.1},
	{7.0, "scared", 0.2}, {8.95, "lookUp", 0.1}, {T2, "scream", 0.05}, {SPACE0 + 0.9, "lookUp", 0.3}, {MOON0, "scream"},
	{T_PULL, DIZZY}, {15.9, "smile", 0.2}, {16.6, "lookUp", 0.15}, {17.6, "smile", 0.15}, {19.3, "lookUp", 0.15},
	{T4, "scream", 0.05}, {RET0, "smug"}, {RET0 + 0.65, "scared", 0.15}, {EARTH2, "scream"}, {T5 + 0.05, "scared", 0.05}, {T5 + 0.6, "smug", 0.25}}
local PRO_FACE = {{0, "cool"}, {T_PJUMP - 0.3, "coolSmug", 0.12}, {T1 + 0.25, "coolLaugh", 0.12}, {T1L, "coolScared", 0.05},
	{T1L + 0.5, "coolLaugh", 0.15}, {6.4, "coolLookUp", 0.12}, {7.3, "coolScared", 0.2}, {T_FLICK, "coolScream", 0.05}}
local BUFF_FACE = {{0, "angry"}, {7.55, "buffGrin", 0.15}, {T_FLICK - 0.12, "angry", 0.08}, {T_BJUMP, "buffRoar", 0.1},
	{T2 + 0.3, "buffLookUp", 0.15}, {EARTH2, "buffGrin"}, {22.6, "buffLookUp", 0.1}, {22.8, "buffScared", 0.1}, {T5, "buffRoar", 0.05}}
local ALIEN_FACE = {{0, "alien"}, {T3, "alienShock", 0.05}, {14.6, "alienLookUp", 0.2}, {T_PULL, "alienShock", 0.05}, {15.6, "alienHappy", 0.15},
	{16.6, "alien", 0.15}, {17.5, "alienHappy", 0.1}, {17.9, "alienSmug", 0.15}, {T4 + 0.1, "alienHappy", 0.1}}

local BUBBLES = {
	noob = {{3.35, 3.9, "👋"}, {5.6, 6.2, "😂"}, {6.5, 7.1, "❓"}, {8.0, 8.65, "❌"}, {12.5, 13.3, "🌕"}, {16.0, 16.6, "👋"},
		{16.7, 17.5, "🌍❓"}, {18.0, 18.5, "👍"}, {24.0, 24.75, "😎"}},
	pro = {{2.7, 3.3, "👋"}, {3.9, 4.3, "😏"}, {5.75, 6.25, "😂"}, {7.2, 7.9, "😨"}},
	buff = {{7.6, 7.88, "💪"}, {9.95, 10.4, "👀"}, {22.25, 22.65, "💪"}, {22.7, 23.0, "❗"}},
	alien = {{14.5, 15.0, "❓"}, {15.6, 16.3, "👋"}, {17.5, 17.9, "💡"}, {17.9, 18.5, "👈"}, {20.5, 21.0, "👋"}},
}

local function animNoob(S, t, a, ma)
	local rig = S.noob
	local hip, pose
	if t < 1.15 then
		local x = lerp(-13, -8.4, t / 1.15)
		pose = P(STAND); walkAdd(pose, t * 14.5, 34)
		pose.torso[1], pose.head = -6, {0, -38, 0}
		Rig.pose(rig, yawCF(V(x, 0, 0), -90), pose)
		hip = V(x, 2, 0)
	elseif t < T_SIT then
		local u = seg(t, 1.15, T_SIT)
		hip = V(-8.4, 2, 0):Lerp(seatHip(PIVOT, a, -1), u) + V(0, 4 * u * (1 - u) * 2.4, 0)
		pose = P(HOP, SIT, smooth(seg(u, 0.35, 1)))
		pose.head, pose.stretch = {0, -38, 0}, 1 + 0.12 * sin(u * pi)
		atHip(rig, yawCF(hip, -90) * ANG(a * u, 0, 0), pose)
	elseif t < T1 then
		pose = P(SIT, SIT_SMUG, pulse(t, 1.7, 2.65, 0.2))
		local wv = pulse(t, 3.3, 4.0, 0.15)
		pose.head = {0, lerp(-50, -6, smooth(seg(t, 2.5, 2.65))), 0}
		pose.rArm = {lerp(pose.rArm[1], 0, wv), 0, lerp(pose.rArm[3], 150 + sin(t * 22) * 18, wv)}
		pose.stretch = sq(t, T_SIT, 0.26, 12, 28)
		hip = seatHip(PIVOT, a, -1)
		atHip(rig, yawCF(hip, -90) * ANG(a, 0, 0), pose)
	elseif t < T1L then
		local u, F = t - T1, T1L - T1
		local g = 8 * 7 / (F * F)
		hip = seatHip(PIVOT, a, -1) + V(0, math.max(0, g * F / 2 * u - g * u * u / 2), 0)
		local turn = pulse(u, 0.02, F, 0.22)
		pose = P(SIT, FLY, pulse(u, 0, F, 0.15))
		local w = sin(u * 34) * 16
		pose.lArm[3] -= w; pose.rArm[3] -= w
		pose.lLeg[1] += sin(u * 30) * 22; pose.rLeg[1] -= sin(u * 30) * 22
		pose.head, pose.stretch = {lerp(0, -6, turn), lerp(-6, -20, turn), 0}, 1 + 0.3 * exp(-u * 9)
		atHip(rig, yawCF(hip, -90 - 58 * turn) * ANG(a * (1 - turn), 0, sin(u * 11) * 0.14 * turn), pose)
	elseif t < T2 then
		pose = P(SIT)
		local laugh, nono, up = pulse(t, 5.6, 6.3, 0.15), pulse(t, 7.9, 8.75, 0.12), smooth(seg(t, 8.95, 9.15))
		pose.torso[1] += sin(t * 24) * 5 * laugh + 8 * laugh
		pose.lArm = {lerp(38, 85, nono), 0, -10 - nono * (20 + sin(t * 26) * 25)}
		pose.rArm = {lerp(38, 85, nono), 0, 10 + nono * (20 + sin(t * 26) * 25)}
		pose.head = {lerp(sin(t * 24) * 5 * laugh, 32, up), lerp(-30, -8, smooth(seg(t, 6.3, 6.45))) - 34 * up + sin(t * 30) * 18 * nono, 0}
		pose.stretch = sq(t, T1L, 0.34, 10, 26)
		hip = seatHip(PIVOT, a, -1)
		atHip(rig, yawCF(hip, -90) * ANG(a, 0, 0), pose)
	elseif t < CLOUD0 then
		local u = t - T2
		hip = seatHip(PIVOT, -TILT, -1) + V(0, u * 60 + u * u * 900, 0)
		pose = P(FLY); pose.stretch = 1.5
		atHip(rig, yawCF(hip, -90), pose)
	elseif t < SPACE0 then
		local u = t - CLOUD0
		hip = V(-5.8, 60 + 190 * u, 0)
		pose = P(FLY)
		local w = sin(u * 34) * 16
		pose.lArm[3] -= w; pose.rArm[3] -= w
		pose.lLeg[1] += sin(u * 30) * 22; pose.rLeg[1] -= sin(u * 30) * 22
		pose.head, pose.stretch = {-8, -15, 0}, 1.15
		atHip(rig, yawCF(hip, -150) * ANG(sin(u * 8) * 0.15, 0, sin(u * 11) * 0.14), pose)
	elseif t < MOON0 then
		local u = t - SPACE0
		hip = FS + V(sin(u * 2) * 1.2, sin(u * 3.1) * 0.8, 0)
		local calm = smooth(seg(u, 0.7, 1.2))
		pose = P(FLY)
		local w = sin(u * 30) * 14 * (1 - calm)
		pose.lArm[3] -= w; pose.rArm[3] -= w
		pose.head = {20 * calm, 0, 0}
		atHip(rig, CF(hip) * ANG(0, 0, sin(u * 1.8) * 0.8 * (1 - calm * 0.6)) * ANG(0, pi, 0), pose)
	elseif t < T3 then
		local u = T3 - t
		hip = CRASH + V(u * 45, u * 150 + 1.2, 0)
		pose = P(FLY)
		atHip(rig, CF(hip) * ANG(0, 0, t * 20) * ANG(0, pi, 0), pose)
	elseif t < T_PULL then
		hip = CRASH + V(0, 1.0, 0)
		pose = P(STAND)
		local w = sin(t * 22) * 35 * exp(-(t - T3) * 0.6)
		pose.lLeg, pose.rLeg = {w, 0, -14}, {-w, 0, 14}
		atHip(rig, CF(hip) * ANG(0, pi, 0) * ANG(0, 0, pi), pose)
	elseif t < T_PULL + 0.45 then
		local u = seg(t, T_PULL, T_PULL + 0.45)
		hip = (CRASH + V(0, 1, 0)):Lerp(MO + V(9.5, 2, 0), u) + V(0, 4 * u * (1 - u) * 5, 0)
		pose = P(FLY, STAND, smooth(u))
		atHip(rig, yawCF(hip, 125) * ANG(0, 0, pi * (1 - u)), pose)
	elseif t < T_GO then
		pose = P(STAND)
		local dizzy, wv, ask = pulse(t, T_PULL + 0.45, 16.0, 0.15), pulse(t, 16.0, 16.65, 0.12), pulse(t, 16.65, 17.55, 0.12)
		local nod = pulse(t, 17.7, 18.2, 0.1)
		pose.torso = {0, 0, sin(t * 9) * 9 * dizzy}
		pose.head = {28 * ask + sin(t * 20) * 9 * nod, -20, sin(t * 9 + 1) * 12 * dizzy}
		pose.lArm = {0, 0, -8 - (142 + sin(t * 22) * 18) * wv}
		pose.rArm = {150 * ask + 100 * nod, 0, 8 + 28 * ask}
		pose.stretch = sq(t, T_PULL + 0.45, 0.3)
		hip = MO + V(9.5, 2, 0)
		Rig.pose(rig, yawCF(MO + V(9.5, 0, 0), 125), pose)
	elseif t < T_GO + 0.5 then
		local x = lerp(9.5, 3.6, seg(t, T_GO, T_GO + 0.5))
		pose = P(STAND); walkAdd(pose, t * 16, 36)
		hip = MO + V(x, 2, 0)
		Rig.pose(rig, yawCF(MO + V(x, 0, 0), 90), pose)
	elseif t < T_GO + 0.85 then
		local u = seg(t, T_GO + 0.5, T_GO + 0.85)
		hip = (MO + V(3.6, 2, 0)):Lerp(seatHip(MPIVOT, ma, 1), u) + V(0, 4 * u * (1 - u) * 2.6, 0)
		pose = P(HOP, SIT, smooth(seg(u, 0.35, 1)))
		pose.stretch = 1 + 0.12 * sin(u * pi)
		atHip(rig, yawCF(hip, 90) * ANG(-ma * u, 0, 0), pose)
	elseif t < T4 then
		pose = P(SIT)
		local up = pulse(t, T_AJUMP + 0.1, T4 + 1, 0.25)
		pose.head = {34 * up, lerp(45, 12, up), 0}
		pose.stretch = sq(t, T_GO + 0.85, 0.26, 12, 28)
		hip = seatHip(MPIVOT, ma, 1)
		atHip(rig, yawCF(hip, 90) * ANG(-ma, 0, 0), pose)
	elseif t < RET0 then
		local u = t - T4
		hip = seatHip(MPIVOT, TILT, 1) + V(0, u * 50 + u * u * 700, 0)
		pose = P(FLY); pose.stretch = 1.5
		atHip(rig, yawCF(hip, 90), pose)
	elseif t < EARTH2 then
		local u = t - RET0
		hip = FS + V(sin(u * 3) * 0.8, sin(u * 4.3) * 0.4, 0)
		local panic = smooth(seg(u, 0.6, 0.8))
		pose = P(SUPER, FLY, panic)
		local w = sin(u * 34) * 16 * panic
		pose.lArm[3] -= w; pose.rArm[3] -= w
		atHip(rig, CF(hip) * ANG(0, 0, pi + sin(u * 5) * 0.12) * ANG(0, pi, 0), pose)
	elseif t < T5 then
		local u = T5 - t
		hip = seatHip(PIVOT, -TILT, -1) + V(-36 * u, 170 * u, 0)
		pose = P(SIT, FLY, smooth(seg(u, 0, 0.2)))
		pose.head, pose.stretch = {0, -40, 0}, 1 + 0.4 * seg(u, 0, 0.3)
		atHip(rig, yawCF(hip, -90) * ANG(-TILT, 0, 0), pose)
	else
		pose = P(SIT, SIT_SMUG, smooth(seg(t, T5 + 0.6, T5 + 0.9)))
		pose.head = {0, -50, 0}
		pose.stretch = sq(t, T5, 0.42, 8, 24)
		hip = seatHip(PIVOT, a, -1)
		atHip(rig, yawCF(hip, -90) * ANG(a, 0, 0), pose)
	end
	faceTrack(rig, NOOB_FACE, t)
	return hip
end

local function animPro(S, t, a)
	local rig = S.pro
	local pos, pose = V(10.2, 0, 0), nil
	if t < PRO_IN or t > T_FLICK + 1 then
		hide(rig)
	elseif t < PRO_STOP then
		pos = V(lerp(17.5, 10.2, seg(t, PRO_IN, PRO_STOP)), 0, 0)
		pose = P(STAND); walkAdd(pose, t * 15, 34); pose.torso[1] = -6
		Rig.pose(rig, yawCF(pos, 90), pose)
	elseif t < T_PJUMP then
		local wv, point = pulse(t, 2.65, 3.35, 0.12), pulse(t, 3.85, T_PJUMP + 0.1, 0.12)
		pose = P(STAND)
		pose.lArm = {95 * point, 0, -8 - (142 + sin(t * 22) * 18) * wv}
		pose.torso[1] = -8 * point
		pose.stretch = 1 - 0.14 * smooth(seg(t, T_PJUMP - 0.15, T_PJUMP))
		Rig.pose(rig, yawCF(pos, 90), pose)
	elseif t < T1 then
		local u = seg(t, T_PJUMP, T1)
		pos = V(10.2, 0, 0):Lerp(seatTop(PIVOT, TILT, 1), u) + V(0, 4 * u * (1 - u) * 3.4, 0)
		pose = P(HOP, CROUCH, smooth(seg(u, 0.6, 1)) * 0.5)
		pose.stretch = 1 + 0.14 * sin(u * pi)
		Rig.pose(rig, yawCF(pos, 90) * ANG(rad(-16) * sin(u * pi), 0, 0), pose)
	elseif t < T_FLICK then
		pos = seatTop(PIVOT, a, 1)
		local u = t - T1
		local bounce = seg(t, T1L, T1L + 0.5)
		pos += V(0, 4 * bounce * (1 - bounce) * 2.6, 0)
		local laugh = pulse(t, T1 + 0.3, T1L, 0.1) + pulse(t, T1L + 0.5, 6.3, 0.12)
		local fear = smooth(seg(t, 6.9, 7.3))
		pose = P(P(CROUCH, AKIMBO, smooth(seg(u, 0.1, 0.4))), COWER, fear)
		if bounce > 0 and bounce < 1 then pose = P(FLY) end
		pose.torso[1] += sin(t * 24) * 5 * laugh
		pose.head = {sin(t * 24) * 6 * laugh + 8 * laugh, 0, 0}
		pose.stretch = sq(t, T1, 0.3, 11, 24) * sq(t, T1L + 0.5, 0.25, 11, 24)
		local yaw = lerp(90, 270, smooth(seg(t, 6.35, 6.6)))
		Rig.pose(rig, yawCF(pos + V(sin(t * 70) * 0.05 * fear, 0, 0), yaw), pose)
	else
		local u = t - T_FLICK
		pos = seatTop(PIVOT, TILT, 1) + V(-34 * u, 60 * u + 2, -50 * u)
		pose = P(FLY)
		Rig.pose(rig, CF(pos) * ANG(u * 25, u * 18, 0), pose)
	end
	faceTrack(rig, PRO_FACE, t)
	return pos
end

local function animBuff(S, t, a)
	local rig = S.buff
	local pos, pose = V(BUFF_X, 0, 0), nil
	if t < BUFF_IN or (t > CLOUD0 and t < EARTH2) or t > T5 + 1.2 then
		hide(rig)
	elseif t < BUFF_STOP then
		local u = seg(t, BUFF_IN, BUFF_STOP)
		pos = V(lerp(27, BUFF_X, u), 0, 0)
		pose = P(STAND); walkAdd(pose, (t - BUFF_IN) * pi / 0.4, 30)
		pose.hipY *= 2.2; pose.torso[1] = -5
		pose.lArm[3], pose.rArm[3] = -24, 24
		Rig.pose(rig, yawCF(pos, 90), pose)
	elseif t < T_BCROUCH then
		local flex = pulse(t, 7.55, 8.2, 0.14)
		local sw = seg(t, T_FLICK - 0.14, T_FLICK + 0.05) * (1 - smooth(seg(t, T_FLICK + 0.1, T_FLICK + 0.35)))
		pose = P(STAND)
		pose.lArm = {lerp(0, 150, sw) - 50 * seg(t, T_FLICK - 0.3, T_FLICK - 0.14) * (1 - seg(t, T_FLICK - 0.14, T_FLICK)), 0, -8 - (95 + sin(t * 16) * 12) * flex}
		pose.rArm = {0, 0, 8 + (95 + sin(t * 16) * 12) * flex}
		pose.torso[1] = 10 * flex - 14 * sw
		pose.head = {8 * flex, 0, 0}
		pose.stretch = sq(t, BUFF_STOP, 0.12)
		Rig.pose(rig, yawCF(pos, 90), pose)
	elseif t < T_BJUMP then
		pose = P(STAND, CROUCH, smooth(seg(t, T_BCROUCH, T_BJUMP)))
		pose.stretch = lerp(1, 0.8, smooth(seg(t, T_BCROUCH, T_BJUMP)))
		Rig.pose(rig, yawCF(pos, 90), pose)
	elseif t < T2 then
		local u = seg(t, T_BJUMP, T2)
		pos = V(BUFF_X, 0, 0):Lerp(seatTop(PIVOT, TILT, 1), u) + V(0, 4 * u * (1 - u) * 13, 0)
		pose = P(FLY, CROUCH, smooth(seg(u, 0.75, 1)))
		pose.stretch = 1 + 0.16 * sin(u * pi)
		Rig.pose(rig, yawCF(pos, 90) * ANG(rad(-14) * sin(u * pi), 0, 0), pose)
	elseif t < T5 then
		pos = seatTop(PIVOT, a, 1)
		local shade, flex = pulse(t, T2 + 0.3, CLOUD0 + 1, 0.2), pulse(t, EARTH2 - 0.2, 22.65, 0.12)
		local up = smooth(seg(t, 22.6, 22.75))
		pose = P(CROUCH, STAND, smooth(seg(t, T2 + 0.1, T2 + 0.4)))
		pose.lArm = {150 * shade, 0, -8 + 20 * shade - (95 + sin(t * 16) * 12) * flex}
		pose.rArm = {0, 0, 8 + (95 + sin(t * 16) * 12) * flex}
		pose.head = {32 * shade + 34 * up, 0, 0}
		pose.torso[1] += 8 * shade + 10 * flex
		pose.stretch = sq(t, T2, 0.36, 9, 24)
		Rig.pose(rig, yawCF(pos, 90), pose)
	else
		local u = t - T5
		pos = seatTop(PIVOT, -TILT, 1) + V(7 * u, 60 * u + 260 * u * u, -22 * u)
		pose = P(FLY)
		local w = sin(u * 40) * 20
		pose.lArm[3] -= w; pose.rArm[3] -= w
		Rig.pose(rig, CF(pos) * ANG(0, rad(90), 0) * ANG(u * 9, 0, u * 6), pose)
	end
	faceTrack(rig, BUFF_FACE, t)
	return pos
end

local function animAlien(S, t, ma)
	local rig = S.alien
	local pos, pose = MO + V(6.2, 0, 0), nil
	if t < MOON0 - 0.5 or t > RET0 + 0.2 then
		hide(rig)
	elseif t < 14.3 then
		pose = P(SIT_SMUG)
		pose.head = {0, 50, 0}
		pose.stretch = sq(t, T3, 0.3, 9, 30)
		pos = seatHip(MPIVOT, ma, 1)
		atHip(rig, yawCF(pos, 90) * ANG(-ma, 0, 0), pose)
	elseif t < 14.5 then
		local u = seg(t, 14.3, 14.5)
		pos = seatHip(MPIVOT, ma, 1):Lerp(MO + V(2.8, 2, 0), u) + V(0, 4 * u * (1 - u) * 1.6, 0)
		pose = P(SIT, STAND, smooth(u))
		atHip(rig, yawCF(pos, lerp(90, -90, smooth(u))), pose)
	elseif t < 15.0 then
		pos = MO + V(lerp(2.8, 6.2, seg(t, 14.5, 15.0)), 0, 0)
		pose = P(STAND); walkAdd(pose, t * 18, 36)
		Rig.pose(rig, yawCF(pos, -90), pose)
	elseif t < T_AJUMP then
		local pull, back = pulse(t, 15.0, T_PULL + 0.12, 0.08), pulse(t, T_PULL, T_PULL + 0.5, 0.1)
		local wv, idea = pulse(t, 15.6, 16.35, 0.12), pulse(t, 17.5, 17.95, 0.1)
		local turn = smooth(seg(t, 17.85, 18.05))
		local point = pulse(t, 17.95, 18.6, 0.12)
		local crouch = smooth(seg(t, T_AJUMP - 0.25, T_AJUMP))
		pose = P(STAND, CROUCH, crouch)
		pose.rArm = {120 * pull + 172 * idea, 0, pose.rArm[3] + (142 + sin(t * 22) * 18) * wv}
		pose.lArm = {120 * pull + 95 * point, 0, pose.lArm[3]}
		pose.torso[1] += -16 * pull + 22 * back
		pose.head = {sin(t * 3) * 4, lerp(-22, 22, turn), 8 * pulse(t, 16.65, 17.5, 0.15)}
		pose.stretch = (1 + 0.14 * idea) * lerp(1, 0.82, crouch)
		pos += V(0, 0.9 * idea, 0)
		local yaw = t < T_PULL + 0.3 and -90 or lerp(-125, -235, turn)
		Rig.pose(rig, yawCF(pos, yaw), pose)
	elseif t < T4 then
		local u = seg(t, T_AJUMP, T4)
		pos = (MO + V(6.2, 0, 0)):Lerp(seatTop(MPIVOT, -TILT, -1), u) + V(0, 4 * u * (1 - u) * 13, 0)
		pose = P(FLY, CROUCH, smooth(seg(u, 0.85, 1)))
		atHip(rig, CF(pos + V(0, 2, 0)) * ANG(0, 0, 2 * pi * smooth(seg(u, 0.08, 0.9))) * ANG(0, pi, 0), pose)
	else
		pos = seatTop(MPIVOT, ma, -1)
		local wv = pulse(t, T4 + 0.3, RET0 + 0.2, 0.12)
		pose = P(CROUCH, STAND, smooth(seg(t, T4 + 0.1, T4 + 0.35)))
		pose.rArm = {0, 0, pose.rArm[3] + (142 + sin(t * 22) * 18) * wv}
		pose.head = {26 * wv, -48, 0}
		pose.stretch = sq(t, T4, 0.34, 9, 24)
		Rig.pose(rig, yawCF(pos, -90), pose)
	end
	faceTrack(rig, ALIEN_FACE, t)
	return pos
end

local SHAKES = {{T1, 0.4, 7}, {T1L, 0.25, 8}, {6.2, 0.22, 9}, {6.6, 0.26, 9}, {7.0, 0.3, 9}, {7.4, 0.34, 9},
	{T2, 0.95, 5}, {T3, 0.7, 6}, {T4, 0.45, 7}, {T5, 0.95, 5}}
local function shakeAll(t)
	local x, y = 0, 0
	for _, s in ipairs(SHAKES) do
		if t >= s[1] then
			local u = t - s[1]
			local k = s[2] * exp(-u * s[3])
			x += sin(u * 97) * k; y += cos(u * 71) * k
		end
	end
	return CF(x, y, 0)
end

local function camera(t, N, PRO, BUFF)
	local cf, fov
	local wide = L(V(1.5, 5, 34), V(0, 6, 0))
	if t < T_SIT then cf, fov = L(V(N.X + 3.2, 3.8, 13.5), V(N.X + 0.8, 3.1, 0)), 42
	elseif t < 2.5 then
		local u = seg(t, T_SIT, 2.5)
		cf, fov = L(V(-3.2 - u * 0.4, 3.0, 10.5 - u), V(-6.1, 2.7, 0)), 40
	elseif t < 3.3 then cf, fov = L(V(-10.5, 4.6, 6.5), V(6, 3.4, 0)), 40
	elseif t < 3.9 then cf, fov = L(V(14.5, 4.8, 6.5), V(-3, 2.9, 0)), 36
	elseif t < T1 then cf, fov = L(V(-10.5, 4.6, 6.5), V(6, 3.8, 0)), 40
	elseif t < T1 + 0.2 then cf, fov = wide, 46
	elseif t < T1L - 0.2 then cf, fov = L(N + V(2.6, 2.8, 8), N + V(0, 1.7, 0)), 38
	elseif t < 6.8 then cf, fov = wide, 46
	elseif t < BUFF_STOP then cf, fov = L(V(4.5, 1.4, 9.5), V(BUFF.X - 1, 6.6, 0)), 50
	elseif t < 7.9 then cf, fov = L(V(3.5, 2.2, 15), V(BUFF_X, 6.4, 0)), 50
	elseif t < T_FLICK - 0.12 then cf, fov = L(V(14.5, 9.8, 9.5), V(-4, 2.6, 0)), 38
	elseif t < T_BCROUCH then cf, fov = L(V(7.5, 5, 24), V(7.8, 6.2, 0)), 46
	elseif t < 9.15 then cf, fov = L(V(-1, 1.4, 23), V(6.5, 9, 0)), 55
	elseif t < T2 then cf, fov = L(V(-1.2, 7.2, 6.5), N + V(0, 2.0, 0)), 40
	elseif t < 9.85 then cf, fov = wide, 46
	elseif t < CLOUD0 then cf, fov = L(V(12, 2.6, 21), V(6.2, 6.6, 0)), 46
	elseif t < SPACE0 then cf, fov = L(N + V(2.5, 1.5, 15), N + V(0, 1.6, 0)), 46
	elseif t < MOON0 then cf, fov = L(FS + V(0, 0.8, 17), FS + V(0, 1.2, 0)) * ANG(0, 0, sin(t * 1.3) * 0.08), 48
	elseif t < 14.2 then cf, fov = L(MO + V(1, 4.5, 36), MO + V(1, 7, 0)), 50
	elseif t < T_PULL then cf, fov = L(MO + V(5.6, 3, 15), MO + V(6.8, 3.2, 0)), 44
	elseif t < T_GO then cf, fov = L(MO + V(7.85, 3.4, 17), MO + V(7.85, 4.4, 0)), 44
	elseif t < T4 + 0.3 then cf, fov = L(MO + V(-2.3, 5, 38), MO + V(-2.3, 8.5, 0)), 50
	elseif t < RET0 then cf, fov = L(MO + V(-7, 3, 18), MO + V(-10.6, 4.8, 0)), 42
	elseif t < EARTH2 then cf, fov = L(FS + V(0, 0.8, 17), FS + V(0, 0.2, 0)) * ANG(0, 0, sin(t * 1.7) * 0.06), 48
	elseif t < T5 then cf, fov = L(V(12, 2.6, 21), V(6.2, 6.6, 0)), 46
	elseif t < 23.9 then cf, fov = wide, 46
	else
		local u = seg(t, 23.9, Film.DURATION)
		cf, fov = L(V(-3.6, 3.2, 10.5 - u), V(-6.0, 3.6, 0)), 44
	end
	return cf * shakeAll(t), fov
end

local DUSTS = {{T1, V(6.2, 0.5, 0), 1, 1}, {T1L, V(-6.2, 0.5, 0), 0.8, 1}, {T2, V(6.2, 0.5, 0), 1.8, 1},
	{T3, CRASH + V(0, 0.5, 0), 1.7, 2}, {T4, MO + V(-11, 0.5, 0), 1.2, 2}, {T5, V(-6.2, 0.5, 0), 1.7, 1}}
local DUST_COLOR = {C(235, 228, 210), C(196, 196, 204)}
local FLASHES = {T2, T3, T5}
local TWINKLES = {{T_FLICK + 0.6, V(-26, 40, -62)}, {T5 + 0.75, V(11, 52, -70)}}

local function fx(S, t, N)
	local active
	for _, d in ipairs(DUSTS) do if t >= d[1] and t < d[1] + 0.55 then active = d end end
	for i, p in ipairs(S.dust) do
		if not active then
			p.Transparency = 1
		else
			local u = t - active[1]
			local ang = i / #S.dust * pi * 2
			local dir = V(cos(ang), 0, sin(ang) * 0.8)
			p.Color = DUST_COLOR[active[4]]
			p.CFrame = CF(active[2] + dir * outQuad(u / 0.55) * (3 + i % 3) * active[3] + V(0, u * 3 * active[3], 0))
			p.Size = V(1, 1, 1) * (1 + u * 5) * active[3]
			p.Transparency = math.min(1, 0.25 + u * 1.4)
		end
	end
	local b = 0
	for _, f in ipairs(FLASHES) do if t >= f then b += 0.85 * exp(-(t - f) * 11) end end
	S.cc.Brightness = b
	local space = (t >= T2 and t < EARTH2)
	if S.atm then S.atm.Density = space and 0 or 0.25 end
	S.crater.Transparency = t >= T3 and 0 or 1

	-- полёт в космосе: штрихи звёзд, Земля и Луна
	local ascent, ret = t >= SPACE0 and t < MOON0, t >= RET0 and t < EARTH2
	for i, p in ipairs(S.streaks) do
		if ascent or ret then
			local seed = (i * 0.6180339) % 1
			local y = ((seed * 70 + (ascent and -1 or 1) * t * 130) % 70) - 35
			p.CFrame = CF(FS + V((i * 7.3) % 30 - 15, y, -4 - (i * 3.7) % 34))
		else
			p.CFrame = CF(0, -50, 0)
		end
	end
	if ascent then
		local u = t - SPACE0
		setEarth(S.flyEarth, FS + V(-4, -34 - 34 * u, -46), 62 - 18 * u)
		S.flyMoon.Size, S.flyMoon.CFrame = V(1, 1, 1) * (14 + 20 * u), CF(FS + V(5, 74 - 26 * u, -50))
	elseif ret then
		local u = t - RET0
		setEarth(S.flyEarth, FS + V(0, -78 + 30 * u, -50), 34 + 50 * u)
		S.flyMoon.CFrame = CF(0, -50, 0)
	else
		setEarth(S.flyEarth, V(0, -400, 0), 1)
		S.flyMoon.CFrame = CF(0, -50, 0)
	end

	-- огонь при входе в атмосферу и дым после приземления
	local burning = t >= RET0 + 0.6 and t < T5 + 0.25
	local trail = t < EARTH2 and V(0, 1, 0) or V(-36, 170, 0).Unit
	for i, p in ipairs(S.fire) do
		if burning then
			local fl = 0.75 + 0.25 * sin(t * 50 + i * 2.1)
			local s = (3 - i * 0.22) * fl * (t > T5 and (1 - seg(t, T5, T5 + 0.25)) or 1)
			p.Size = V(s, s, s)
			p.CFrame = CF(N + trail * (0.6 + i * 0.95) + V(sin(t * 40 + i) * 0.25, 0, cos(t * 33 + i) * 0.25))
			p.Color = C(255, math.max(60, 230 - i * 18), 40)
			p.Transparency = 0.15 + i * 0.07
		else
			p.Transparency = 1
		end
	end
	for i, p in ipairs(S.smoke) do
		if t > T5 + 0.3 then
			local ph = (t * 0.9 + i * 0.25) % 1
			p.Size = V(1, 1, 1) * (0.6 + ph * 0.9)
			p.CFrame = CF(N + V(sin(i * 2.4) * 0.9, 2.6 + ph * 2.6, 0.4))
			p.Transparency = 0.45 + ph * 0.55
		else
			p.Transparency = 1
		end
	end
	for i, tw in ipairs(TWINKLES) do
		local u = seg(t, tw[1], tw[1] + 0.4)
		local p = S.twinkle[i]
		if u > 0 and u < 1 then
			local s = sin(u * pi) * 5
			p.Size, p.CFrame, p.Transparency = V(s, s, s), CF(tw[2]), 0
		else
			p.Transparency = 1
		end
	end
end

function Film.apply(S, t)
	local a = flipAngle(t, 1, {{T1, -1}, {T1L, 1}, {T2, -1}, {T5, 1}})
	local ma = flipAngle(t, -1, {{T4, 1}})
	local pcf = CF(PIVOT) * ANG(0, 0, a)
	for _, p in ipairs(S.plank) do p.part.CFrame = pcf * p.offset end
	local mcf = CF(MPIVOT) * ANG(0, 0, ma)
	for _, p in ipairs(S.mplank) do p.part.CFrame = mcf * p.offset end
	local N = animNoob(S, t, a, ma)
	local PRO = animPro(S, t, a)
	local BUFF = animBuff(S, t, a)
	animAlien(S, t, ma)
	for name, events in pairs(BUBBLES) do bubbleTrack(S.bubble[name], events, t) end
	fx(S, t, N)
	return camera(t, N, PRO, BUFF)
end

return Film
