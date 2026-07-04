async function loadLeaderboard() {
    const client = window.supabaseClient;
    if (!client) {
        document.getElementById('leaderboardContent').textContent = 'Supabase not configured.';
        return;
    }

    document.getElementById('leaderboardContent').textContent = 'Loading...';

    const { data, error } = await client.from('quiz_players').select('*');
    if (error) {
        console.error('Error loading leaderboard:', error);
        document.getElementById('leaderboardContent').textContent = `Error loading leaderboard: ${error.message}`;
        return;
    }

    const rows = (data || []).map((player) => ({
        name: player.name || 'Unknown',
        score: Number(player.score || 0),
        completedQuestions: Number(player.completed_questions || 0)
    }));

    rows.sort((a, b) => b.score - a.score || b.completedQuestions - a.completedQuestions || a.name.localeCompare(b.name));

    if (rows.length === 0) {
        document.getElementById('leaderboardContent').innerHTML = '<div>No players found yet.</div>';
        return;
    }

    const html = ['<div class="leaderboard-list">', '<div class="leaderboard-row"><div>Name</div><div>Score</div><div>Completed</div></div>'];
    rows.forEach((r) => {
        html.push(`<div class="leaderboard-row"><div>${escapeHtml(r.name)}</div><div>${r.score}</div><div>${r.completedQuestions}</div></div>`);
    });
    html.push('</div>');

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
