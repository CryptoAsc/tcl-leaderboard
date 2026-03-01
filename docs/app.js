// public/app.js

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
        updateEscapeTracker(data);

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
        return;
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
}
