// script.js

// Main function that runs when the page loads
async function loadData() {
    try {
        // Fetch the data.json file. Use a cache-buster to get the latest version.
        const response = await fetch('./data.json?' + new Date().getTime());
        const rawData = await response.json();

        // Sort data by date, oldest first
        const data = rawData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Extract arrays for labels and datasets
        const labels = data.map(entry => entry.date);
        const scores = data.map(entry => entry.score || 0);
        const timeSpent = data.map(entry => entry.time_spent || 0);
        const bounty = data.map(entry => entry.bounty || 0);

        // Calculate metrics for rankings
        updateRankings(data, scores, timeSpent, bounty);

        // Create the charts
        createCharts(labels, scores, timeSpent, bounty);

    } catch (error) {
        console.error("Error loading or parsing the data:", error);
        document.body.innerHTML = `<h1>Error loading data.</h1><p>Check if the data.json file exists and is valid JSON.</p><pre>${error}</pre>`;
    }
}

// Update the ranking boxes with current metrics
function updateRankings(data, scores, timeSpent, bounty) {
    const lastEntry = data[data.length - 1];
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD

    // Check if the last entry in the data is for today
    const todaysEntry = lastEntry.date === today ? lastEntry : null;

    // Calculate 7-day moving averages for the most recent value
    const recentScoreAvg = calculateMovingAverage(scores).filter(v => v !== null).pop() || 0;
    const recentTimeAvg = calculateMovingAverage(timeSpent).filter(v => v !== null).pop() || 0;
    const recentBountyAvg = calculateMovingAverage(bounty).filter(v => v !== null).pop() || 0;

    // Calculate future targets (20% improvement)
    const futureScoreTarget = Math.round(recentScoreAvg * 1.2);
    const futureTimeTarget = Math.round(recentTimeAvg * 1.2);
    const futureBountyTarget = Math.round(recentBountyAvg * 1.2);

    // Determine rankings for each metric
    const scoreRankings = getRankings(todaysEntry ? todaysEntry.score : 0, Math.round(recentScoreAvg), futureScoreTarget);
    const timeRankings = getRankings(todaysEntry ? todaysEntry.time_spent : 0, Math.round(recentTimeAvg), futureTimeTarget);
    const bountyRankings = getRankings(todaysEntry ? todaysEntry.bounty : 0, Math.round(recentBountyAvg), futureBountyTarget);

    document.getElementById('rankings-container').innerHTML = `
        <div class="ranking-box ${scoreRankings.present.rank}">
            <div class="ranking-title">Present Self</div>
            <div class="ranking-value">${todaysEntry ? todaysEntry.score : "N/A"}</div>
            <div class="ranking-detail">${scoreRankings.present.place} Place in Score</div>
            <div class="ranking-detail">${timeRankings.present.place} Place in Time</div>
            <div class="ranking-detail">${bountyRankings.present.place} Place in Bounty</div>
        </div>
        <div class="ranking-box ${scoreRankings.past.rank}">
            <div class="ranking-title">Past Self (7d Avg)</div>
            <div class="ranking-value">${Math.round(recentScoreAvg) || "N/A"}</div>
            <div class="ranking-detail">${scoreRankings.past.place} Place in Score</div>
            <div class="ranking-detail">${timeRankings.past.place} Place in Time</div>
            <div class="ranking-detail">${bountyRankings.past.place} Place in Bounty</div>
        </div>
        <div class="ranking-box ${scoreRankings.future.rank}">
            <div class="ranking-title">Future Self (Target)</div>
            <div class="ranking-value">${futureScoreTarget || "N/A"}</div>
            <div class="ranking-detail">${scoreRankings.future.place} Place in Score</div>
            <div class="ranking-detail">${timeRankings.future.place} Place in Time</div>
            <div class="ranking-detail">${bountyRankings.future.place} Place in Bounty</div>
        </div>
    `;
}

// Determine rankings for a metric
function getRankings(present, past, future) {
    // Create array of values and sort descending
    const values = [present, past, future];
    const sorted = [...values].sort((a, b) => b - a);
    
    return {
        present: {
            value: present,
            rank: getRankClass(sorted.indexOf(present) + 1),
            place: getPlaceText(sorted.indexOf(present) + 1)
        },
        past: {
            value: past,
            rank: getRankClass(sorted.indexOf(past) + 1),
            place: getPlaceText(sorted.indexOf(past) + 1)
        },
        future: {
            value: future,
            rank: getRankClass(sorted.indexOf(future) + 1),
            place: getPlaceText(sorted.indexOf(future) + 1)
        }
    };
}

// Get CSS class for ranking
function getRankClass(rank) {
    switch(rank) {
        case 1: return 'first';
        case 2: return 'second';
        case 3: return 'third';
        default: return '';
    }
}

// Get place text
function getPlaceText(rank) {
    switch(rank) {
        case 1: return '1st';
        case 2: return '2nd';
        case 3: return '3rd';
        default: return `${rank}th`;
    }
}

// Calculate moving averages for charts
function calculateMovingAverage(dataArray, windowSize = 7) {
    return dataArray.map((_, index, arr) => {
        if (index < windowSize - 1) return null; // Not enough data for a full window
        const windowStart = index - windowSize + 1;
        const windowEnd = index + 1;
        const window = arr.slice(windowStart, windowEnd);
        const sum = window.reduce((a, b) => a + b, 0);
        return sum / windowSize;
    });
}

// Create all charts
function createCharts(labels, scores, timeSpent, bounty) {
    // Calculate moving averages
    const pastSelfScore = calculateMovingAverage(scores);
    const pastSelfTime = calculateMovingAverage(timeSpent);
    const pastSelfBounty = calculateMovingAverage(bounty);

    // Calculate future targets (20% more than past self)
    const futureSelfScore = pastSelfScore.map(value => value ? value * 1.2 : null);
    const futureSelfTime = pastSelfTime.map(value => value ? value * 1.2 : null);
    const futureSelfBounty = pastSelfBounty.map(value => value ? value * 1.2 : null);

    // Common chart configuration
    const chartConfig = {
        type: 'line',
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    position: 'top',
                    labels: {
                        color: '#c9d1d9'
                    }
                } 
            },
            scales: { 
                y: { 
                    beginAtZero: true,
                    grid: { color: 'rgba(240, 246, 252, 0.1)' },
                    ticks: {
                        color: '#c9d1d9'
                    }
                },
                x: { 
                    grid: { color: 'rgba(240, 246, 252, 0.1)' },
                    ticks: {
                        color: '#c9d1d9'
                    }
                }
            }
        }
    };

    // Create the charts
    new Chart(document.getElementById('scoreChart'), {
        ...chartConfig,
        data: {
            labels: labels,
            datasets: [
                { 
                    label: 'Present Self', 
                    data: scores, 
                    borderColor: 'var(--chart-present)', 
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.1, 
                    pointBackgroundColor: 'var(--chart-present)' 
                },
                { 
                    label: 'Past Self (7d Avg)', 
                    data: pastSelfScore, 
                    borderColor: 'var(--chart-past)', 
                    borderDash: [5, 5], 
                    pointBackgroundColor: 'var(--chart-past)',
                    backgroundColor: 'rgba(255, 159, 64, 0.1)',
                },
                { 
                    label: 'Future Self (Target)', 
                    data: futureSelfScore, 
                    borderColor: 'var(--chart-future)', 
                    borderDash: [5, 5], 
                    pointBackgroundColor: 'var(--chart-future)',
                    backgroundColor: 'rgba(153, 102, 255, 0.1)',
                }
            ]
        }
    });

    new Chart(document.getElementById('timeChart'), {
        ...chartConfig,
        data: {
            labels: labels,
            datasets: [
                { 
                    label: 'Present Self', 
                    data: timeSpent, 
                    borderColor: 'var(--chart-present)', 
                    tension: 0.1, 
                    pointBackgroundColor: 'var(--chart-present)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                },
                { 
                    label: 'Past Self (7d Avg)', 
                    data: pastSelfTime, 
                    borderColor: 'var(--chart-past)', 
                    borderDash: [5, 5], 
                    pointBackgroundColor: 'var(--chart-past)',
                    backgroundColor: 'rgba(255, 159, 64, 0.1)',
                },
                { 
                    label: 'Future Self (Target)', 
                    data: futureSelfTime, 
                    borderColor: 'var(--chart-future)', 
                    borderDash: [5, 5], 
                    pointBackgroundColor: 'var(--chart-future)',
                    backgroundColor: 'rgba(153, 102, 255, 0.1)',
                }
            ]
        }
    });

    new Chart(document.getElementById('bountyChart'), {
        ...chartConfig,
        data: {
            labels: labels,
            datasets: [
                { 
                    label: 'Present Self', 
                    data: bounty, 
                    borderColor: 'var(--chart-present)', 
                    tension: 0.1, 
                    pointBackgroundColor: 'var(--chart-present)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                },
                { 
                    label: 'Past Self (7d Avg)', 
                    data: pastSelfBounty, 
                    borderColor: 'var(--chart-past)', 
                    borderDash: [5, 5], 
                    pointBackgroundColor: 'var(--chart-past)',
                    backgroundColor: 'rgba(255, 159, 64, 0.1)',
                },
                { 
                    label: 'Future Self (Target)', 
                    data: futureSelfBounty, 
                    borderColor: 'var(--chart-future)', 
                    borderDash: [5, 5], 
                    pointBackgroundColor: 'var(--chart-future)',
                    backgroundColor: 'rgba(153, 102, 255, 0.1)',
                }
            ]
        }
    });
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', loadData);