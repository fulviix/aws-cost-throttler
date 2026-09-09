local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local window_start = now - window_ms
redis.call("ZREMRANGEBYSCORE", key, 0, window_start)

local current_count = redis.call("ZCARD", key)

if current_count >= limit then
  return 0
end

local member = now .. "-" .. tostring(math.random())
redis.call("ZADD", key, now, member)


redis.call("PEXPIRE", key, window_ms)

return 1