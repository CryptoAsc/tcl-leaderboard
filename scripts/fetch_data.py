import os
import json
import urllib.request
import urllib.error

# Configuration
API_KEY = os.environ.get('FACEIT_API_KEY', 'f3239f46-4d89-4f88-898b-6a4649f2de59')
SEASON_ID = os.environ.get('FACEIT_SEASON_ID', '28')
HUB_ID = 'f74f990c-363d-4b2d-91a5-081787b2ea0a'
OUTPUT_FILE = 'docs/data/leaderboard.json'

def fetch_hub_leaderboard():
    limit = 50
    offset = 0
    all_players = []
    
    print(f"Fetching leaderboard for Hub {HUB_ID}, Season {SEASON_ID}...")
    
    while True:
        url = f"https://open.faceit.com/data/v4/leaderboards/hubs/{HUB_ID}/seasons/{SEASON_ID}?limit={limit}&offset={offset}"
        req = urllib.request.Request(url)
        req.add_header('Authorization', f'Bearer {API_KEY}')
        
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                if 'items' not in data or len(data['items']) == 0:
                    break
                    
                items = data['items']
                all_players.extend(items)
                print(f"Fetched {len(items)} players (offset: {offset}). Total so far: {len(all_players)}")
                
                if len(items) < limit:
                    break
                
                offset += limit
                
        except urllib.error.HTTPError as e:
            print(f"HTTP Error: {e.code} - {e.reason}")
            try:
                error_body = e.read().decode()
                print(f"Error Body: {error_body}")
            except:
                pass
            break
        except Exception as e:
            print(f"An error occurred: {e}")
            break
    
    # Ensure all_players is uniquely processed just in case of pagination overlaps
    seen_ids = set()
    cleaned_players = []
    
    for player in all_players:
        player_id = player.get('player', {}).get('user_id')
        if player_id in seen_ids:
            continue
        seen_ids.add(player_id)
        
        cleaned_players.append({
            'position': player.get('position'),
            'nickname': player.get('player', {}).get('nickname', 'Unknown'),
            'avatar': player.get('player', {}).get('avatar', ''),
            'points': player.get('points', 0),
            'win_rate': player.get('win_rate', 0),
            'current_streak': player.get('current_streak', 0),
            'played': player.get('played', 0),
            'won': player.get('won', 0),
            'lost': player.get('lost', 0),
            'player_id': player_id
        })

    # Sort players primarily by streak descending, then by points descending.
    cleaned_players.sort(key=lambda x: (x['current_streak'], x['points']), reverse=True)
    
    # Re-assign positions based on sorted order just in case
    for i, p in enumerate(cleaned_players):
        p['position'] = i + 1

    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    # Save to file
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(cleaned_players, f, indent=2)
        
    print(f"Saved {len(cleaned_players)} final unique players to {OUTPUT_FILE}")

if __name__ == '__main__':
    fetch_hub_leaderboard()
