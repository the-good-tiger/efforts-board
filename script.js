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

        // Calculate metrics for summary
        updateSummary(data, scores, timeSpent, bounty);

        // Create the charts
        createCharts(labels, scores, timeSpent, bounty);

    } catch (error) {
        console.error("Error loading or parsing the data:", error);
        document.body.innerHTML = `<h1>Error loading data.</h1><p>Check if the data.json file exists and is valid JSON.</p><pre>${error}</pre>`;
    }
}

// Update the summary boxes with current metrics
function updateSummary(data, scores, timeSpent, bounty) {
    const lastEntry = data[data.length - 1];
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD

    // Check if the last entry in the data is for today
    const todaysEntry = lastEntry.date === today ? lastEntry : null;

    // Calculate 7-day moving averages for the most recent value
    const recentScoreAvg = calculateMovingAverage(scores).filter(v => v !== null).pop() || 0;
    const recentTimeAvg = calculateMovingAverage(timeSpent).filter(v => v !== null).pop() || 0;
    const recentBountyAvg = calculateMovingAverage(bounty).filter(v => v !== null).pop() || 0;

    document.getElementById('summary-container').innerHTML = `
        <div class="metric-box">
            <div class="metric-label">Today's Score</div>
            <div class="metric-value">${todaysEntry ? todaysEntry.score : "N/A"}</div>
        </div>
        <div class="metric-box">
            <div class="metric-label">7-Day Avg Score</div>
            <div class="metric-value">${Math.round(recentScoreAvg) || "N/A"}</div>
        </div>
        <div class="metric-box">
            <div class="metric-label">Target Score</div>
            <div class="metric-value">${Math.round(recentScoreAvg * 1.2) || "N/A"}</div>
        </div>
        <div class="metric-box">
            <div class="metric-label">Total Bounty</div>
            <div class="metric-value">$${bounty.reduce((a, b) => a + b, 0)}</div>
        </div>
    `;
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

    // Calculate ideal values (20% more than past self)
    const idealSelfScore = pastSelfScore.map(value => value ? value * 1.2 : null);
    const idealSelfTime = pastSelfTime.map(value => value ? value * 1.2 : null);
    const idealSelfBounty = pastSelfBounty.map(value => value ? value * 1.2 : null);

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
                    label: 'Ideal Self (Target)', 
                    data: idealSelfScore, 
                    borderColor: 'var(--chart-ideal)', 
                    borderDash: [5, 5], 
                    pointBackgroundColor: 'var(--chart-ideal)',
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
                    label: 'Time Spent', 
                    data: timeSpent, 
                    borderColor: 'var(--chart-time)', 
                    tension: 0.1, 
                    pointBackgroundColor: 'var(--chart-time)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
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
                    label: 'Ideal Self (Target)', 
                    data: idealSelfTime, 
                    borderColor: 'var(--chart-ideal)', 
                    borderDash: [5, 5], 
                    pointBackgroundColor: 'var(--chart-ideal)',
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
                    label: 'Bounty Earned', 
                    data: bounty, 
                    borderColor: 'var(--chart-bounty)', 
                    tension: 0.1, 
                    pointBackgroundColor: 'var(--chart-bounty)',
                    backgroundColor: 'rgba(50, 205, 50, 0.1)',
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
                    label: 'Ideal Self (Target)', 
                    data: idealSelfBounty, 
                    borderColor: 'var(--chart-ideal)', 
                    borderDash: [5, 5], 
                    pointBackgroundColor: 'var(--chart-ideal)',
                    backgroundColor: 'rgba(153, 102, 255, 0.1)',
                }
            ]
        }
    });
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', loadData);
