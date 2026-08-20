if quarto.doc.is_format("html") then
  quarto.doc.add_html_dependency({
    name = "code-blanks",
    version = "0.1.0",
    stylesheets = { "code-blanks.css" },
    scripts = {
      "code-blanks.js",
      "runner-webr.js",
      "progressive-reveal.js",
      "code-blanks-storage.js"
    }
  })
end

function Meta(meta)
  local packages = {}
  local setup_lines = {}
  local plot_width = "800"
  local plot_height = "500"
  local progressive_reveal = "false"

  if meta["code-blanks"] then

    if meta["code-blanks"]["packages"] then
      for _, pkg in ipairs(meta["code-blanks"]["packages"]) do
        table.insert(packages, pandoc.utils.stringify(pkg))
      end
    end

    if meta["code-blanks"]["setup"] then
      for _, line in ipairs(meta["code-blanks"]["setup"]) do
        table.insert(setup_lines, pandoc.utils.stringify(line))
      end
    end

    if meta["code-blanks"]["plot-width"] then
      plot_width = pandoc.utils.stringify(
        meta["code-blanks"]["plot-width"]
      )
    end

    if meta["code-blanks"]["plot-height"] then
      plot_height = pandoc.utils.stringify(
        meta["code-blanks"]["plot-height"]
      )
    end

    if meta["code-blanks"]["progressive-reveal"] then
      progressive_reveal = pandoc.utils.stringify(
        meta["code-blanks"]["progressive-reveal"]
      )
    end
  end

  local js_packages = {}

  for _, pkg in ipairs(packages) do
    table.insert(js_packages, '"' .. pkg .. '"')
  end

  local setup_code = table.concat(setup_lines, "\n")
  setup_code = setup_code:gsub("\\", "\\\\")
  setup_code = setup_code:gsub("`", "\\`")
  setup_code = setup_code:gsub("%$", "\\$")

  local script =
    '<script>' ..
    'window.codeBlanksPackages = [' ..
    table.concat(js_packages, ",") ..
    '];' ..
    'window.codeBlanksSetup = `' ..
    setup_code ..
    '`;' ..
    'window.codeBlanksPlotWidth = ' ..
    plot_width ..
    ';' ..
    'window.codeBlanksPlotHeight = ' ..
    plot_height ..
    ';' ..
    'window.codeBlanksProgressiveReveal = ' ..
    progressive_reveal ..
    ';' ..
    '</script>'

  quarto.doc.include_text("in-header", script)

  return meta
end

local function has_class(el, class_name)
  for _, class in ipairs(el.classes) do
    if class == class_name or class == "{" .. class_name .. "}" then
      return true
    end
  end
  return false
end

local function trim(s)
  local out = s:gsub("^%s+", "")
  out = out:gsub("%s+$", "")
  return out
end

local function escape_html(s)
  s = s:gsub("&", "&amp;")
  s = s:gsub("<", "&lt;")
  s = s:gsub(">", "&gt;")
  s = s:gsub('"', "&quot;")
  return s
end

local function escape_pattern(s)
  return s:gsub("([^%w])", "%%%1")
end

local function escape_js_template(s)
  s = s:gsub("\\", "\\\\")
  s = s:gsub("`", "\\`")
  s = s:gsub("%$", "\\$")
  return s
end

local function is_token_char(ch)
  return ch and ch:match("[%w_]") ~= nil
end

local function replace_nth_text(text, target, replacement, n)
  local pattern = escape_pattern(target)
  local count = 0

  return text:gsub(pattern, function(match)
    count = count + 1
    if count == n then
      return replacement
    end
    return match
  end)
end

local function replace_nth_token(text, target, replacement, n)
  local count = 0
  local pos = 1

  while true do
    local s, e = text:find(target, pos, true)

    if not s then
      return text
    end

    local before = s > 1 and text:sub(s - 1, s - 1) or nil
    local after = e < #text and text:sub(e + 1, e + 1) or nil

    local before_ok = not is_token_char(before)
    local after_ok = not is_token_char(after)

    if before_ok and after_ok then
      count = count + 1

      if count == n then
        return text:sub(1, s - 1) ..
          replacement ..
          text:sub(e + 1)
      end
    end

    pos = e + 1
  end
end

local function replace_nth(text, target, replacement, n, match_mode)
  if match_mode == "text" then
    return replace_nth_text(text, target, replacement, n)
  end

  return replace_nth_token(text, target, replacement, n)
end

local function parse_blank_blocks(code)
  local blanks = {}
  local code_lines = {}
  local current = nil

  local function finish_current()
    if current and current.target then
      current.target = trim(current.target)
      current.prefill = current.prefill or false
      current.occurrence = current.occurrence or 1
      current.match = current.match or "token"
      table.insert(blanks, current)
    end
    current = nil
  end

  for line in (code .. "\n"):gmatch("(.-)\n") do

    if line:match("^#|%s*blank:%s*$") then
      finish_current()
      current = {}

    elseif current and line:match("^#|%s+target:%s*(.+)$") then
      current.target = line:match("^#|%s+target:%s*(.+)$")

    elseif current and line:match("^#|%s+prefill:%s*(.+)$") then
      local value = trim(line:match("^#|%s+prefill:%s*(.+)$"))
      current.prefill = value == "true"

    elseif current and line:match("^#|%s+occurrence:%s*(.+)$") then
      local value = trim(line:match("^#|%s+occurrence:%s*(.+)$"))
      current.occurrence = tonumber(value) or 1

    elseif current and line:match("^#|%s+match:%s*(.+)$") then
      local value = trim(line:match("^#|%s+match:%s*(.+)$"))

      if value == "text" then
        current.match = "text"
      else
        current.match = "token"
      end

    elseif current and line:match("^%s*$") then
      finish_current()

    else
      finish_current()
      table.insert(code_lines, line)
    end
  end

  finish_current()

  return table.concat(code_lines, "\n"), blanks
end

function CodeBlock(el)

  if has_class(el, "code-blanks-functions") then
    local script =
      '<script>' ..
      'window.codeBlanksFunctions = (window.codeBlanksFunctions || "") + "\\n" + `' ..
      escape_js_template(el.text) ..
      '`;' ..
      '</script>'

    quarto.doc.include_text("in-header", script)

    return pandoc.Null()
  end

  if has_class(el, "code-blanks-instructions") then
    local content = pandoc.read(el.text, "markdown").blocks

    table.insert(
      content,
      1,
      pandoc.RawBlock(
        "html",
        '<div class="code-blanks-instructions-box">'
      )
    )

    table.insert(
      content,
      pandoc.RawBlock("html", '</div>')
    )

    return content
  end

  if has_class(el, "code-blanks-response") then
    local content = pandoc.read(el.text, "markdown").blocks

    table.insert(
      content,
      1,
      pandoc.RawBlock(
        "html",
        '<div class="code-blanks-response-box">'
      )
    )

    table.insert(
      content,
      pandoc.RawBlock(
        "html",
        '<textarea class="code-blanks-response" rows="2"></textarea>'
      )
    )

    table.insert(
      content,
      pandoc.RawBlock("html", '</div>')
    )

    return content
  end

  if not has_class(el, "code-blanks") then
    return nil
  end

  local code, blanks = parse_blank_blocks(el.text)
  local working = code
  local placeholders = {}

  for i, blank in ipairs(blanks) do
    local token = "@@CODEBLANK" .. i .. "@@"

    working = replace_nth(
      working,
      blank.target,
      token,
      blank.occurrence,
      blank.match
    )

    local value = ""
    if blank.prefill then
      value = escape_html(blank.target)
    end

    placeholders[token] =
      '<input class="code-blank-input" ' ..
      'data-answer="' .. escape_html(blank.target) .. '" ' ..
      'data-default="' .. value .. '" ' ..
      'value="' .. value .. '" ' ..
      'size="' .. tostring(math.max(#blank.target + 2, 4)) .. '">'
  end

  local html_code = escape_html(working)

  for token, input in pairs(placeholders) do
    html_code = html_code:gsub(token, input)
  end

  return pandoc.RawBlock(
    "html",
    '<pre class="code-blanks"><code>' ..
    html_code ..
    '</code></pre>'
  )
end