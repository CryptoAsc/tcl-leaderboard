import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

WEBHOOK_URL = os.environ.get('DISCORD_WEBHOOK_URL', '')
LEADERBOARD_FILE = 'docs/data/leaderboard.json'
MESSAGE_ID_FILE = 'docs/data/discord_message_id.txt'
SITE_URL = 'https://ascendancydota.github.io/tcl-leaderboard/'

# How many players to show in the embed (Discord has a 6000 char limit on embeds)
TOP_N = 15


def load_leaderboard():
    with open(LEADERBOARD_FILE, 'r') as f:
        return json.load(f)


def load_message_id():
    if os.path.exists(MESSAGE_ID_FILE):
        with open(MESSAGE_ID_FILE, 'r') as f:
            msg_id = f.read().strip()
            if msg_id:
                return msg_id
    return None


def save_message_id(msg_id):
    os.makedirs(os.path.dirname(MESSAGE_ID_FILE), exist_ok=True)
    with open(MESSAGE_ID_FILE, 'w') as f:
        f.write(msg_id)


def build_embed(players):
    """Build a Discord embed dict from the leaderboard data."""

    # Find closest to freedom (highest active streak)
    top_streaker = None
    for p in players:
        if top_streaker is None or p['current_streak'] > top_streaker['current_streak']:
            top_streaker = p

    # Escape tracker info
    if top_streaker and top_streaker['current_streak'] >= 5:
        escape_text = f"🟢 **{top_streaker['nickname']}** has ESCAPED with {top_streaker['current_streak']} wins!"
    elif top_streaker and top_streaker['current_streak'] > 0:
        wins_needed = 5 - top_streaker['current_streak']
        escape_text = f"🔥 Closest to freedom: **{top_streaker['nickname']}** — {top_streaker['current_streak']} streak, {wins_needed} win{'s' if wins_needed != 1 else ''} to go"
    else:
        escape_text = "Awaiting the first victory..."

    # Build the leaderboard table
    lines = []
    for p in players[:TOP_N]:
        pos = p['position']
        streak_icon = ''
        if p['current_streak'] >= 5:
            streak_icon = '🏆'
        elif p['current_streak'] >= 3:
            streak_icon = '🔥'
        elif p['current_streak'] >= 2:
            streak_icon = '✨'

        wr = f"{p['win_rate'] * 100:.0f}%"
        lines.append(
            f"`#{pos:>2}` {streak_icon} **{p['nickname']}** — "
            f"{p['current_streak']}🏅 {p['points']}pts "
            f"({p['won']}W/{p['lost']}L, {wr})"
        )

    leaderboard_text = '\n'.join(lines)

    total_players = len(players)
    if total_players > TOP_N:
        leaderboard_text += f"\n\n*...and {total_players - TOP_N} more players*"

    embed = {
        "title": "🏟️ TCL Meets Low Priority — Leaderboard",
        "description": f"{escape_text}\n\n>>> {leaderboard_text}",
        "color": 0x7c3aed,  # Purple accent matching the website
        "footer": {
            "text": f"Updated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} • 5 Wins to Freedom"
        },
        "url": SITE_URL
    }
    return embed


def send_or_update(embed):
    """Send a new message or update the existing one."""
    message_id = load_message_id()

    payload = json.dumps({
        "embeds": [embed]
    }).encode('utf-8')

    if message_id:
        # Try to edit existing message
        url = f"{WEBHOOK_URL}/messages/{message_id}"
        req = urllib.request.Request(url, data=payload, method='PATCH')
        req.add_header('Content-Type', 'application/json')
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"Updated existing Discord message {message_id}")
                return
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"Message {message_id} not found, will create a new one.")
            else:
                print(f"Failed to update message: {e.code} {e.reason}")
                try:
                    print(e.read().decode())
                except Exception:
                    pass
                return

    # Create new message
    url = f"{WEBHOOK_URL}?wait=true"
    req = urllib.request.Request(url, data=payload, method='POST')
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            new_id = data['id']
            save_message_id(new_id)
            print(f"Created new Discord message {new_id}")
    except urllib.error.HTTPError as e:
        print(f"Failed to send message: {e.code} {e.reason}")
        try:
            print(e.read().decode())
        except Exception:
            pass


def main():
    if not WEBHOOK_URL:
        print("DISCORD_WEBHOOK_URL not set, skipping Discord update.")
        return

    players = load_leaderboard()
    if not players:
        print("No leaderboard data found, skipping Discord update.")
        return

    embed = build_embed(players)
    send_or_update(embed)


if __name__ == '__main__':
    main()
