#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
PASSWORD="${PASSWORD:-TuneTribe!123}"
TRACK_URL="${TRACK_URL:-https://www.youtube.com/watch?v=dQw4w9WgXcQ}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

LAST_BODY=""
LAST_STATUS=""

log() {
  printf '[e2e] %s\n' "$*"
}

fail() {
  printf '[e2e] ERROR: %s\n' "$*" >&2
  exit 1
}

require_bin() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required binary: $1"
}

json_get() {
  local json_input="$1"
  local path="$2"

  JSON_INPUT="$json_input" python3 - "$path" <<'PY'
import json
import os
import sys

path = sys.argv[1].split(".")
data = json.loads(os.environ["JSON_INPUT"])

for part in path:
    if part.isdigit():
        data = data[int(part)]
    else:
        data = data[part]

if data is None:
    print("")
elif isinstance(data, bool):
    print("true" if data else "false")
elif isinstance(data, (dict, list)):
    print(json.dumps(data))
else:
    print(data)
PY
}

json_len() {
  local json_input="$1"

  JSON_INPUT="$json_input" python3 - <<'PY'
import json
import os
import sys

data = json.loads(os.environ["JSON_INPUT"])
print(len(data))
PY
}

json_find_friend_request_id() {
  local json_input="$1"
  local username="$2"

  JSON_INPUT="$json_input" python3 - "$username" <<'PY'
import json
import os
import sys

username = sys.argv[1]
data = json.loads(os.environ["JSON_INPUT"])

for item in data:
    from_user = item.get("fromUser") or {}
    if from_user.get("username") == username:
        print(item["id"])
        raise SystemExit(0)

raise SystemExit(1)
PY
}

assert_ge() {
  local actual="$1"
  local minimum="$2"
  local label="$3"

  if (( actual < minimum )); then
    fail "$label expected >= $minimum but got $actual"
  fi
}

request() {
  local method="$1"
  local path="$2"
  local expected_status="$3"
  local token="${4:-}"
  local body="${5:-}"
  local response_file="$TMP_DIR/response.json"
  local url="${BASE_URL}${path}"
  local -a curl_args=(
    curl
    -sS
    -X "$method"
    -H "Accept: application/json"
    "$url"
  )

  if [[ -n "$token" ]]; then
    curl_args+=(-H "Authorization: Bearer $token")
  fi

  if [[ -n "$body" ]]; then
    curl_args+=(-H "Content-Type: application/json" --data "$body")
  fi

  if ! LAST_STATUS="$("${curl_args[@]}" -o "$response_file" -w '%{http_code}')"; then
    fail "curl failed for $method $path"
  fi

  LAST_BODY="$(cat "$response_file")"

  if [[ "$LAST_STATUS" != "$expected_status" ]]; then
    printf '[e2e] ERROR: %s %s returned %s, expected %s\n' "$method" "$path" "$LAST_STATUS" "$expected_status" >&2
    if [[ -n "$LAST_BODY" ]]; then
      printf '%s\n' "$LAST_BODY" >&2
    fi
    exit 1
  fi
}

register_user() {
  local username="$1"
  local email="$2"
  local display_name="$3"
  local favorite_genre="$4"
  local favorite_artist="$5"
  local payload

  payload="$(cat <<JSON
{"email":"$email","username":"$username","displayName":"$display_name","password":"$PASSWORD","favoriteGenre":"$favorite_genre","favoriteArtist":"$favorite_artist"}
JSON
)"

  request POST /api/auth/register 201 "" "$payload"
  printf '%s\n' "$LAST_BODY"
}

log_in() {
  local identifier="$1"
  local payload

  payload="$(cat <<JSON
{"identifier":"$identifier","password":"$PASSWORD"}
JSON
)"

  request POST /api/auth/login 200 "" "$payload"
  printf '%s\n' "$LAST_BODY"
}

require_bin curl
require_bin python3

log "Checking backend availability at $BASE_URL"
request GET /api/health 200

RUN_ID="$(date +%s)-$(python3 - <<'PY'
import secrets
print(secrets.token_hex(3))
PY
)"

USER_A_USERNAME="curla_${RUN_ID//-/_}"
USER_B_USERNAME="curlb_${RUN_ID//-/_}"
USER_C_USERNAME="curlc_${RUN_ID//-/_}"

USER_A_EMAIL="${USER_A_USERNAME}@example.com"
USER_B_EMAIL="${USER_B_USERNAME}@example.com"
USER_C_EMAIL="${USER_C_USERNAME}@example.com"

log "Reading public stats"
request GET /api/stats 200

log "Registering three users for isolated end-to-end coverage"
REGISTER_A="$(register_user "$USER_A_USERNAME" "$USER_A_EMAIL" "Curl User A $RUN_ID" "Synthwave" "M83")"
REGISTER_B="$(register_user "$USER_B_USERNAME" "$USER_B_EMAIL" "Curl User B $RUN_ID" "Indie" "Phoebe Bridgers")"
REGISTER_C="$(register_user "$USER_C_USERNAME" "$USER_C_EMAIL" "Curl User C $RUN_ID" "Jazz" "Masego")"

TOKEN_A="$(json_get "$REGISTER_A" "accessToken")"
TOKEN_B="$(json_get "$REGISTER_B" "accessToken")"
TOKEN_C="$(json_get "$REGISTER_C" "accessToken")"

USER_A_ID="$(json_get "$REGISTER_A" "user.id")"
USER_B_ID="$(json_get "$REGISTER_B" "user.id")"
USER_C_ID="$(json_get "$REGISTER_C" "user.id")"

log "Logging back in to verify the login flow"
LOGIN_A="$(log_in "$USER_A_EMAIL")"
TOKEN_A_LOGIN="$(json_get "$LOGIN_A" "accessToken")"

log "Verifying auth and profile endpoints"
request GET /api/auth/me 200 "$TOKEN_A_LOGIN"
request GET /api/profile 200 "$TOKEN_A_LOGIN"

PROFILE_UPDATE_PAYLOAD="$(cat <<JSON
{"displayName":"Curl User A Updated $RUN_ID","bio":"End-to-end curl smoke test $RUN_ID","favoriteGenre":"Alt Pop","favoriteArtist":"Grimes","avatarUrl":"https://example.com/avatar-$RUN_ID.png"}
JSON
)"
request PATCH /api/profile 200 "$TOKEN_A_LOGIN" "$PROFILE_UPDATE_PAYLOAD"

log "Searching users and exercising friend request flows"
request GET "/api/friends?q=${USER_B_USERNAME}" 200 "$TOKEN_A_LOGIN"
SEARCH_RESULTS_LEN="$(json_len "$LAST_BODY")"
assert_ge "$SEARCH_RESULTS_LEN" 1 "Friend search result count"

request POST "/api/friends/${USER_B_ID}" 200 "$TOKEN_A_LOGIN"
request GET /api/friends/requests 200 "$TOKEN_B"
REQUEST_ID_FOR_A="$(json_find_friend_request_id "$LAST_BODY" "$USER_A_USERNAME")"
request POST "/api/friends/requests/${REQUEST_ID_FOR_A}/accept" 200 "$TOKEN_B"
request GET /api/friends/list 200 "$TOKEN_A_LOGIN"
FRIENDS_AFTER_ACCEPT_LEN="$(json_len "$LAST_BODY")"
assert_ge "$FRIENDS_AFTER_ACCEPT_LEN" 1 "Accepted friend list count"

request POST "/api/friends/${USER_B_ID}" 200 "$TOKEN_C"
request GET /api/friends/requests 200 "$TOKEN_B"
REQUEST_ID_FOR_C="$(json_find_friend_request_id "$LAST_BODY" "$USER_C_USERNAME")"
request POST "/api/friends/requests/${REQUEST_ID_FOR_C}/reject" 204 "$TOKEN_B"

log "Exercising groups, tracks, and analytics"
request GET /api/groups 200 "$TOKEN_A_LOGIN"
INITIAL_GROUPS_LEN="$(json_len "$LAST_BODY")"
assert_ge "$INITIAL_GROUPS_LEN" 1 "Initial group count"

GROUP_CREATE_PAYLOAD="$(cat <<JSON
{"name":"Curl E2E Group $RUN_ID","memberIds":[$USER_B_ID]}
JSON
)"
request POST /api/groups 201 "$TOKEN_A_LOGIN" "$GROUP_CREATE_PAYLOAD"
GROUP_ID="$(json_get "$LAST_BODY" "id")"

request GET /api/groups 200 "$TOKEN_B"
request GET "/api/groups/${GROUP_ID}/tracks" 200 "$TOKEN_A_LOGIN"
TRACKS_BEFORE_LEN="$(json_len "$LAST_BODY")"
if (( TRACKS_BEFORE_LEN != 0 )); then
  fail "New group should start with 0 tracks but got $TRACKS_BEFORE_LEN"
fi

TRACK_CREATE_PAYLOAD="$(cat <<JSON
{"url":"$TRACK_URL"}
JSON
)"
request POST "/api/groups/${GROUP_ID}/tracks" 201 "$TOKEN_A_LOGIN" "$TRACK_CREATE_PAYLOAD"
TRACK_ID="$(json_get "$LAST_BODY" "id")"
if [[ -z "$TRACK_ID" ]]; then
  fail "Track creation did not return an id"
fi

request GET "/api/groups/${GROUP_ID}/tracks" 200 "$TOKEN_A_LOGIN"
TRACKS_AFTER_LEN="$(json_len "$LAST_BODY")"
assert_ge "$TRACKS_AFTER_LEN" 1 "Track count after creation"

request GET "/api/groups/${GROUP_ID}/analytics?window=30d" 200 "$TOKEN_A_LOGIN"
request GET "/api/analytics/me?window=30d" 200 "$TOKEN_A_LOGIN"

log "Cleaning up created resources"
request DELETE "/api/groups/${GROUP_ID}" 204 "$TOKEN_A_LOGIN"
request DELETE "/api/friends/${USER_B_ID}" 204 "$TOKEN_A_LOGIN"

log "End-to-end curl run completed successfully"
