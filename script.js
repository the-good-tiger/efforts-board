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

        // Update the UI with the latest data
        updateCompetitionUI(data, scores, timeSpent, bounty);
        
        // Create the chart
        createChart(labels, scores, timeSpent, bounty);
        
        // Generate battle report
        generateBattleReport(data, scores, timeSpent, bounty);
        
        // Update trophies
        updateTrophies(data);

    } catch (error) {
        console.error("Error loading or parsing the data:", error);
        document.getElementById('statusPill').textContent = "Data load failed";
        document.body.innerHTML = `<h1>Error loading data.</h1><p>Check if the data.json file exists and is valid JSON.</p><pre>${error}</pre>`;
    }
}

// Update the competition UI with current metrics
function updateCompetitionUI(data, scores, timeSpent, bounty) {
    const lastEntry = data[data.length - 1];
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD

    // Check if the last entry in the data is for today
    const todaysEntry = lastEntry && lastEntry.date === today ? lastEntry : null;

    // Calculate 7-day moving averages for the most recent value
    const recentScoreAvg = calculateMovingAverage(scores).filter(v => v !== null).pop() || 0;
    const recentTimeAvg = calculateMovingAverage(timeSpent).filter(v => v !== null).pop() || 0;
    const recentBountyAvg = calculateMovingAverage(bounty).filter(v => v !== null).pop() || 0;

    // Calculate future targets (20% improvement)
    const futureScoreTarget = Math.round(recentScoreAvg * 1.2);
    const futureTimeTarget = Math.round(recentTimeAvg * 1.2);
    const futureBountyTarget = Math.round(recentBountyAvg * 1.2);

    // Update past self metrics
    document.getElementById('pastScore').textContent = Math.round(recentScoreAvg);
    document.getElementById('pastScoreValue').textContent = Math.round(recentScoreAvg);
    document.getElementById('pastTimeValue').textContent = Math.round(recentTimeAvg) + 'm';
    document.getElementById('pastBountyValue').textContent = '$' + Math.round(recentBountyAvg);
    
    // Update progress bars for past self
    setTimeout(() => {
        document.querySelector('.past-score').style.width = `${Math.min(100, Math.round(recentScoreAvg) / 100 * 100)}%`;
        document.querySelector('.past-time').style.width = `${Math.min(100, Math.round(recentTimeAvg) / 300 * 100)}%`;
        document.querySelector('.past-bounty').style.width = `${Math.min(100, Math.round(recentBountyAvg) / 1000 * 100)}%`;
    }, 100);

    // Update present self metrics
    if (todaysEntry) {
        document.getElementById('presentScore').textContent = todaysEntry.score;
        document.getElementById('presentScoreValue').textContent = todaysEntry.score;
        document.getElementById('presentTimeValue').textContent = todaysEntry.time_spent + 'm';
        document.getElementById('presentBountyValue').textContent = '$' + todaysEntry.bounty;
        
        // Update progress bars for present self
        setTimeout(() => {
            document.querySelector('.present-score').style.width = `${Math.min(100, todaysEntry.score / 100 * 100)}%`;
            document.querySelector('.present-time').style.width = `${Math.min(100, todaysEntry.time_spent / 300 * 100)}%`;
            document.querySelector('.present-bounty').style.width = `${Math.min(100, todaysEntry.bounty / 1000 * 100)}%`;
        }, 100);
    } else {
        document.getElementById('presentScore').textContent = '--';
        document.getElementById('presentScoreValue').textContent = '--';
        document.getElementById('presentTimeValue').textContent = '--';
        document.getElementById('presentBountyValue').textContent = '--';
    }

    // Update future self metrics
    document.getElementById('futureScore').textContent = futureScoreTarget;
    document.getElementById('futureTime').textContent = futureTimeTarget + 'm';
    document.getElementById('futureBounty').textContent = '$' + futureBountyTarget;

    // Update status pill
    if (todaysEntry) {
        const wins = calculateWins(todaysEntry, recentScoreAvg, recentTimeAvg, recentBountyAvg);
        document.getElementById('statusPill').textContent = 
            `Today's Battle: ${wins} Wins, ${3 - wins} ${wins === 3 ? 'Perfect Victory! 🏆' : 'Losses'}`;
            
        if (wins === 3) {
            document.getElementById('statusPill').classList.add('win');
        }
    } else {
        document.getElementById('statusPill').textContent = 'No battle today - submit your log!';
    }
}

// Calculate wins against past self
function calculateWins(todaysEntry, scoreAvg, timeAvg, bountyAvg) {
    let wins = 0;
    if (todaysEntry.score >= scoreAvg) wins++;
    if (todaysEntry.time_spent >= timeAvg) wins++;
    if (todaysEntry.bounty >= bountyAvg) wins++;
    return wins;
}

// Generate battle report
function generateBattleReport(data, scores, timeSpent, bounty) {
    const lastEntry = data[data.length - 1];
    const today = new Date().toISOString().split('T')[0];
    const todaysEntry = lastEntry && lastEntry.date === today ? lastEntry : null;
    
    if (!todaysEntry) {
        document.getElementById('battleReport').innerHTML = `
            <div class="report-item">
                <div class="report-icon">📝</div>
                <div class="report-text">No battle today. Submit your daily log to begin!</div>
            </div>
        `;
        return;
    }

    // Calculate 7-day moving averages
    const recentScoreAvg = calculateMovingAverage(scores).filter(v => v !== null).pop() || 0;
    const recentTimeAvg = calculateMovingAverage(timeSpent).filter(v => v !== null).pop() || 0;
    const recentBountyAvg = calculateMovingAverage(bounty).filter(v => v !== null).pop() || 0;

    const reportItems = [];
    
    // Score comparison
    const scoreDiff = todaysEntry.score - recentScoreAvg;
    const scoreIcon = scoreDiff >= 0 ? '✅' : '❌';
    const scoreStatus = scoreDiff >= 0 ? 'win' : 'loss';
    reportItems.push(`
        <div class="report-item">
            <div class="report-icon">${scoreIcon}</div>
            <div class="report-text">Score: <span class="report-value ${scoreStatus}">${todaysEntry.score}</span> vs Past Self's ${Math.round(recentScoreAvg)}</div>
            <div class="report-value ${scoreStatus}">${scoreDiff >= 0 ? '+' : ''}${Math.round(scoreDiff)}</div>
        </div>
    `);
    
    // Time comparison
    const timeDiff = todaysEntry.time_spent - recentTimeAvg;
    const timeIcon = timeDiff >= 0 ? '✅' : '❌';
    const timeStatus = timeDiff >= 0 ? 'win' : 'loss';
    reportItems.push(`
        <div class="report-item">
            <div class="report-icon">${timeIcon}</div>
            <div class="report-text">Time: <span class="report-value ${timeStatus}">${todaysEntry.time_spent}m</span> vs Past Self's ${Math.round(recentTimeAvg)}m</div>
            <div class="report-value ${timeStatus}">${timeDiff >= 0 ? '+' : ''}${Math.round(timeDiff)}m</div>
        </div>
    `);
    
    // Bounty comparison
    const bountyDiff = todaysEntry.bounty - recentBountyAvg;
    const bountyIcon = bountyDiff >= 0 ? '✅' : '❌';
    const bountyStatus = bountyDiff >= 0 ? 'win' : 'loss';
    reportItems.push(`
        <div class="report-item">
            <div class="report-icon">${bountyIcon}</div>
            <div class="report-text">Bounty: <span class="report-value ${bountyStatus}">$${todaysEntry.bounty}</span> vs Past Self's $${Math.round(recentBountyAvg)}</div>
            <div class="report-value ${bountyStatus}">${bountyDiff >= 0 ? '+' : ''}$${Math.round(bountyDiff)}</div>
        </div>
    `);
    
    document.getElementById('battleReport').innerHTML = reportItems.join('');
}

// Update trophies
function updateTrophies(data) {
    const trophies = [
        {
            id: 'consistency',
            name: 'Consistency Master',
            icon: '📅',
            description: 'Maintain performance for 7 straight days',
            check: (data) => {
                if (data.length < 7) return false;
                const last7 = data.slice(-7);
                const scores = last7.map(d => d.score);
                return Math.max(...scores) - Math.min(...scores) <= 20;
            }
        },
        {
            id: 'improvement',
            name: 'Continuous Improver',
            icon: '📈',
            description: 'Improve score for 3 consecutive days',
            check: (data) => {
                if (data.length < 4) return false;
                const last3 = data.slice(-4);
                for (let i = 1; i < last3.length; i++) {
                    if (last3[i].score <= last3[i-1].score) return false;
                }
                return true;
            }
        },
        {
            id: 'bounty',
            name: 'Bounty Hunter',
            icon: '💰',
            description: 'Earn $1000+ in a single day',
            check: (data) => data.some(entry => entry.bounty >= 1000)
        },
        {
            id: 'marathon',
            name: 'Time Marathon',
            icon: '⏱️',
            description: 'Spend 300+ minutes in a day',
            check: (data) => data.some(entry => entry.time_spent >= 300)
        }
    ];
    
    const trophiesHTML = trophies.map(trophy => {
        const achieved = trophy.check(data);
        return `
            <div class="trophy-card ${achieved ? '' : 'locked'}">
                <div class="trophy-icon">${trophy.icon}</div>
                <div class="trophy-name">${trophy.name}</div>
                <div class="trophy-desc">${trophy.description}</div>
                <div class="trophy-status">${achieved ? 'Unlocked 🏆' : 'Locked 🔒'}</div>
            </div>
        `;
    });
    
    document.getElementById('trophiesContainer').innerHTML = trophiesHTML.join('');
}

// Calculate moving averages for charts
function calculateMovingAverage(dataArray, windowSize = 7) {
    return dataArray.map((_, index, arr) => {
        if (index < windowSize - 1) return null;
        const windowStart = index - windowSize + 1;
        const windowEnd = index + 1;
        const window = arr.slice(windowStart, windowEnd);
        const sum = window.reduce((a, b) => a + b, 0);
        return sum / windowSize;
    });
}

// Create the chart
function createChart(labels, scores, timeSpent, bounty) {
    // Calculate moving averages
    const pastSelfScore = calculateMovingAverage(scores);
    const pastSelfTime = calculateMovingAverage(timeSpent);
    const pastSelfBounty = calculateMovingAverage(bounty);

    // Calculate future targets (20% more than past self)
    const futureSelfScore = pastSelfScore.map(value => value ? value * 1.2 : null);
    const futureSelfTime = pastSelfTime.map(value => value ? value * 1.2 : null);
    const futureSelfBounty = pastSelfBounty.map(value => value ? value * 1.2 : null);

    // Get canvas context
    const ctx = document.getElementById('battleChart').getContext('2d');
    
    // Create initial chart with score data
    window.battleChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { 
                    label: 'Present Self', 
                    data: scores, 
                    borderColor: 'var(--present-color)', 
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    tension: 0.1, 
                    pointBackgroundColor: 'var(--present-color)',
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 7
                },
                { 
                    label: 'Past Self (7d Avg)', 
                    data: pastSelfScore, 
                    borderColor: 'var(--past-color)', 
                    borderDash: [5, 5], 
                    pointBackgroundColor: 'var(--past-color)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                { 
                    label: 'Future Self (Target)', 
                    data: futureSelfScore, 
                    borderColor: 'var(--future-color)', 
                    borderDash: [5, 5], 
                    pointBackgroundColor: 'var(--future-color)',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    position: 'top',
                    labels: {
                        color: '#e6e6e6',
                        font: {
                            family: "'Roboto', sans-serif",
                            size: 14
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Score Performance',
                    color: '#e6e6e6',
                    font: {
                        family: "'Montserrat', sans-serif",
                        size: 16,
                        weight: '600'
                    }
                }
            },
            scales: { 
                y: { 
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: {
                        color: '#b3b3b3'
                    }
                },
                x: { 
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: {
                        color: '#b3b3b3'
                    }
                }
            }
        }
    });
    
    // Add event listeners to toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get metric type
            const metric = this.getAttribute('data-metric');
            
            // Update chart data based on metric
            let newData, newTitle;
            
            switch(metric) {
                case 'score':
                    newData = [scores, pastSelfScore, futureSelfScore];
                    newTitle = 'Score Performance';
                    break;
                case 'time':
                    newData = [timeSpent, pastSelfTime, futureSelfTime];
                    newTitle = 'Time Investment (minutes)';
                    break;
                case 'bounty':
                    newData = [bounty, pastSelfBounty, futureSelfBounty];
                    newTitle = 'Bounty Earnings (USD)';
                    break;
            }
            
            // Update chart
            window.battleChart.data.datasets[0].data = newData[0];
            window.battleChart.data.datasets[1].data = newData[1];
            window.battleChart.data.datasets[2].data = newData[2];
            window.battleChart.options.plugins.title.text = newTitle;
            window.battleChart.update();
        });
    });
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', loadData);