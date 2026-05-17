function loadLeaderboard() {
    if (!window.database) {
        document.getElementById('leaderboardContent').textContent = 'Firebase not configured.';
        return;
    }

    document.getElementById('leaderboardContent').textContent = 'Loading...';

    database.ref('rooms').once('value').then((snapshot) => {
        const rooms = snapshot.val() || {};
        const totalsByName = {};

        Object.keys(rooms).forEach((roomId) => {
            const room = rooms[roomId] || {};
            const players = room.players || {};
            Object.keys(players).forEach((pid) => {
                const p = players[pid] || {};
                const name = p.name || ('player_' + pid);
                // prefer `score` if present, otherwise sum `scores` object if available
                let score = 0;
                if (typeof p.score === 'number') {
                    score = p.score;
                } else if (p.scores) {
                    score = Object.values(p.scores).reduce((s, v) => s + (Number(v) || 0), 0);
                }

                if (!totalsByName[name]) totalsByName[name] = 0;
                totalsByName[name] += score;
            });
        });

        const rows = Object.keys(totalsByName).map((name) => ({ name, score: totalsByName[name] }));
        rows.sort((a, b) => b.score - a.score);

        if (rows.length === 0) {
            document.getElementById('leaderboardContent').innerHTML = '<div>No players found yet.</div>';
            return;
        }

        const html = ['<div class="leaderboard-list">', '<div class="leaderboard-row"><div>Name</div><div>Correct Answers</div></div>'];
        rows.forEach((r) => {
            html.push(`<div class="leaderboard-row"><div>${r.name}</div><div>${r.score}</div></div>`);
        });
        html.push('</div>');

        document.getElementById('leaderboardContent').innerHTML = html.join('\n');
    }).catch((err) => {
        console.error('Error loading leaderboard:', err);
        document.getElementById('leaderboardContent').textContent = 'Error loading leaderboard.';
    });
}

// auto-load
loadLeaderboard();
// refresh every 20 seconds
setInterval(loadLeaderboard, 20000);
