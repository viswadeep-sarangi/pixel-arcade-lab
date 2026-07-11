async function loadLeaderboard() {
    const client = window.supabaseClient;
    if (!client) {
        document.getElementById('leaderboardContent').textContent = 'Supabase not configured.';
        return;
    }

    document.getElementById('leaderboardContent').textContent = 'Loading...';

    const quizbuzzClient = client.schema('quizbuzz');
    const { data, error } = await quizbuzzClient
        .from('quiz_leaderboard_from_answers')
        .select('name,total_score,rooms_played,score_per_room');
    if (error) {
        console.error('Error loading leaderboard:', error);
        document.getElementById('leaderboardContent').textContent = `Error loading leaderboard: ${error.message}`;
        return;
    }

    const rows = (data || []).map((entry) => ({
        name: entry.name || 'Unknown',
        totalScore: Number(entry.total_score || 0),
        roomsPlayed: Number(entry.rooms_played || 0),
        scorePerRoom: Number(entry.score_per_room || 0)
    }));

    if (rows.length === 0) {
        document.getElementById('leaderboardContent').innerHTML = '<div>No leaderboard data found yet.</div>';
        return;
    }

    const html = [
        '<div class="leaderboard-list">',
        '<table style="width:100%; border-collapse:collapse;">',
        '<thead><tr><th style="text-align:left; padding:0.5rem 0; border-bottom:2px solid #f0f0f0;">Name</th><th style="text-align:left; padding:0.5rem 0; border-bottom:2px solid #f0f0f0;">Total Score</th><th style="text-align:left; padding:0.5rem 0; border-bottom:2px solid #f0f0f0;">Rooms Played</th><th style="text-align:left; padding:0.5rem 0; border-bottom:2px solid #f0f0f0;">Score Per Room</th></tr></thead>',
        '<tbody>'
    ];

    rows.forEach((row) => {
        html.push(`<tr><td style="padding:0.75rem 0; border-bottom:1px solid #f0f0f0;">${escapeHtml(row.name)}</td><td style="padding:0.75rem 0; border-bottom:1px solid #f0f0f0;">${row.totalScore}</td><td style="padding:0.75rem 0; border-bottom:1px solid #f0f0f0;">${row.roomsPlayed}</td><td style="padding:0.75rem 0; border-bottom:1px solid #f0f0f0;">${row.scorePerRoom.toFixed(2)}</td></tr>`);
    });

    html.push('</tbody></table></div>');
    document.getElementById('leaderboardContent').innerHTML = html.join('\n');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

loadLeaderboard();
setInterval(loadLeaderboard, 20000);
