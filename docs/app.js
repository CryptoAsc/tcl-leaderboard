let currentMaxStreak = -1;

document.addEventListener('DOMContentLoaded', () => {
    fetchLeaderboardData();
    // Auto refresh every 2 mins
    setInterval(fetchLeaderboardData, 120000);
});

async function fetchLeaderboardData() {
    try {
        const response = await fetch('./data/leaderboard.json?v=' + new Date().getTime()); // cache busting
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        renderLeaderboard(data);
        const maxActiveStreak = updateEscapeTracker(data);

        if (currentMaxStreak === -1) {
            // First time loading data
            currentMaxStreak = maxActiveStreak;
            playStreakAudio(maxActiveStreak);
        } else if (maxActiveStreak > currentMaxStreak) {
            // Streak just increased, play announcement
            currentMaxStreak = maxActiveStreak;
            playStreakAudio(maxActiveStreak);
        } else {
            // Streak didn't increase or has reset, track without sound
            currentMaxStreak = maxActiveStreak;
        }

        document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
    } catch (error) {
        console.error("Failed to fetch leaderboard JSON:", error);
        document.getElementById('leaderboard-body').innerHTML = '<div class="loading">Currently gathering escaping data. Stand by...</div>';
    }
}

function renderLeaderboard(players) {
    const listBody = document.getElementById('leaderboard-body');
    listBody.innerHTML = '';

    if (players.length === 0) {
        listBody.innerHTML = '<div class="loading">No players found in the trenches yet.</div>';
        return;
    }

    players.forEach((player, index) => {
        // Animation delay for cascading entrance
        const delay = Math.min(index * 0.05, 1.5);

        const row = document.createElement('div');
        row.className = `leaderboard-row rank-${player.position}`;
        row.style.animationDelay = `${delay}s`;

        if (player.current_streak >= 3) {
            row.classList.add(`streak-${Math.min(player.current_streak, 5)}`);
        }

        const avatarUrl = player.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.nickname)}&background=27272a&color=fff`;

        const winRateStatus = ((player.won / player.played) * 100).toFixed(1);
        const winRateColor = player.win_rate > 0.5 ? '#4ade80' : '#f87171'; // Green if >50%, Red if <50%

        row.innerHTML = `
            <div class="col-rank">#${player.position}</div>
            <div class="col-player">
                <img src="${avatarUrl}" alt="${player.nickname}" class="player-avatar" onerror="this.src='https://ui-avatars.com/api/?name=?&background=27272a&color=fff'">
                <span>${player.nickname}</span>
            </div>
            <div class="col-streak">
                <span class="streak-badge">${player.current_streak} Win${player.current_streak !== 1 ? 's' : ''}</span>
            </div>
            <div class="col-stats">${player.points} pts</div>
            <div class="col-wl">
                ${player.won}W / ${player.lost}L 
                (<span style="color:${winRateColor}">${winRateStatus}%</span>)
            </div>
        `;

        listBody.appendChild(row);
    });
}

function updateEscapeTracker(players) {
    const trackerContainer = document.getElementById('escape-tracker');

    // Find the max streak 
    let maxStreak = 0;
    let closestPlayer = null;

    players.forEach(p => {
        if (p.current_streak > maxStreak) {
            maxStreak = p.current_streak;
            closestPlayer = p;
        }
    });

    if (!closestPlayer) {
        trackerContainer.innerHTML = `
            <h2 class="tracker-title">Low Priority Escape Status</h2>
            <p style="color: var(--text-muted);">Awaiting the first victory...</p>
        `;
        return 0;
    }

    const winsNeeded = Math.max(0, 5 - maxStreak);

    if (winsNeeded === 0) {
        trackerContainer.innerHTML = `
            <h2 class="tracker-title" style="color: #4ade80; text-shadow: 0 0 20px rgba(74, 222, 128, 0.4);">FREEDOM ACHIEVED!</h2>
            <div class="tracker-stats">
                <div class="stat-box">
                    <span class="stat-value" style="color: #4ade80;">${closestPlayer.nickname}</span>
                    <span class="stat-label">Has liberated the TCL with 5 wins!</span>
                </div>
            </div>
        `;
        // Optionally trigger a confetty effect here
    } else {
        trackerContainer.innerHTML = `
            <h2 class="tracker-title">Closest to Freedom: ${closestPlayer.nickname}</h2>
            <div class="tracker-stats">
                <div class="stat-box">
                    <span class="stat-value">${maxStreak}</span>
                    <span class="stat-label">Current Streak</span>
                </div>
                <div class="stat-box">
                    <span class="stat-value" style="color: var(--accent-red);">${winsNeeded}</span>
                    <span class="stat-label">Wins Needed</span>
                </div>
            </div>
        `;
    }

    return maxStreak;
}

function playStreakAudio(streak) {
    if (streak < 2) return; // No sound for 0 or 1 streak

    const audioMap = {
        2: "https://www.myinstants.com/media/sounds/doublekill.mp3",
        3: "https://www.myinstants.com/media/sounds/triple_kill.mp3",
        4: "https://www.myinstants.com/media/sounds/ultrakill.mp3",
        5: "https://www.myinstants.com/media/sounds/rampage_1.mp3"
    };

    // Cap streak at 5 for sound purposes
    const capLevel = Math.min(streak, 5);
    const audioUrl = audioMap[capLevel];

    if (audioUrl) {
        // We use publicly available dota 2 sound resources 
        const audio = new Audio(audioUrl);
        audio.volume = 0.15; // Set volume very low (15%) to prevent ear damage

        // Browsers block autoplay unless user interacts, so we attempt to play and catch exceptions silently
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                console.log(`Played effect for streak ${streak}`);
            }).catch(error => {
                console.log("Audio autoplay was blocked by browser. User interaction needed first.");
                // Add a "click anywhere to play sound" listener if blocked
                if (!window.audioUnlockListenerAdded) {
                    window.audioUnlockListenerAdded = true;
                    document.body.addEventListener('click', () => {
                        if (currentMaxStreak >= 2) {
                            const latestUrl = audioMap[Math.min(currentMaxStreak, 5)];
                            const unlockAudio = new Audio(latestUrl);
                            unlockAudio.volume = 0.15;
                            unlockAudio.play().catch(e => console.error("Audio blocked after click: ", e));
                        }
                    }, { once: true });
                }
            });
        }
    }
}
